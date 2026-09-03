import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CardBrand, SavedCard } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveCardDto } from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const cards = await this.prisma.savedCard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return cards.map((card) => this.toDto(card));
  }

  async save(userId: string, dto: SaveCardDto) {
    const count = await this.prisma.savedCard.count({ where: { userId } });
    // The first card a customer saves is the one checkout pre-selects.
    const shouldBeDefault = dto.isDefault === true || count === 0;

    const card = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.savedCard.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      // Re-saving the same gateway token just refreshes the display fields
      // rather than creating a duplicate row.
      return tx.savedCard.upsert({
        where: { userId_gatewayToken: { userId, gatewayToken: dto.gatewayToken } },
        update: {
          brand: dto.brand,
          last4: dto.last4,
          expiryMonth: dto.expiryMonth,
          expiryYear: dto.expiryYear,
          holderName: dto.holderName,
          isDefault: shouldBeDefault,
        },
        create: {
          userId,
          gatewayToken: dto.gatewayToken,
          gateway: dto.gateway ?? 'razorpay',
          brand: dto.brand ?? CardBrand.UNKNOWN,
          last4: dto.last4,
          expiryMonth: dto.expiryMonth,
          expiryYear: dto.expiryYear,
          holderName: dto.holderName,
          isDefault: shouldBeDefault,
        },
      });
    });

    return this.toDto(card);
  }

  async setDefault(userId: string, id: string) {
    await this.assertOwned(userId, id);
    const card = await this.prisma.$transaction(async (tx) => {
      await tx.savedCard.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.savedCard.update({ where: { id }, data: { isDefault: true } });
    });
    return this.toDto(card);
  }

  async remove(userId: string, id: string) {
    const card = await this.assertOwned(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.savedCard.delete({ where: { id } });
      // Never leave the customer without a default if any card remains.
      if (card.isDefault) {
        const next = await tx.savedCard.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (next) await tx.savedCard.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });

    return { id };
  }

  private async assertOwned(userId: string, id: string): Promise<SavedCard> {
    const card = await this.prisma.savedCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException('This card does not belong to you');
    return card;
  }

  private toDto(card: SavedCard) {
    const now = new Date();
    // A card expires at the end of its expiry month.
    const isExpired =
      card.expiryYear < now.getFullYear() ||
      (card.expiryYear === now.getFullYear() && card.expiryMonth < now.getMonth() + 1);

    return {
      id: card.id,
      brand: card.brand,
      last4: card.last4,
      maskedNumber: `•••• •••• •••• ${card.last4}`,
      expiry: `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`,
      isExpired,
      holderName: card.holderName,
      isDefault: card.isDefault,
      createdAt: card.createdAt,
    };
  }
}
