"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used for onboarding but is kept to prevent
// breaking changes if it was linked from somewhere.
// It now just redirects to the main dashboard.
export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null; // Render nothing as it will redirect immediately
}
