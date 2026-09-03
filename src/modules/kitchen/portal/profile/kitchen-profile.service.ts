import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Kitchen } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SetAcceptingOrdersDto, UpdateKitchenProfileDto } from './dto/kitchen-profile.dto';

@Injectable()
export class KitchenProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwn(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    return this.toDto(kitchen);
  }

  async update(accountId: string, dto: UpdateKitchenProfileDto) {
    const kitchen = await this.requireKitchen(accountId);

    const cuisineIds = dto.cuisineSlugs
      ? (
          await this.prisma.cuisine.findMany({
            where: { slug: { in: dto.cuisineSlugs } },
            select: { id: true },
          })
        ).map((c) => c.id)
      : undefined;

    // Cuisines live on Meal, not Kitchen — apply the update to every existing
    // dish so "what this kitchen cooks" stays in one place for the partner to
    // set, while the filter customers use still queries per-meal.
    if (cuisineIds && cuisineIds.length) {
      await this.prisma.meal.updateMany({
        where: { kitchenId: kitchen.id, cuisineId: null },
        data: { cuisineId: cuisineIds[0] },
      });
    }

    const updated = await this.prisma.kitchen.update({
      where: { id: kitchen.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.prepTimeMins !== undefined && { prepTimeMins: dto.prepTimeMins }),
        ...(dto.opensAt !== undefined && { opensAt: dto.opensAt }),
        ...(dto.closesAt !== undefined && { closesAt: dto.closesAt }),
      },
    });

    return this.toDto(updated);
  }

  async setAcceptingOrders(accountId: string, dto: SetAcceptingOrdersDto) {
    const kitchen = await this.requireKitchen(accountId);
    const updated = await this.prisma.kitchen.update({
      where: { id: kitchen.id },
      data: { isAcceptingOrders: dto.isAcceptingOrders },
    });
    return this.toDto(updated);
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId } });
    if (!kitchen) {
      throw new BadRequestException('Complete onboarding to create your kitchen profile first');
    }
    return kitchen;
  }

  private async toDto(kitchen: Kitchen) {
    const cuisines = await this.prisma.cuisine.findMany({
      where: { meals: { some: { kitchenId: kitchen.id } } },
      select: { slug: true },
    });

    return {
      id: kitchen.id,
      slug: kitchen.slug,
      name: kitchen.name,
      tagline: kitchen.tagline,
      description: kitchen.description,
      logoUrl: kitchen.logoUrl,
      coverImage: kitchen.coverImage,
      status: kitchen.status,
      isVerified: kitchen.isVerified,
      rating: kitchen.rating,
      ratingCount: kitchen.ratingCount,
      followerCount: kitchen.followerCount,
      addressLine: kitchen.addressLine,
      locality: kitchen.locality,
      city: kitchen.city,
      pincode: kitchen.pincode,
      latitude: kitchen.latitude,
      longitude: kitchen.longitude,
      prepTimeMins: kitchen.prepTimeMins,
      opensAt: kitchen.opensAt,
      closesAt: kitchen.closesAt,
      isAcceptingOrders: kitchen.isAcceptingOrders,
      contactPhone: kitchen.contactPhone,
      fssaiLicense: kitchen.fssaiLicense,
      hygieneScore: kitchen.hygieneScore,
      cuisines: cuisines.map((c) => c.slug),
      createdAt: kitchen.createdAt,
    };
  }
}
