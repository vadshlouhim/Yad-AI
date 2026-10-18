import { getLocale, getTranslations } from "next-intl/server";

export async function LegalLanguageNotice() {
  if ((await getLocale()) !== "he") return null;
  const t = await getTranslations("legal");
  return <p className="mx-auto mb-6 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">{t("frenchOnly")}</p>;
}
