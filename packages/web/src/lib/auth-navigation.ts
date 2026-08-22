interface OnboardingAwareUser {
  onboardingRequired: boolean;
  mustChangePassword: boolean;
}

export function getAuthenticatedEntryPath(user: OnboardingAwareUser): string {
  if (user.mustChangePassword) return "/force-password-change";
  return user.onboardingRequired ? "/onboarding" : "/dashboard";
}
