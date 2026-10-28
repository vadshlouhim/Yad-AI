import assert from "node:assert/strict";
import sharp from "sharp";
import { compositeOfficialLogo, removeUniformBackground } from "../src/lib/templates/logo-overlay";
import { getTemplateLogoZone, parseLogoZone, withLogoZone } from "../src/lib/templates/logo-zone";

const svg = (body: string, width = 200, height = 120) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`);
const pixelAt = async (buffer: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
};

async function main() {
  // A logo on a white square: the white around it disappears, the white inside the ring stays.
  const whiteLogo = await sharp(svg('<rect width="200" height="120" fill="#ffffff"/><circle cx="100" cy="60" r="40" fill="#c0262d"/><circle cx="100" cy="60" r="15" fill="#ffffff"/>')).png().toBuffer();
  const cleaned = await removeUniformBackground(whiteLogo);
  const meta = await sharp(cleaned).metadata();
  assert.ok(meta.width! <= 84 && meta.height! <= 84, `the empty margin is trimmed (got ${meta.width}x${meta.height})`);
  assert.equal((await pixelAt(cleaned, 0, 0))[3], 0, "the white background becomes transparent");
  const centre = await pixelAt(cleaned, Math.floor(meta.width! / 2), Math.floor(meta.height! / 2));
  assert.equal(centre[3], 255, "white enclosed by the logo is kept");

  // A coloured plain background is removed too.
  const blueLogo = await sharp(svg('<rect width="200" height="120" fill="#1d3f8f"/><rect x="60" y="30" width="80" height="60" fill="#f5c400"/>')).png().toBuffer();
  const blueMeta = await sharp(await removeUniformBackground(blueLogo)).metadata();
  assert.deepEqual([blueMeta.width, blueMeta.height], [80, 60], "a single-colour background is removed and trimmed");

  // A gradient (no single background colour) is left untouched.
  const gradient = await sharp(svg('<defs><linearGradient id="g"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="200" height="120" fill="url(#g)"/>')).png().toBuffer();
  const kept = await removeUniformBackground(gradient);
  assert.equal((await pixelAt(kept, 0, 0))[3], 255, "a complex background is kept");
  assert.equal((await sharp(kept).metadata()).width, 200, "a complex background is not trimmed");

  // Placement: centred in the template's zone, with no white plate around it.
  const poster = await sharp({ create: { width: 1000, height: 1250, channels: 4, background: "#204060" } }).png().toBuffer();
  const zone = { x: 0.05, y: 0.04, width: 0.2, height: 0.12 };
  const placed = await compositeOfficialLogo(poster, whiteLogo, zone);
  const zoneCorner = await pixelAt(placed.buffer, 52, 52);
  assert.deepEqual(zoneCorner.slice(0, 3), [32, 64, 96], "no white box: the poster shows through around the logo");
  const zoneCentre = await pixelAt(placed.buffer, Math.round((zone.x + zone.width / 2) * 1000), Math.round((zone.y + zone.height / 2) * 1250));
  assert.ok(zoneCentre[0] > 150, "the logo sits in the middle of the zone");
  const topRight = await pixelAt(placed.buffer, 960, 40);
  assert.deepEqual(topRight.slice(0, 3), [32, 64, 96], "nothing is added in the top-right corner when a zone exists");

  // Without a zone the logo still goes top-right, without plate.
  const fallback = await compositeOfficialLogo(poster, whiteLogo);
  const fallbackCorner = await pixelAt(fallback.buffer, 1000 - 26, 26);
  assert.deepEqual(fallbackCorner.slice(0, 3), [32, 64, 96], "no white plate in the top-right fallback");

  // Zone storage in the template design.
  assert.equal(parseLogoZone({ x: 0.9, y: 0, width: 0.2, height: 0.1 }), null, "a zone outside the image is refused");
  const design = withLogoZone([{ type: "other" }], zone);
  assert.deepEqual(getTemplateLogoZone({ design }), zone);
  assert.deepEqual(withLogoZone(design, null), [{ type: "other" }], "clearing the zone keeps other design entries");

  console.log("Logo overlay: background removal, zone placement and zone storage passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
