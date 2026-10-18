import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === "he" ? "שכחתם סיסמה? — EasyCom IA" : "Mot de passe oublié — EasyCom IA" };
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
