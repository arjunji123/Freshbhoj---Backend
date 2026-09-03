import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardBrand } from '@prisma/client';

/**
 * Cards are saved *after* the gateway has tokenised them.
 *
 * The app never sends us a PAN or CVV — it sends the gateway's token plus the
 * display fragments. That keeps the whole platform outside PCI-DSS scope, which
 * is the only sane position for a company at this stage.
 */
export class SaveCardDto {
  @ApiProperty({
    example: 'tok_MkT91xQvHt4pLm',
    description: 'Network token returned by the payment gateway. Never a raw card number.',
  })
  @IsString()
  @Length(8, 200)
  gatewayToken: string;

  @ApiPropertyOptional({ example: 'razorpay', default: 'razorpay' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiProperty({ enum: CardBrand, example: CardBrand.VISA })
  @IsIn(Object.values(CardBrand))
  brand: CardBrand;

  @ApiProperty({ example: '4242', description: 'Last 4 digits, for display only' })
  @Matches(/^\d{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4: string;

  @ApiProperty({ example: 11, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth: number;

  @ApiProperty({ example: 2029 })
  @Type(() => Number)
  @IsInt()
  @Min(2024)
  @Max(2099)
  expiryYear: number;

  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  holderName?: string;

  @ApiPropertyOptional({ description: 'Pre-select this card at checkout' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
