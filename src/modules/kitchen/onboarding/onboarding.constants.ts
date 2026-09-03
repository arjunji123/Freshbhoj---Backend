import { KitchenOnboardingStep } from '@prisma/client';

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

/** FSSAI is non-negotiable — we cannot list a kitchen without it. */
export const REQUIRED_DOCUMENT_TYPES = ['FSSAI'] as const;
