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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UploadService } from '../upload/upload.service';
import { CompleteProfileDto, UpdateLocationDto, UpdateFcmTokenDto } from './dto/user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { diskStorage } from 'multer';
import * as path from 'path';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // GET /users/me — Get current user profile
  // ──────────────────────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (Fresh from DB)' })
  @ApiResponse({ status: 200, description: 'Profile fetched successfully' })
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
  @Post('profile/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete User Profile (Name, Email, Image)' })
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
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
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
  @Patch('profile/image')
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
  @ApiResponse({ status: 200, description: 'Profile image updated' })
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
  @ApiOperation({ summary: 'Update User GPS Location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiBody({ type: UpdateLocationDto })
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
  @ApiOperation({ summary: 'Update FCM Push Notification Token' })
  @ApiResponse({ status: 200, description: 'FCM token updated' })
  @ApiBody({ type: UpdateFcmTokenDto })
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    await this.usersService.updateFcmToken(user.id, dto);
    return { message: 'FCM token updated', data: null };
  }
}
