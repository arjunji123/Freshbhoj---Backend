import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UploadService } from '../../../upload/upload.service';
import { CompleteProfileDto, UpdateLocationDto, UpdateFcmTokenDto } from './dto/user.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UserDto } from '../../identity/customer-auth/dto/auth.response.dto';
import { UserLocationDto } from '../../../common/dto/misc.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopeNull,
} from '../../../common/decorators/api-envelope.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';

@ApiTags('Customer · Profile')
@ApiBearerAuth('JWT-auth')
@Controller('customer/profile')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // GET /users/me — Get current user profile
  // ──────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get current user profile (fresh from the DB)' })
  @ApiEnvelope(UserDto)
  async getProfile(@CurrentUser() user: User) {
    const freshUser = await this.usersService.findById(user.id);
    return {
      message: 'Profile fetched successfully',
      data: freshUser,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /users/profile/complete
  // Complete onboarding: name + email + optional profile image
  // ──────────────────────────────────────────────────────────────────────────
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete user profile (onboarding step 1)',
    description:
      'Multipart. Sets the user status to ACTIVE, which is what lets the app leave the onboarding stack.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Rahul Sharma', description: 'Full name' },
        email: { type: 'string', example: 'rahul@example.com', description: 'Optional email' },
        profileImage: { type: 'string', format: 'binary', description: 'Optional profile picture (JPG/PNG, max 5MB)' },
      },
      required: ['fullName'],
    },
  })
  @ApiEnvelope(UserDto, { description: 'Profile completed — status flips to ACTIVE' })
  @ApiEnvelopeError(400, 'Name too short, or an unsupported image type')
  @ApiEnvelopeError(409, 'That email is already registered to another account')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPG, PNG, WEBP images are allowed'), false);
        }
      },
    }),
  )
  async completeProfile(
    @CurrentUser() user: User,
    @Body() dto: CompleteProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let profileImageUrl: string | undefined;

    // Upload to S3 if image provided
    if (file) {
      profileImageUrl = await this.uploadService.uploadProfileImage(
        file,
        user.id,
      );
    }

    const updatedUser = await this.usersService.completeProfile(
      user.id,
      dto,
      profileImageUrl,
    );

    return {
      message: 'Profile completed successfully',
      data: updatedUser,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /users/profile/image
  // Update only profile image
  // ──────────────────────────────────────────────────────────────────────────
  @Patch('image')
  @ApiOperation({ summary: 'Update Profile Image Only' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profileImage: { type: 'string', format: 'binary', description: 'Profile picture (JPG/PNG, max 5MB)' },
      },
      required: ['profileImage'],
    },
  })
  @ApiEnvelopeError(400, 'Missing file or unsupported image type')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(allowed.includes(ext) ? null : new BadRequestException('Invalid file type'), allowed.includes(ext));
      },
    }),
  )
  async updateProfileImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Profile image is required');

    const imageUrl = await this.uploadService.uploadProfileImage(file, user.id);
    const updatedUser = await this.usersService.updateProfileImage(user.id, imageUrl);

    return {
      message: 'Profile image updated successfully',
      data: { profileImage: updatedUser.profileImage },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /users/location
  // Update user current location from phone GPS
  // ──────────────────────────────────────────────────────────────────────────
  @Patch('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user location (onboarding step 2)',
    description: 'Called when the user picks a serviceable area, and again on GPS updates.',
  })
  @ApiBody({ type: UpdateLocationDto })
  @ApiEnvelope(UserLocationDto, { description: 'The stored location' })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateLocationDto,
  ) {
    const updatedUser = await this.usersService.updateLocation(user.id, dto);
    return {
      message: 'Location updated successfully',
      data: {
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        pincode: updatedUser.pincode,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /users/fcm-token
  // Store/update FCM token for push notifications
  // ──────────────────────────────────────────────────────────────────────────
  @Patch('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Store the Firebase push token for this device' })
  @ApiBody({ type: UpdateFcmTokenDto })
  @ApiEnvelopeNull({ description: 'Token stored' })
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    await this.usersService.updateFcmToken(user.id, dto);
    return { message: 'FCM token updated', data: null };
  }
}
