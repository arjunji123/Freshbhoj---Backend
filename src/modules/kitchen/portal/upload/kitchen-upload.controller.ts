import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import * as path from 'path';
import { UploadService } from '../../../../upload/upload.service';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';
import { ApiEnvelope, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenUploadDto, KitchenUploadPurpose } from './dto/kitchen-upload.dto';
import { KitchenUploadResultDto } from './dto/kitchen-upload.response.dto';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm'];

/**
 * One shared upload endpoint for every kitchen media need — menu photos, story
 * clips, onboarding documents, logo/cover. Everything else (menu, stories,
 * onboarding documents, kitchen profile) takes a plain URL string; get that
 * URL from here first.
 */
@ApiTags('Kitchen · Upload')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/upload')
export class KitchenUploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a menu photo, story clip, document, or branding image',
    description: 'Multipart. Returns the URL to pass to menu/stories/onboarding/profile endpoints.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string', enum: Object.values(KitchenUploadPurpose) },
      },
      required: ['file', 'purpose'],
    },
  })
  @ApiEnvelope(KitchenUploadResultDto)
  @ApiEnvelopeError(400, 'Missing file, unsupported type, or file too large')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — covers a short story video, not just a photo
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPG, PNG, WEBP images or MP4, MOV, WEBM videos are allowed'), false);
        }
      },
    }),
  )
  async upload(
    @CurrentKitchenAccount() account: KitchenAccount,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: KitchenUploadDto,
  ) {
    if (!file) throw new BadRequestException('A file is required');

    const url = await this.uploadService.uploadForKitchen(file, account.id, dto.purpose);
    return { message: 'File uploaded', data: { url } };
  }
}
