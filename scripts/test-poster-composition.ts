import assert from "node:assert/strict";
import sharp from "sharp";
import {
  PosterCompositionError,
  detectTextDirection,
  hashTextBlocks,
  minimumFontSize,
  normalizeFixedText,
  renderPosterPlanDeterministically,
  validateCompositionPlanInput,
  validatePosterCompositionPlan,
  validateTextBlocks,
  type PosterCompositionPlan,
  type PosterTextBlock,
} from "../src/lib/templates/composition";
import {
  buildFreePosterTextBlocks,
  buildStructuredPosterTextBlocks,
} from "../src/lib/templates/input-blocks";

async function main() {
  const blocks: PosterTextBlock[] = validateTextBlocks([
    { id: "title", text: "Grand allumage de Hanoucca", role: "title", priority: "main" },
    { id: "date", text: "יום ראשון 29 בדצמבר", role: "date", priority: "important" },
  ]);
  assert.deepEqual(
    buildStructuredPosterTextBlocks(
      [{ id: "title", role: "title", priority: "main" }],
      { title: "  Texte exact  " },
    ),
    [{ id: "title", text: "  Texte exact  ", role: "title", priority: "main" }],
  );
  assert.deepEqual(
    buildFreePosterTextBlocks("Premier paragraphe\n\nשורה שנייה"),
    [
      { id: "paragraph_1", text: "Premier paragraphe", role: "title", priority: "main" },
      { id: "paragraph_2", text: "שורה שנייה", role: "paragraph", priority: "important" },
    ],
  );
  assert.equal(hashTextBlocks(blocks), hashTextBlocks(structuredClone(blocks)));
  assert.notEqual(hashTextBlocks(blocks), hashTextBlocks([{ ...blocks[0], text: `${blocks[0].text}!` }, blocks[1]]));

  assert.equal(normalizeFixedText(" HANOUCAH! "), normalizeFixedText("hanoucah"));
  assert.notEqual(normalizeFixedText("HANOUCAH"), normalizeFixedText("Grand allumage de Hanoucca"));
  assert.equal(detectTextDirection("Dimanche"), "ltr");
  assert.equal(detectTextDirection("יום ראשון"), "rtl");
  assert.equal(detectTextDirection("Dimanche יום ראשון"), "bilingual");
  assert.equal(minimumFontSize("complementary", 2480, 3508), 75);
  assert.equal(minimumFontSize("complementary", 1080, 1080), 33);

  assert.throws(
    () => validateCompositionPlanInput({
      detectedFixedTexts: [],
      protectedRegions: [],
      elements: [{
        blockId: "title",
        text: "interdit",
        x: 60,
        y: 80,
        width: 960,
        height: 120,
        fontFamily: "noto-sans",
        fontSize: 56,
        fontWeight: 800,
        color: "#FFFFFF",
        alignment: "center",
        lineHeight: 1.1,
        letterSpacing: 0,
      }],
    }),
    PosterCompositionError,
  );

  const plan: PosterCompositionPlan = {
    detectedFixedTexts: [{ text: "HANOUCAH", x: 80, y: 20, width: 300, height: 40 }],
    protectedRegions: [{ kind: "text", description: "Titre fixe", x: 80, y: 20, width: 300, height: 40 }],
    elements: [
      {
        blockId: "title",
        x: 60,
        y: 180,
        width: 960,
        height: 150,
        fontFamily: "noto-sans",
        fontSize: 56,
        fontWeight: 800,
        color: "#FFFFFF",
        alignment: "center",
        lineHeight: 1.1,
        letterSpacing: 0,
        outline: { color: "#000000", width: 2 },
      },
      {
        blockId: "date",
        x: 120,
        y: 720,
        width: 840,
        height: 130,
        fontFamily: "noto-sans",
        fontSize: 42,
        fontWeight: 700,
        color: "#FFFFFF",
        alignment: "center",
        lineHeight: 1.15,
        letterSpacing: 0,
        shadow: { color: "#000000", opacity: 0.3, offsetX: 1, offsetY: 2, blur: 4 },
      },
    ],
  };
  const alreadyPresent = validatePosterCompositionPlan({ plan, blocks, width: 1080, height: 1080 });
  assert.deepEqual(alreadyPresent, []);

  const sourceBuffer = await sharp({
    create: { width: 1080, height: 1080, channels: 4, background: "#2f4858" },
  }).png().toBuffer();
  const outputBuffer = await renderPosterPlanDeterministically({
    sourceBuffer,
    plan,
    blocks,
    width: 1080,
    height: 1080,
  });
  const outputMetadata = await sharp(outputBuffer).metadata();
  assert.equal(outputMetadata.width, 1080);
  assert.equal(outputMetadata.height, 1080);
  assert.notDeepEqual(outputBuffer, sourceBuffer);
  const jpegSource = await sharp({
    create: { width: 1080, height: 1080, channels: 3, background: "#2f4858" },
  }).jpeg({ quality: 91 }).toBuffer();
  const jpegOutput = await renderPosterPlanDeterministically({
    sourceBuffer: jpegSource,
    plan,
    blocks,
    width: 1080,
    height: 1080,
  });
  assert.equal((await sharp(jpegOutput).metadata()).format, "png");

  const duplicatePlan: PosterCompositionPlan = {
    detectedFixedTexts: [{ text: "Grand allumage de Hanoucca", x: 50, y: 50, width: 500, height: 80 }],
    protectedRegions: [],
    elements: [plan.elements[1]],
  };
  assert.deepEqual(
    validatePosterCompositionPlan({ plan: duplicatePlan, blocks, width: 1080, height: 1080 }),
    ["title"],
  );

  const tooLongPlan: PosterCompositionPlan = {
    detectedFixedTexts: [],
    protectedRegions: [],
    elements: [{
      ...plan.elements[0],
      blockId: "long",
      height: 60,
      fontSize: 49,
      outline: undefined,
    }],
  };
  assert.throws(
    () => validatePosterCompositionPlan({
      plan: tooLongPlan,
      blocks: [{ id: "long", text: "Texte très long ".repeat(80), role: "details", priority: "main" }],
      width: 1080,
      height: 1080,
    }),
    (error) => error instanceof PosterCompositionError && error.code === "TEXT_TOO_LONG",
  );

  console.log("Poster composition tests passed");
}

void main();
