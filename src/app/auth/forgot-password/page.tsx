import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié - Yad.ia",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
