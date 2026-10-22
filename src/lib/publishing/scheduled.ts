import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database.types";
import { resolveAllowedPublishTime } from "./observance-guard";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

export async function processScheduledPublications(limit = 50) {
  const now = new Date();
  const admin = createAdminClient();

  const { data: scheduledPubs, error } = await admin
    .from("Publication")
    .select("*, channel:Channel(*)")
    .eq("status", "SCHEDULED")
    .lte("scheduledAt", now.toISOString())
    .limit(limit);

  if (error) {
    console.error("[Scheduled Publications] Recherche impossible:", error);
    return { processed: 0, failed: 0 };
  }

  console.log(`[Scheduled Publications] ${scheduledPubs?.length ?? 0} publication(s) a envoyer`);

  const { publishToChannel } = await import("@/lib/publishing/publisher");
  let processed = 0;
  let failed = 0;

  for (const pub of scheduledPubs ?? []) {
    try {
      const { data: community } = await admin
        .from("Community")
        .select("city,country,timezone")
        .eq("id", pub.communityId)
        .single();
      if (community) {
        const guarded = await resolveAllowedPublishTime(new Date(pub.scheduledAt ?? now), community);
        if (guarded.adjusted && guarded.publishAt > now) {
          await admin
            .from("Publication")
            .update({
              scheduledAt: guarded.publishAt.toISOString(),
              metadata: {
                ...(pub.metadata && typeof pub.metadata === "object" ? pub.metadata : {}),
                observanceAdjusted: true,
                observanceReason: guarded.reason,
              },
              updatedAt: now.toISOString(),
            })
            .eq("id", pub.id);
          continue;
        }
      }
      await publishToChannel(pub as Publication & { channel: Channel });
      processed += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      failed += 1;
      console.error(`[Scheduled Publications] Erreur publication ${pub.id}:`, error);
    }
  }

  return { processed, failed };
}
