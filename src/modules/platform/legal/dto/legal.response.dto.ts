import { ApiProperty } from '@nestjs/swagger';

export class LegalSectionDto {
  @ApiProperty() heading: string;
  @ApiProperty() body: string;
}

export class LegalDocumentDto {
  @ApiProperty({ enum: ['terms', 'privacy', 'content'] }) key: string;
  @ApiProperty() title: string;
  @ApiProperty({ example: '2026-09-01', description: 'Date of the last wording change (YYYY-MM-DD)' }) updatedAt: string;
  @ApiProperty({ type: [LegalSectionDto] }) sections: LegalSectionDto[];
}
