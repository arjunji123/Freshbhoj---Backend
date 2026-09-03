import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio;
  private isDevMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevMode = this.configService.get<boolean>('app.otp.devMode', true);

    if (!this.isDevMode) {
      try {
        const accountSid = this.configService.get<string>('twilio.accountSid');
        const authToken = this.configService.get<string>('twilio.authToken');
        
        if (accountSid && accountSid.startsWith('AC')) {
          this.client = new Twilio(accountSid, authToken);
        } else {
          this.logger.warn('Twilio Account SID is missing or invalid. SMS sending will fail.');
        }
      } catch (err) {
        this.logger.error('Failed to initialize Twilio client', err);
      }
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (this.isDevMode) {
      this.logger.warn(`[DEV MODE] OTP for ${phone}: ${otp}`);
      return;
    }

    if (!this.client) {
      this.logger.error(`Cannot send OTP to ${phone} - Twilio client is not initialized Check ENV variables.`);
      throw new Error('SMS service is not properly configured.');
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
