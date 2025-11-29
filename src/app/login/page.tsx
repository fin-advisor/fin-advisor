import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </Suspense>
  );
}
