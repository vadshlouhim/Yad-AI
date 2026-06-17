import { Suspense } from "react";
import { AutomationsClient } from "@/components/automations/automations-client";
import { DEMO_AUTOMATIONS } from "@/lib/demo/data";
import {
  GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS,
  getDefaultAutomationPublicationsForProfile,
} from "@/lib/automation/suggested-publications";
import { DEFAULT_BILLING_CONFIG } from "@/lib/billing";

type AutomationsProps = Parameters<typeof AutomationsClient>[0];

const DEMO_AUTOMATION_ITEMS = DEMO_AUTOMATIONS as unknown as AutomationsProps["automations"];

const DEMO_RECENT_RUNS = DEMO_AUTOMATION_ITEMS.flatMap((automation) => automation.runs ?? []).sort(
  (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
);

export default function DemoAutomationsPage() {
  return (
    <div className="pt-10">
      <Suspense fallback={null}>
        <AutomationsClient
          automations={DEMO_AUTOMATION_ITEMS}
          presets={[
            ...getDefaultAutomationPublicationsForProfile("SYNAGOGUE"),
            ...GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS,
          ] as unknown as AutomationsProps["presets"]}
          recentRuns={DEMO_RECENT_RUNS}
          communityType="SYNAGOGUE"
          billingConfig={DEFAULT_BILLING_CONFIG}
        />
      </Suspense>
    </div>
  );
}
