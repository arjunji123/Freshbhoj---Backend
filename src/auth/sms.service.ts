import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: twilio.Twilio;
  private isDevMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevMode = this.configService.get<boolean>('app.otp.devMode', true);

    if (!this.isDevMode) {
      this.client = twilio(
        this.configService.get<string>('twilio.accountSid'),
        this.configService.get<string>('twilio.authToken'),
      );
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (this.isDevMode) {
      this.logger.warn(`[DEV MODE] OTP for ${phone}: ${otp}`);
      return;
    }

    try {
      await this.client.messages.create({
        body: `Your FreshBhoj verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
        from: this.configService.get<string>('twilio.phoneNumber'),
        to: phone,
      });

      this.logger.log(`OTP sent successfully to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}:`, error.message);
      throw error;
    }
  }
}
