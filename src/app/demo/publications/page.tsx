import { PublicationsClient } from "@/components/publications/publications-client";
import { DEMO_PUBLICATIONS } from "@/lib/demo/data";

export default function DemoPublicationsPage() {
  const statsByStatus = DEMO_PUBLICATIONS.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pt-10">
      <PublicationsClient
        publications={DEMO_PUBLICATIONS as Parameters<typeof PublicationsClient>[0]["publications"]}
        statsByStatus={statsByStatus}
      />
    </div>
  );
}
