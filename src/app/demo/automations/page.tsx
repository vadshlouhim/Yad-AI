import { AutomationsClient } from "@/components/automations/automations-client";
import { DEMO_AUTOMATIONS } from "@/lib/demo/data";

type AutomationsProps = Parameters<typeof AutomationsClient>[0];

const DEMO_AUTOMATION_ITEMS = DEMO_AUTOMATIONS as unknown as AutomationsProps["automations"];

const DEMO_RECENT_RUNS = DEMO_AUTOMATION_ITEMS.flatMap((automation) => automation.runs ?? []).sort(
  (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
);

export default function DemoAutomationsPage() {
  return (
    <div className="pt-10">
      <AutomationsClient
        automations={DEMO_AUTOMATION_ITEMS}
        recentRuns={DEMO_RECENT_RUNS}
      />
    </div>
  );
}
