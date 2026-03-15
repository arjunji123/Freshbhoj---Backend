import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
}));
