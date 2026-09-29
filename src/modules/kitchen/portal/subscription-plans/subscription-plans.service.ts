import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FoodType, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plans.dto';

type PlanWithCount = SubscriptionPlan & { _count: { subscriptions: number } };

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { kitchenId: kitchen.id },
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((p) => this.toDto(p));
  }

  async create(accountId: string, dto: CreateSubscriptionPlanDto) {
    const kitchen = await this.requireKitchen(accountId);

    if (dto.originalPriceRs !== undefined && dto.originalPriceRs <= dto.priceRs) {
      throw new BadRequestException('originalPriceRs must be greater than priceRs, or omitted entirely');
    }
    this.assertJainEligible(dto.jainAvailable ?? false, dto.dietOptions);

    const created = await this.prisma.subscriptionPlan.create({
      data: {
        kitchenId: kitchen.id,
        name: dto.name,
        billingCycle: dto.billingCycle,
        deliveryDays: dto.deliveryDays,
        mealsPerDay: dto.mealsPerDay,
        priceRs: dto.priceRs,
        originalPriceRs: dto.originalPriceRs,
        dietOptions: dto.dietOptions,
        jainAvailable: dto.jainAvailable ?? false,
        slotOptions: dto.slotOptions,
        includesDescription: dto.includesDescription,
        isPopular: dto.isPopular ?? false,
      },
      include: { _count: { select: { subscriptions: true } } },
    });
    return this.toDto(created);
  }

  async update(accountId: string, id: string, dto: UpdateSubscriptionPlanDto) {
    const kitchen = await this.requireKitchen(accountId);
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan || plan.kitchenId !== kitchen.id) {
      throw new NotFoundException('Subscription plan not found');
    }

    const nextPrice = dto.priceRs ?? plan.priceRs;
    const nextOriginal = dto.originalPriceRs !== undefined ? (dto.originalPriceRs || null) : plan.originalPriceRs;
    if (nextOriginal && nextOriginal <= nextPrice) {
      throw new BadRequestException('originalPriceRs must be greater than priceRs, or omitted entirely');
    }
    this.assertJainEligible(dto.jainAvailable ?? plan.jainAvailable, dto.dietOptions ?? plan.dietOptions);

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
        ...(dto.deliveryDays !== undefined && { deliveryDays: dto.deliveryDays }),
        ...(dto.mealsPerDay !== undefined && { mealsPerDay: dto.mealsPerDay }),
        ...(dto.priceRs !== undefined && { priceRs: dto.priceRs }),
        ...(dto.originalPriceRs !== undefined && { originalPriceRs: dto.originalPriceRs || null }),
        ...(dto.dietOptions !== undefined && { dietOptions: dto.dietOptions }),
        ...(dto.jainAvailable !== undefined && { jainAvailable: dto.jainAvailable }),
        ...(dto.slotOptions !== undefined && { slotOptions: dto.slotOptions }),
        ...(dto.includesDescription !== undefined && { includesDescription: dto.includesDescription }),
        ...(dto.isPopular !== undefined && { isPopular: dto.isPopular }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { _count: { select: { subscriptions: true } } },
    });
    return this.toDto(updated);
  }

  private assertJainEligible(jainAvailable: boolean, dietOptions: FoodType[]) {
    if (jainAvailable && !dietOptions.some((d) => d === FoodType.VEG || d === FoodType.VEGAN)) {
      throw new BadRequestException('Jain can only be offered on a plan whose diet options include Veg or Vegan');
    }
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId } });
    if (!kitchen) {
      throw new BadRequestException('Complete onboarding to create your kitchen profile first');
    }
    return kitchen;
  }

  private toDto(plan: PlanWithCount) {
    return {
      id: plan.id,
      name: plan.name,
      billingCycle: plan.billingCycle,
      deliveryDays: plan.deliveryDays,
      mealsPerDay: plan.mealsPerDay,
      priceRs: plan.priceRs,
      originalPriceRs: plan.originalPriceRs,
      discountPercent:
        plan.originalPriceRs && plan.originalPriceRs > plan.priceRs
          ? Math.round(((plan.originalPriceRs - plan.priceRs) / plan.originalPriceRs) * 100)
          : 0,
      dietOptions: plan.dietOptions,
      jainAvailable: plan.jainAvailable,
      slotOptions: plan.slotOptions,
      includesDescription: plan.includesDescription,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      subscriberCount: plan._count.subscriptions,
      createdAt: plan.createdAt,
    };
  }
}
