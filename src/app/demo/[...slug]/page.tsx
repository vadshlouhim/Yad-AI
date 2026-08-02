import { notFound } from "next/navigation";
import { DemoModuleClient } from "@/components/demo/demo-module-client";
import { DEMO_MODULES } from "@/lib/demo/modules";

export default async function DemoModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const moduleKey = slug.join("/");
  const config = DEMO_MODULES[moduleKey];
  if (!config) notFound();
  return <DemoModuleClient moduleKey={moduleKey} config={config} />;
}
