import type { Metadata } from "next";
import { PersonalMediaLibraryClient } from "@/components/media-library/personal-media-library-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database.types";

export const metadata: Metadata = { title: "Mes créations — EasyCom IA" };

type PersonalMedia = Tables<"MediaFile"> & { userId?: string | null };

export default async function PersonalMediaLibraryPage() {
  const { profile, supabaseUser } = await requireAuth();
  const admin = createAdminClient();
  const { data } = await admin
    .from("MediaFile")
    .select("*")
    .eq("communityId", profile.communityId!)
    .contains("tags", ["personal-library"])
    .order("createdAt", { ascending: false });
  const images = ((data ?? []) as PersonalMedia[])
    .filter((item) => item.userId === supabaseUser.id)
    .map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      createdAt: item.createdAt,
      width: item.width,
      height: item.height,
    }));

  return <PersonalMediaLibraryClient images={images} />;
}
