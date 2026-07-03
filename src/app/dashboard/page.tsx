import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

export default async function DashboardPage() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  redirect(isMobileUserAgent(userAgent) ? "/dashboard/overview" : "/dashboard/assistant");
}
