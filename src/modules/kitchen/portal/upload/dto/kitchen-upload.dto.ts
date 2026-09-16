import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Where the file lands in storage and which limits apply — not persisted anywhere. */
export enum KitchenUploadPurpose {
  MENU_IMAGE = 'MENU_IMAGE',
  STORY_MEDIA = 'STORY_MEDIA',
  KITCHEN_LOGO = 'KITCHEN_LOGO',
  KITCHEN_COVER = 'KITCHEN_COVER',
  DOCUMENT = 'DOCUMENT',
}

export class KitchenUploadDto {
  @ApiProperty({ enum: KitchenUploadPurpose, example: KitchenUploadPurpose.MENU_IMAGE })
  @IsEnum(KitchenUploadPurpose)
  purpose: KitchenUploadPurpose;
}
