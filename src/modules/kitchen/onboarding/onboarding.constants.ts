import { KitchenDocumentType, KitchenOnboardingStep } from '@prisma/client';

/**
 * The onboarding funnel, in order. `KitchenAccount.onboardingStep` stores the
 * furthest step reached, so progress and "where do I resume?" are both derived
 * from this one list rather than scattered across the code.
 */
export const ONBOARDING_STEPS: Array<{
  step: KitchenOnboardingStep;
  label: string;
  description: string;
}> = [
  {
    step: KitchenOnboardingStep.PHONE_VERIFIED,
    label: 'Phone verified',
    description: 'We have confirmed your mobile number',
  },
  {
    step: KitchenOnboardingStep.OWNER_DETAILS,
    label: 'Owner details',
    description: 'Your name and how we reach you',
  },
  {
    step: KitchenOnboardingStep.KITCHEN_DETAILS,
    label: 'Kitchen details',
    description: 'Name, photos, timings and what you cook',
  },
  {
    step: KitchenOnboardingStep.LOCATION,
    label: 'Location',
    description: 'Where you cook, so we can match nearby customers',
  },
  {
    step: KitchenOnboardingStep.DOCUMENTS,
    label: 'Documents',
    description: 'FSSAI licence and identity proof',
  },
  {
    step: KitchenOnboardingStep.BANK_DETAILS,
    label: 'Bank details',
    description: 'Where your payouts land',
  },
  {
    step: KitchenOnboardingStep.MENU_SETUP,
    label: 'Menu',
    description: 'Add at least one dish with its nutrition',
  },
  {
    step: KitchenOnboardingStep.SUBMITTED,
    label: 'Submitted',
    description: 'Our team is reviewing your application',
  },
  {
    step: KitchenOnboardingStep.COMPLETED,
    label: 'Live',
    description: 'You are accepting orders',
  },
];

export const STEP_ORDER = ONBOARDING_STEPS.map((s) => s.step);

/** These cannot be skipped — we cannot list a kitchen without them. */
export const REQUIRED_DOCUMENT_TYPES = [
  KitchenDocumentType.FSSAI,
  KitchenDocumentType.KITCHEN_PHOTO_FRONT,
  KitchenDocumentType.KITCHEN_PHOTO_MAIN,
] as const;

/** Friendly, per-type wording for the `pending[]` checklist. */
export const REQUIRED_DOCUMENT_LABELS: Record<(typeof REQUIRED_DOCUMENT_TYPES)[number], string> = {
  FSSAI: 'Upload your FSSAI licence',
  KITCHEN_PHOTO_FRONT: 'Upload a front-view photo of your kitchen',
  KITCHEN_PHOTO_MAIN: 'Upload a photo of your main kitchen',
};
