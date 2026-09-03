import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** `GET /health` — liveness probe. */
export class HealthDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'FreshBhoj API' })
  service: string;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  timestamp: string;

  @ApiProperty({ example: 1843.27, description: 'Process uptime in seconds' })
  uptime: number;
}

/** `PATCH /users/location` — echoes back what was stored. */
export class UserLocationDto {
  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar, Jaipur' })
  address: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Jaipur' })
  city: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Rajasthan' })
  state: string | null;

  @ApiPropertyOptional({ nullable: true, example: '302017' })
  pincode: string | null;
}

/** Row created by either website pre-registration form. */
export class WaitlistEntryDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f' })
  id: string;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  createdAt: string;
}
