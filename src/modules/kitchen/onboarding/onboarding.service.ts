import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  KitchenAccount,
  KitchenAccountStatus,
  KitchenOnboardingStep,
  KitchenStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BankDetailsDto,
  KitchenDetailsDto,
  KitchenLocationDto,
  OwnerDetailsDto,
  UploadDocumentDto,
} from './dto/onboarding.dto';
import { ONBOARDING_STEPS, REQUIRED_DOCUMENT_TYPES, STEP_ORDER } from './onboarding.constants';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS — one call the partner app polls to know what to render
  // ──────────────────────────────────────────────────────────────────────────

  async getStatus(accountId: string) {
    const account = await this.prisma.kitchenAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        kitchen: { select: { id: true, name: true, latitude: true, _count: { select: { meals: true } } } },
        documents: true,
        bankAccount: true,
      },
    });

    const reachedIndex = STEP_ORDER.indexOf(account.onboardingStep);

    const pending: string[] = [];
    if (!account.ownerName) pending.push('Add the owner’s name');
    if (!account.kitchen) pending.push('Add your kitchen’s name and photos');
    if (account.kitchen && account.kitchen.latitude === null) pending.push('Set your kitchen location');
    const hasFssai = account.documents.some((d) => REQUIRED_DOCUMENT_TYPES.includes(d.type as any));
    if (!hasFssai) pending.push('Upload your FSSAI licence');
    if (!account.bankAccount) pending.push('Add your bank details for payouts');
    if ((account.kitchen?._count.meals ?? 0) === 0) pending.push('Add at least one dish');

    return {
      status: account.status,
      currentStep: account.onboardingStep,
      // Progress excludes the two terminal steps so a partner mid-funnel never
      // sees a misleading 90%.
      progressPercent: Math.round((reachedIndex / (STEP_ORDER.length - 1)) * 100),
      steps: ONBOARDING_STEPS.map((definition, index) => ({
        ...definition,
        isComplete: index < reachedIndex,
        isCurrent: index === reachedIndex,
      })),
      canSubmit: pending.length === 0 && account.status === KitchenAccountStatus.ONBOARDING,
      pending,
      rejectionReason: account.rejectionReason,
      documents: account.documents.map((d) => ({
        id: d.id,
        type: d.type,
        number: d.number,
        fileUrl: d.fileUrl,
        status: d.status,
        remarks: d.remarks,
      })),
      bankAccount: account.bankAccount
        ? {
            accountHolderName: account.bankAccount.accountHolderName,
            accountNumberMasked: `••••••${account.bankAccount.accountNumberLast4}`,
            ifsc: account.bankAccount.ifsc,
            bankName: account.bankAccount.bankName,
            upiId: account.bankAccount.upiId,
            isVerified: account.bankAccount.isVerified,
          }
        : null,
      kitchenId: account.kitchen?.id ?? null,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEPS
  // ──────────────────────────────────────────────────────────────────────────

  async saveOwnerDetails(accountId: string, dto: OwnerDetailsDto) {
    if (dto.email) {
      const clash = await this.prisma.kitchenAccount.findFirst({
        where: { email: dto.email, id: { not: accountId } },
        select: { id: true },
      });
      if (clash) throw new ConflictException('That email is already used by another partner');
    }

    await this.prisma.kitchenAccount.update({
      where: { id: accountId },
      data: {
        ownerName: dto.ownerName,
        email: dto.email,
        onboardingStep: this.advance(accountId, KitchenOnboardingStep.OWNER_DETAILS),
      },
    });

    return this.getStatus(accountId);
  }

  async saveKitchenDetails(accountId: string, dto: KitchenDetailsDto) {
    const account = await this.prisma.kitchenAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { kitchen: { select: { id: true } } },
    });

    const cuisineIds = dto.cuisineSlugs?.length
      ? (
          await this.prisma.cuisine.findMany({
            where: { slug: { in: dto.cuisineSlugs } },
            select: { id: true },
          })
        ).map((c) => c.id)
      : [];

    const data = {
      name: dto.name,
      tagline: dto.tagline,
      description: dto.description,
      logoUrl: dto.logoUrl,
      coverImage: dto.coverImage,
      contactPhone: dto.contactPhone ?? account.phone,
      ...(dto.prepTimeMins !== undefined && { prepTimeMins: dto.prepTimeMins }),
      ...(dto.opensAt && { opensAt: dto.opensAt }),
      ...(dto.closesAt && { closesAt: dto.closesAt }),
    };

    if (account.kitchen) {
      await this.prisma.kitchen.update({ where: { id: account.kitchen.id }, data });
    } else {
      await this.prisma.kitchen.create({
        data: {
          ...data,
          slug: await this.buildUniqueSlug(dto.name),
          accountId,
          // A kitchen is invisible to customers until the team approves it.
          status: KitchenStatus.PENDING,
          isVerified: false,
        },
      });
    }

    // Cuisines are stored per meal, so this is only a hint for the menu step.
    if (cuisineIds.length) {
      this.logger.debug(`Partner ${accountId} cooks ${cuisineIds.length} cuisine(s)`);
    }

    await this.setStep(accountId, KitchenOnboardingStep.KITCHEN_DETAILS);
    return this.getStatus(accountId);
  }

  async saveLocation(accountId: string, dto: KitchenLocationDto) {
    const kitchen = await this.requireKitchen(accountId, 'Save your kitchen details first');

    await this.prisma.kitchen.update({
      where: { id: kitchen.id },
      data: {
        addressLine: dto.addressLine,
        locality: dto.locality,
        city: dto.city ?? 'Jaipur',
        state: dto.state ?? 'Rajasthan',
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.setStep(accountId, KitchenOnboardingStep.LOCATION);
    return this.getStatus(accountId);
  }

  async uploadDocument(accountId: string, dto: UploadDocumentDto) {
    await this.prisma.kitchenDocument.upsert({
      where: { accountId_type: { accountId, type: dto.type } },
      // Re-uploading after a rejection resets the review state.
      update: { number: dto.number, fileUrl: dto.fileUrl, status: 'PENDING', remarks: null },
      create: { accountId, type: dto.type, number: dto.number, fileUrl: dto.fileUrl },
    });

    // Mirror the FSSAI number onto the kitchen — it is a public trust signal.
    if (dto.type === 'FSSAI' && dto.number) {
      const kitchen = await this.prisma.kitchen.findUnique({
        where: { accountId },
        select: { id: true },
      });
      if (kitchen) {
        await this.prisma.kitchen.update({
          where: { id: kitchen.id },
          data: { fssaiLicense: dto.number },
        });
      }
    }

    await this.setStep(accountId, KitchenOnboardingStep.DOCUMENTS);
    return this.getStatus(accountId);
  }

  async saveBankDetails(accountId: string, dto: BankDetailsDto) {
    const last4 = dto.accountNumber.slice(-4);

    await this.prisma.kitchenBankAccount.upsert({
      where: { accountId },
      update: {
        accountHolderName: dto.accountHolderName,
        accountNumberLast4: last4,
        ifsc: dto.ifsc.toUpperCase(),
        bankName: dto.bankName,
        upiId: dto.upiId,
        isVerified: false,
      },
      create: {
        accountId,
        accountHolderName: dto.accountHolderName,
        // Only the tail is persisted; the full number never lands in our DB.
        accountNumberLast4: last4,
        ifsc: dto.ifsc.toUpperCase(),
        bankName: dto.bankName,
        upiId: dto.upiId,
      },
    });

    await this.setStep(accountId, KitchenOnboardingStep.BANK_DETAILS);
    return this.getStatus(accountId);
  }

  /** Called by the menu module once the partner adds their first dish. */
  async markMenuStarted(accountId: string) {
    await this.setStep(accountId, KitchenOnboardingStep.MENU_SETUP);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT / REVIEW
  // ──────────────────────────────────────────────────────────────────────────

  async submit(accountId: string) {
    const status = await this.getStatus(accountId);
    if (!status.canSubmit) {
      throw new BadRequestException(
        `Your application is not complete yet: ${status.pending.join('; ')}`,
      );
    }

    await this.prisma.kitchenAccount.update({
      where: { id: accountId },
      data: {
        status: KitchenAccountStatus.UNDER_REVIEW,
        onboardingStep: KitchenOnboardingStep.SUBMITTED,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    this.logger.log(`Partner ${accountId} submitted their application`);
    return this.getStatus(accountId);
  }

  /**
   * Approval flips the kitchen live. Ops-facing for now — an admin console
   * will call this in Phase 2; until then it is run by the team directly.
   */
  async approve(accountId: string) {
    const account = await this.prisma.kitchenAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { kitchen: { select: { id: true } } },
    });
    if (!account.kitchen) throw new BadRequestException('This partner has no kitchen to approve');

    await this.prisma.$transaction([
      this.prisma.kitchenAccount.update({
        where: { id: accountId },
        data: {
          status: KitchenAccountStatus.ACTIVE,
          onboardingStep: KitchenOnboardingStep.COMPLETED,
          approvedAt: new Date(),
        },
      }),
      this.prisma.kitchen.update({
        where: { id: account.kitchen.id },
        data: { status: KitchenStatus.ACTIVE, isVerified: true },
      }),
    ]);

    return this.getStatus(accountId);
  }

  async reject(accountId: string, reason: string) {
    await this.prisma.kitchenAccount.update({
      where: { id: accountId },
      data: {
        status: KitchenAccountStatus.ONBOARDING,
        rejectionReason: reason,
      },
    });
    return this.getStatus(accountId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /** Steps only ever move forward — revisiting one must not undo progress. */
  private async setStep(accountId: string, step: KitchenOnboardingStep) {
    const account = await this.prisma.kitchenAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { onboardingStep: true },
    });

    if (STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(account.onboardingStep)) {
      await this.prisma.kitchenAccount.update({
        where: { id: accountId },
        data: { onboardingStep: step },
      });
    }
  }

  private advance(_accountId: string, step: KitchenOnboardingStep) {
    return step;
  }

  private async requireKitchen(accountId: string, message: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!kitchen) throw new BadRequestException(message);
    return kitchen;
  }

  /** `Annapurna Kitchen` → `annapurna-kitchen`, `-2` on collision. */
  private async buildUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'kitchen';

    let slug = base;
    let suffix = 1;
    while (await this.prisma.kitchen.findUnique({ where: { slug }, select: { id: true } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }
}
