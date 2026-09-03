import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CuisineDto {
  @ApiProperty({ example: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d' })
  id: string;

  @ApiProperty({ example: 'thali' })
  slug: string;

  @ApiProperty({ example: 'Thali' })
  name: string;

  @ApiPropertyOptional({ nullable: true, description: 'Small circular icon for the pill row' })
  iconUrl: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Larger plate image for the carousel' })
  imageUrl: string | null;

  @ApiProperty({ example: 4, description: 'Available meals in this cuisine' })
  mealCount: number;
}
