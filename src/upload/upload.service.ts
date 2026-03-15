import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('aws.s3Bucket', 'freshbhoj-media');
    this.cdnUrl = this.configService.get<string>('aws.cdnUrl', '');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region', 'ap-south-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId', ''),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey', ''),
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Upload Profile Image
  // ──────────────────────────────────────────────────────────────────────────

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `users/profile-images/${userId}/${uuidv4()}${ext}`;

    return this.uploadFile(file.buffer, key, file.mimetype);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Generic Upload
  // ──────────────────────────────────────────────────────────────────────────

  private async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    // Dev mode: skip actual upload, return placeholder
    const isDevMode = this.configService.get<string>('app.nodeEnv') === 'development';
    if (isDevMode && !this.configService.get<string>('aws.accessKeyId')) {
      const placeholder = `https://api.dicebear.com/7.x/initials/svg?seed=${key}`;
      this.logger.warn(`[DEV MODE] Skipping S3 upload. Returning placeholder: ${placeholder}`);
      return placeholder;
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000', // 1 year
        }),
      );

      // Return CDN URL if configured, else S3 URL
      const url = this.cdnUrl
        ? `${this.cdnUrl}/${key}`
        : `https://${this.bucket}.s3.amazonaws.com/${key}`;

      this.logger.log(`File uploaded to S3: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('S3 upload failed:', error.message);
      throw new InternalServerErrorException('Failed to upload file. Please try again.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Delete File from S3
  // ──────────────────────────────────────────────────────────────────────────

  async deleteFile(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    if (!key) return;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error('S3 delete failed:', error.message);
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }
}
