import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly bucketName: string;
  private readonly cdnUrl: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('firebase.storageBucket', '');
    this.cdnUrl = this.configService.get<string>('firebase.cdnUrl', '');

    const projectId = this.configService.get<string>('firebase.projectId', '');
    const clientEmail = this.configService.get<string>('firebase.clientEmail', '');
    const privateKey = this.configService.get<string>('firebase.privateKey', '');
    this.configured = Boolean(projectId && clientEmail && privateKey && this.bucketName);

    if (this.configured && !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        storageBucket: this.bucketName,
      });
    }
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
  // Upload Kitchen Partner Media (menu photos, story clips, reels, documents, branding)
  // ──────────────────────────────────────────────────────────────────────────

  async uploadForKitchen(
    file: Express.Multer.File,
    accountId: string,
    purpose: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const folder = purpose.toLowerCase().replace(/_/g, '-');
    const key = `kitchens/${accountId}/${folder}/${uuidv4()}${ext}`;

    return this.uploadFile(file.buffer, key, file.mimetype);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Generic Upload — Firebase Cloud Storage
  // ──────────────────────────────────────────────────────────────────────────

  private async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    // Dev mode / missing Firebase credentials: skip the real upload, return a
    // placeholder so the rest of the app keeps working end-to-end locally.
    const isDevMode = this.configService.get<string>('app.nodeEnv') === 'development';
    if (!this.configured) {
      if (!isDevMode) {
        throw new InternalServerErrorException('File storage is not configured');
      }
      const placeholder = `https://api.dicebear.com/7.x/initials/svg?seed=${key}`;
      this.logger.warn(`[DEV MODE] Firebase Storage not configured. Returning placeholder: ${placeholder}`);
      return placeholder;
    }

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(key);

      await file.save(buffer, {
        contentType,
        metadata: { cacheControl: 'public, max-age=31536000' }, // 1 year
      });
      await file.makePublic();

      const url = this.cdnUrl ? `${this.cdnUrl}/${key}` : `https://storage.googleapis.com/${this.bucketName}/${key}`;

      this.logger.log(`File uploaded to Firebase Storage: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Firebase Storage upload failed:', error.message);
      throw new InternalServerErrorException('Failed to upload file. Please try again.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Delete File from Firebase Storage
  // ──────────────────────────────────────────────────────────────────────────

  async deleteFile(url: string): Promise<void> {
    if (!this.configured) return;

    const key = this.extractKeyFromUrl(url);
    if (!key) return;

    try {
      await admin.storage().bucket().file(key).delete();
      this.logger.log(`File deleted from Firebase Storage: ${key}`);
    } catch (error) {
      this.logger.error('Firebase Storage delete failed:', error.message);
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      let pathname = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
      // Raw (non-CDN) storage.googleapis.com URLs carry the bucket name as the
      // first path segment — the CDN form doesn't, so only strip it when present.
      if (pathname.startsWith(`${this.bucketName}/`)) {
        pathname = pathname.slice(this.bucketName.length + 1);
      }
      return pathname;
    } catch {
      return null;
    }
  }
}
