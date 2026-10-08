export type LegalDocKey = 'terms' | 'privacy' | 'content';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocument {
  key: LegalDocKey;
  title: string;
  /** ISO date (YYYY-MM-DD) of the last wording change — bump it whenever the copy below changes. */
  updatedAt: string;
  sections: LegalSection[];
}

/**
 * The customer-facing legal copy. Served publicly so the signup consent sheet
 * (signed out) and the Settings pages read exactly the same text, and so a
 * wording change ships without an app release.
 */
export const LEGAL_DOCUMENTS: Record<LegalDocKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'Terms of Service',
    updatedAt: '2026-09-01',
    sections: [
      {
        heading: 'Ordering from real kitchens',
        body: 'FreshBhoj connects you to independent, verified home and cloud kitchens near you. Prices, availability and prep times are set by each kitchen and can change without notice.',
      },
      {
        heading: 'Accepted orders',
        body: 'Once a kitchen accepts your order, it usually cannot be cancelled for a refund — the kitchen has already started cooking. Our standard cancellation policy applies for kitchen or delivery issues.',
      },
      {
        heading: 'Delivery details',
        body: "You're responsible for giving an accurate address and being reachable when your delivery partner arrives.",
      },
      {
        heading: 'Fair use',
        body: 'Abuse towards delivery partners or kitchens, fraudulent payments, or misuse of the app can lead to your account being suspended.',
      },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    updatedAt: '2026-09-01',
    sections: [
      {
        heading: 'What we collect',
        body: 'Your phone number, name, delivery addresses and order history — just enough to run the app and get your food to you.',
      },
      {
        heading: 'Location',
        body: "Used only to show kitchens near you and help your delivery partner find you. We don't sell it to anyone.",
      },
      {
        heading: 'Payments',
        body: 'Handled entirely by our payment partners. FreshBhoj never stores your card, UPI ID or bank details.',
      },
      {
        heading: 'Your control',
        body: 'Ask for a copy of your data, or delete your account entirely, any time from Settings.',
      },
    ],
  },
  content: {
    key: 'content',
    title: 'Content Policy',
    updatedAt: '2026-09-01',
    sections: [
      {
        heading: 'Verified before day one',
        body: 'Every kitchen is inspected in person and FSSAI-checked before it can list a single dish — no exceptions.',
      },
      {
        heading: 'Real food, no junk',
        body: 'Only freshly prepared meals are allowed. No resold, packaged or ultra-processed "junk" items — that\'s the whole point of FreshBhoj.',
      },
      {
        heading: 'Honest photos and reels',
        body: "A kitchen's photos, Food Feed reels and descriptions must accurately show the dish you'll actually receive.",
      },
      {
        heading: 'Genuine reviews only',
        body: 'Reviews must come from a real order. Fake ratings get removed, and repeat offenders lose their account.',
      },
    ],
  },
};
