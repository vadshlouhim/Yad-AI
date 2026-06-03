import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log("Connecting to Supabase at:", supabaseUrl);
  
  // 1. Get first profile
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .limit(1);
    
  if (profileError) {
    console.error("Error reading profiles:", profileError);
    return;
  }
  
  console.log("Profiles found:", profiles?.length);
  if (!profiles || profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }
  
  const profile = profiles[0];
  console.log("Using Profile:", { id: profile.id, email: profile.email, communityId: profile.communityId });
  
  if (!profile.communityId) {
    console.log("Profile has no communityId");
    return;
  }
  
  // 2. Query Community
  const { data: community, error: communityError } = await admin
    .from("Community")
    .select("id, name, slug, description, logoUrl, city, country, timezone, phone, email, website, address, postalCode, tone, language, signature, hashtags, mentions, editorialRules, communityType, religiousStream, onboardingDone, plan")
    .eq("id", profile.communityId)
    .single();
    
  if (communityError) {
    console.error("Error reading Community:", communityError);
    return;
  }
  
  console.log("Community found:", community.name, "Plan:", community.plan);
  
  console.log("Community type:", community.communityType);
}

test();
