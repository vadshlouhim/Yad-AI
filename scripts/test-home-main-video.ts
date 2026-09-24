import assert from "node:assert/strict";
import { MAIN_VIDEO_URL } from "../src/components/home/home-media";

function main() {
  const videoUrl = new URL(MAIN_VIDEO_URL);
  assert.equal(videoUrl.protocol, "https:");
  assert.equal(videoUrl.hostname, "xicipkwqvuoaavvdgnnb.supabase.co");
  assert.equal(videoUrl.pathname, "/storage/v1/object/public/Video%20du%20site/Accueil%20principal%202026-09-23.mp4");
  console.log("Main video tests passed: public Supabase Storage URL and unique cache-safe object path.");
}
main();
