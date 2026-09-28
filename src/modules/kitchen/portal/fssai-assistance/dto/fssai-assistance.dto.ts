import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { FssaiAssistanceDocumentType } from '@prisma/client';

export class UploadFssaiAssistanceDocumentDto {
  @ApiProperty({ enum: FssaiAssistanceDocumentType, example: FssaiAssistanceDocumentType.IDENTITY_PROOF })
  @IsEnum(FssaiAssistanceDocumentType)
  type: FssaiAssistanceDocumentType;

  @ApiProperty({
    example: 'https://cdn.freshbhoj.com/docs/fssai-assist-identity.jpg',
    description: 'Upload the file via POST /partner/upload first, then send the returned URL',
  })
  @IsString()
  @MinLength(5)
  fileUrl: string;
}
