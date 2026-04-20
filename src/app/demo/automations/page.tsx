import { AutomationsClient } from "@/components/automations/automations-client";
import { DEMO_AUTOMATIONS } from "@/lib/demo/data";

const DEMO_RECENT_RUNS = DEMO_AUTOMATIONS.flatMap((a) => a.runs).sort(
  (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
);

export default function DemoAutomationsPage() {
  return (
    <div className="pt-10">
      <AutomationsClient
        automations={DEMO_AUTOMATIONS as Parameters<typeof AutomationsClient>[0]["automations"]}
        recentRuns={DEMO_RECENT_RUNS as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
      />
    </div>
  );
}
