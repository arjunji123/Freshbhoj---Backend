import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatSenderType, OrderStatus } from '@prisma/client';

export class OrderMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ChatSenderType })
  sender: ChatSenderType;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional({ enum: OrderStatus, nullable: true })
  triggeredStatus: OrderStatus | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}
