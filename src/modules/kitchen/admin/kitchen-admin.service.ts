import { Injectable } from '@nestjs/common';
import { KitchenAccountStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OnboardingService } from '../onboarding/onboarding.service';

@Injectable()
export class KitchenAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboardingService: OnboardingService,
  ) {}

  /** Defaults to the review queue — the whole point of this list. */
  async listAccounts(status?: KitchenAccountStatus) {
    const accounts = await this.prisma.kitchenAccount.findMany({
      where: { status: status ?? KitchenAccountStatus.UNDER_REVIEW },
      orderBy: { submittedAt: 'asc' },
      include: { kitchen: { select: { id: true, name: true, slug: true } } },
    });

    return accounts.map((account) => ({
      id: account.id,
      phone: account.phone,
      email: account.email,
      ownerName: account.ownerName,
      status: account.status,
      onboardingStep: account.onboardingStep,
      submittedAt: account.submittedAt,
      kitchen: account.kitchen ? { id: account.kitchen.id, name: account.kitchen.name, slug: account.kitchen.slug } : null,
    }));
  }

  approve(accountId: string) {
    return this.onboardingService.approve(accountId);
  }

  reject(accountId: string, reason: string) {
    return this.onboardingService.reject(accountId, reason);
  }
}
