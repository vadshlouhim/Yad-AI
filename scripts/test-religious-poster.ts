import assert from "node:assert/strict";
import sharp from "sharp";
import { extractPosterPalette, posterContrastRatio } from "../src/lib/religious/poster-overlay";

function fromHex(value: string) {
  const normalized = value.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

async function solidBackground(color: string) {
  return sharp({ create: { width: 1080, height: 1350, channels: 4, background: color } }).png().toBuffer();
}

async function main() {
  const white = { r: 255, g: 255, b: 255 };
  const gold = await extractPosterPalette(await solidBackground("#c79b52"));
  const blue = await extractPosterPalette(await solidBackground("#39799a"));
  const neutral = await extractPosterPalette(await solidBackground("#f3efe8"));

  for (const [name, palette] of Object.entries({ gold, blue, neutral })) {
    assert.match(palette.primary, /^#[0-9a-f]{6}$/i, `${name}: primary colour is valid`);
    assert.match(palette.accent, /^#[0-9a-f]{6}$/i, `${name}: accent colour is valid`);
    assert.ok(posterContrastRatio(fromHex(palette.primary), white) >= 4.8, `${name}: primary text stays readable on the panel`);
    assert.ok(posterContrastRatio(fromHex(palette.accent), white) >= 4.8, `${name}: accent text stays readable on the panel`);
  }

  assert.notEqual(gold.accent, blue.accent, "different template palettes produce different accents");
  assert.notEqual(gold.primary, "#24173d", "the old hard-coded purple is no longer used");
  assert.notEqual(neutral.accent, "#24173d", "neutral templates use the warm fallback rather than unrelated purple");
  console.log("Religious poster palette: template-aware colours and contrast safeguards passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
