import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SUPPORT_WHATSAPP } from '../../customer/orders/orders.constants';
import { FaqQueryDto, UpdateNotificationPreferencesDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Contact options for the Help screen. */
  getContactChannels() {
    const whatsappNumber = process.env.SUPPORT_WHATSAPP ?? SUPPORT_WHATSAPP;
    return {
      whatsapp: {
        number: whatsappNumber,
        // Deep link the Help screen opens directly.
        url: `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
          'Hi FreshBhoj, I need help with my order',
        )}`,
      },
      email: process.env.SUPPORT_EMAIL ?? 'support@freshbhoj.com',
      phone: process.env.SUPPORT_PHONE ?? whatsappNumber,
      hours: 'Every day, 8:00 AM – 11:00 PM IST',
    };
  }

  async getFaqs(query: FaqQueryDto) {
    return this.prisma.faqItem.findMany({
      where: { isActive: true, ...(query.category && { category: query.category }) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, category: true, question: true, answer: true },
    });
  }

  /** Preferences row is created lazily on first read. */
  async getNotificationPreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    await this.getNotificationPreferences(userId);
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: { ...dto },
    });
  }

  /** Aggregate counts for the Profile header (orders, favourites, follows). */
  async getProfileStats(userId: string) {
    const [orderCount, favoriteCount, followingCount, addressCount] = await Promise.all([
      this.prisma.order.count({ where: { userId, status: 'DELIVERED' } }),
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.kitchenFollow.count({ where: { userId } }),
      this.prisma.address.count({ where: { userId } }),
    ]);

    return { orderCount, favoriteCount, followingCount, addressCount };
  }
}
