interface OnboardingAwareUser {
  onboardingRequired: boolean;
}

export function getAuthenticatedEntryPath(user: OnboardingAwareUser): string {
  return user.onboardingRequired ? "/onboarding" : "/dashboard";
}
