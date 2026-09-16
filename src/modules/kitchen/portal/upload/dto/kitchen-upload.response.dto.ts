import { ApiProperty } from '@nestjs/swagger';

export class KitchenUploadResultDto {
  @ApiProperty({ example: 'https://freshbhoj-media.s3.amazonaws.com/kitchens/.../menu-image/....jpg' })
  url: string;
}
