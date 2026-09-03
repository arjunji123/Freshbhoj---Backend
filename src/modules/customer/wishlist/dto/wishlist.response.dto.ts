import { ApiProperty } from '@nestjs/swagger';

export class WishlistCountsDto {
  @ApiProperty({ example: 6 })
  meals: number;

  @ApiProperty({ example: 3 })
  reels: number;

  @ApiProperty({ example: 2, description: 'Kitchens the customer follows' })
  kitchens: number;

  @ApiProperty({ example: 11 })
  total: number;
}
