import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenAccountStatus } from '@prisma/client';

export class DashboardTodayDto {
  @ApiProperty({ example: 14, description: 'Orders placed today' })
  orderCount: number;

  @ApiProperty({ example: 5, description: 'Awaiting acceptance or in progress right now' })
  activeOrderCount: number;

  @ApiProperty({ example: 6280, description: 'Sum of totalAmount for today’s delivered + in-flight orders' })
  revenue: number;
}

export class DashboardAllTimeDto {
  @ApiProperty({ example: 1842 })
  orderCount: number;

  @ApiProperty({ example: 812430 })
  revenue: number;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 1243 })
  ratingCount: number;

  @ApiProperty({ example: 3820 })
  followerCount: number;

  @ApiProperty({ example: 12, description: 'Live dishes on the menu' })
  activeMealCount: number;
}

export class DashboardWeeklyRevenueDto {
  @ApiProperty({ example: '2026-09-22', description: 'IST calendar date, YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: 4200, description: 'Delivered-order revenue for that day' })
  revenue: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ enum: KitchenAccountStatus, example: KitchenAccountStatus.ACTIVE })
  accountStatus: KitchenAccountStatus;

  @ApiProperty({ example: true, description: 'Whether the kitchen is currently taking new orders' })
  isAcceptingOrders: boolean;

  @ApiProperty({ type: DashboardTodayDto })
  today: DashboardTodayDto;

  @ApiProperty({ type: DashboardAllTimeDto })
  allTime: DashboardAllTimeDto;

  @ApiProperty({
    type: [DashboardWeeklyRevenueDto],
    description: 'Last 7 IST calendar days, oldest first, today last',
  })
  weeklyRevenue: DashboardWeeklyRevenueDto[];

  @ApiPropertyOptional({
    nullable: true,
    example: 'FSSAI licence pending review',
    description: 'Set when the account still needs attention (rejected doc, incomplete onboarding)',
  })
  actionNeeded: string | null;
}
