import assert from "node:assert/strict";
import sharp from "sharp";
import type { PosterTextBlock } from "../src/lib/templates/composition";
import { buildAdaptiveTextOverlaySvg } from "../src/lib/templates/text-layout";
import {
  assignPosterTextBlocksToZones,
  buildBlocksFromZoneTexts,
  normalizeTemplateZones,
  validateTemplateZoneGeometry,
} from "../src/lib/templates/zones";

async function main() {
  const zones = normalizeTemplateZones([
    {
      id: "title_zone",
      label: "Titre principal",
      variableKey: "TITLE",
      x: 18,
      y: 38,
      width: 64,
      height: 13,
      align: "center",
      fontSize: 64,
      minFontSize: 24,
      color: "#FFFFFF",
      priority: "main",
      maxCharacters: 72,
      locked: true,
    },
    {
      id: "details_zone",
      label: "Informations pratiques",
      variableKey: "MESSAGE",
      x: 22,
      y: 57,
      width: 56,
      height: 18,
      align: "center",
      fontSize: 42,
      minFontSize: 18,
      color: "#FFFFFF",
      priority: "important",
      maxCharacters: 110,
    },
  ]);
  assert.equal(zones.length, 2);
  assert.equal(zones[0].locked, true);
  assert.deepEqual(validateTemplateZoneGeometry(zones), []);

  const blocks: PosterTextBlock[] = [
    { id: "title", text: "Grand allumage de Hannoucah", role: "title", priority: "main" },
    { id: "date", text: "Dimanche 18 décembre", role: "date", priority: "important" },
    { id: "time", text: "À 19h30", role: "time", priority: "important" },
    { id: "location", text: "Place de la République", role: "location", priority: "important" },
    { id: "details", text: "Buffet, musique, cadeaux et nombreuses autres informations secondaires qui ne doivent pas surcharger l’affiche", role: "details", priority: "complementary" },
  ];
  const assignment = assignPosterTextBlocksToZones(zones, blocks);
  assert.equal(assignment.zoneTexts.title_zone, "Grand allumage de Hannoucah");
  assert.match(assignment.zoneTexts.details_zone, /Dimanche 18 décembre/);
  assert.match(assignment.zoneTexts.details_zone, /19h30/);
  assert.ok(assignment.omittedBlockIds.includes("details"));
  assert.ok(assignment.warnings.some((warning) => warning.includes("secondaire")));

  const overlay = buildAdaptiveTextOverlaySvg(zones, assignment.zoneTexts, 1414, 2000);
  assert.deepEqual(overlay.omittedZoneIds, []);
  assert.equal(Object.keys(overlay.renderedTexts).length, 2);
  const source = await sharp({
    create: { width: 1414, height: 2000, channels: 4, background: "#541054" },
  }).png().toBuffer();
  const first = await sharp(source).composite([{ input: overlay.buffer, top: 0, left: 0 }]).png().toBuffer();
  const second = await sharp(source).composite([{ input: overlay.buffer, top: 0, left: 0 }]).png().toBuffer();
  assert.deepEqual(first, second, "Le rendu par zones doit être déterministe");

  const corrected = buildBlocksFromZoneTexts(zones, {
    title_zone: "הדלקת נרות חנוכה",
    details_zone: "Dimanche 18 décembre\nÀ 19h30",
    unknown_zone: "Texte interdit",
  });
  assert.equal(corrected.length, 2);
  assert.ok(corrected.some((block) => block.text.includes("הדלקת")));

  console.log("Template zone tests passed");
}

void main();
