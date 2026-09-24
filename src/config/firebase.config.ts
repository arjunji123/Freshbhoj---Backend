import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  // The console/CLI hand this out with literal `\n` escapes when it's pasted
  // into a single-line env var — turn them back into real newlines.
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  cdnUrl: process.env.FIREBASE_CDN_URL || '',
}));
