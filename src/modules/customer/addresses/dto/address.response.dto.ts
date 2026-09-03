import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';

export class AddressDto {
  @ApiProperty({ example: '8a9b0c1d-2e3f-4a5b-8c6d-7e8f9a0b1c2d' })
  id: string;

  @ApiProperty({ enum: AddressLabel, example: AddressLabel.HOME })
  label: AddressLabel;

  @ApiPropertyOptional({ nullable: true, example: 'Mom’s place' })
  customLabel: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Rahul Sharma' })
  receiverName: string | null;

  @ApiPropertyOptional({ nullable: true, example: '9876543210' })
  receiverPhone: string | null;

  @ApiProperty({ example: 'Flat 402, Green Valley Apartments' })
  line1: string;

  @ApiPropertyOptional({ nullable: true, example: 'Sector 2, Main Road' })
  line2: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Opposite Central Park' })
  landmark: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiProperty({ example: 'Rajasthan' })
  state: string;

  @ApiProperty({ example: '302017' })
  pincode: string;

  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;

  @ApiProperty({
    example: true,
    description: 'The first saved address is always the default, and one always exists',
  })
  isDefault: boolean;
}

export class DeletedAddressDto {
  @ApiProperty({ example: '8a9b0c1d-2e3f-4a5b-8c6d-7e8f9a0b1c2d' })
  id: string;
}
