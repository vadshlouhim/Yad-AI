import { DemoModuleClient } from "@/components/demo/demo-module-client";
import { DEMO_MODULES } from "@/lib/demo/modules";

export default function DemoAutomationsPage() {
  return <DemoModuleClient moduleKey="automations" config={DEMO_MODULES.automations} />;
}
