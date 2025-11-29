import AuthLayout from "@/components/auth/AuthLayout";
import SignUpForm from "@/components/auth/SignUpForm";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </Suspense>
  );
}
