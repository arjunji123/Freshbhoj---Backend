import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardBrand } from '@prisma/client';

export class SavedCardDto {
  @ApiProperty({ example: '3f4a5b6c-7d8e-49f0-8a1b-2c3d4e5f6a7b' })
  id: string;

  @ApiProperty({ enum: CardBrand, example: CardBrand.VISA })
  brand: CardBrand;

  @ApiProperty({ example: '4242' })
  last4: string;

  @ApiProperty({ example: '•••• •••• •••• 4242', description: 'Ready to render as-is' })
  maskedNumber: string;

  @ApiProperty({ example: '11/29' })
  expiry: string;

  @ApiProperty({ example: false, description: 'Expired cards stay listed but cannot be charged' })
  isExpired: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'Rahul Sharma' })
  holderName: string | null;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  createdAt: string;
}

export class DeletedCardDto {
  @ApiProperty({ example: '3f4a5b6c-7d8e-49f0-8a1b-2c3d4e5f6a7b' })
  id: string;
}
