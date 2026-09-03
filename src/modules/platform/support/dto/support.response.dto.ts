import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WhatsAppChannelDto {
  @ApiProperty({ example: '+919876543210' })
  number: string;

  @ApiProperty({
    example: 'https://wa.me/919876543210?text=Hi%20FreshBhoj',
    description: 'Deep link the Help screen opens directly',
  })
  url: string;
}

export class SupportContactDto {
  @ApiProperty({ type: WhatsAppChannelDto })
  whatsapp: WhatsAppChannelDto;

  @ApiProperty({ example: 'support@freshbhoj.com' })
  email: string;

  @ApiProperty({ example: '+919876543210' })
  phone: string;

  @ApiProperty({ example: 'Every day, 8:00 AM – 11:00 PM IST' })
  hours: string;
}

export class FaqItemDto {
  @ApiProperty({ example: '7f8a9b0c-1d2e-4f3a-8b4c-5d6e7f8a9b0c' })
  id: string;

  @ApiProperty({ example: 'ORDERS' })
  category: string;

  @ApiProperty({ example: 'How do I track my order?' })
  question: string;

  @ApiProperty({ example: 'Open the Orders tab and tap your active order…' })
  answer: string;
}

export class NotificationPreferencesDto {
  @ApiProperty({ example: true })
  orderUpdates: boolean;

  @ApiProperty({ example: true })
  promotions: boolean;

  @ApiProperty({ example: true })
  newKitchens: boolean;

  @ApiProperty({ example: false })
  reelActivity: boolean;

  @ApiProperty({ example: true })
  whatsappUpdates: boolean;
}

export class ProfileStatsDto {
  @ApiProperty({ example: 14, description: 'Delivered orders' })
  orderCount: number;

  @ApiProperty({ example: 6 })
  favoriteCount: number;

  @ApiProperty({ example: 3 })
  followingCount: number;

  @ApiProperty({ example: 2 })
  addressCount: number;
}
