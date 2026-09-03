import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, CouponType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CouponEvaluation {
  valid: boolean;
  code: string | null;
  discount: number;
  title?: string;
  reason?: string;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Offers worth surfacing in the cart's collapsed coupon panel. */
  async listAvailable(itemsTotal = 0) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: { isActive: true, validFrom: { lte: now }, validTill: { gt: now } },
      orderBy: { minOrderValue: 'asc' },
    });

    return coupons.map((c) => ({
      code: c.code,
      title: c.title,
      description: c.description,
      type: c.type,
      value: c.value,
      minOrderValue: c.minOrderValue,
      maxDiscount: c.maxDiscount,
      validTill: c.validTill,
      /** Lets the UI grey out coupons the current cart can't use yet. */
      isApplicable: itemsTotal >= c.minOrderValue,
      amountNeeded: Math.max(c.minOrderValue - itemsTotal, 0),
    }));
  }

  /**
   * Non-throwing evaluation — the cart preview re-runs this on every change and
   * must be able to say "this coupon no longer applies" without erroring out.
   */
  async evaluate(code: string | null | undefined, itemsTotal: number, userId?: string): Promise<CouponEvaluation> {
    if (!code) return { valid: false, code: null, discount: 0 };

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return { valid: false, code, discount: 0, reason: 'This coupon code is not valid' };
    }

    const now = new Date();
    if (coupon.validFrom > now) {
      return { valid: false, code, discount: 0, reason: 'This coupon is not active yet' };
    }
    if (coupon.validTill < now) {
      return { valid: false, code, discount: 0, reason: 'This coupon has expired' };
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, code, discount: 0, reason: 'This coupon has been fully redeemed' };
    }
    if (itemsTotal < coupon.minOrderValue) {
      return {
        valid: false,
        code,
        discount: 0,
        reason: `Add ₹${coupon.minOrderValue - itemsTotal} more to use this coupon`,
      };
    }

    if (userId && coupon.perUserLimit > 0) {
      const usedByUser = await this.prisma.order.count({
        where: {
          userId,
          couponCode: coupon.code,
          status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] },
        },
      });
      if (usedByUser >= coupon.perUserLimit) {
        return { valid: false, code, discount: 0, reason: 'You have already used this coupon' };
      }
    }

    return {
      valid: true,
      code: coupon.code,
      title: coupon.title,
      discount: this.computeDiscount(coupon, itemsTotal),
    };
  }

  /** Throwing variant for the explicit "Apply" tap, so the app gets the reason. */
  async apply(code: string, itemsTotal: number, userId: string): Promise<CouponEvaluation> {
    const result = await this.evaluate(code, itemsTotal, userId);
    if (!result.valid) {
      throw new BadRequestException(result.reason ?? 'This coupon code is not valid');
    }
    return result;
  }

  async markUsed(code: string) {
    await this.prisma.coupon.updateMany({
      where: { code },
      data: { usedCount: { increment: 1 } },
    });
  }

  private computeDiscount(coupon: Coupon, itemsTotal: number): number {
    if (coupon.type === CouponType.FLAT) {
      return Math.min(coupon.value, itemsTotal);
    }
    const raw = Math.round((itemsTotal * coupon.value) / 100);
    const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    return Math.min(capped, itemsTotal);
  }
}
