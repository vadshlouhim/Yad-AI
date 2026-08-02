import assert from "node:assert/strict";
import sharp from "sharp";
import {
  PosterCompositionError,
  PosterLayoutValidationError,
  detectTextDirection,
  findDefinitelyOverflowingBlockIds,
  getBlockPlacementRequirements,
  hashTextBlocks,
  minimumFontSize,
  normalizeFixedText,
  repairPosterCompositionPlan,
  renderPosterPlanDeterministically,
  wrapExactText,
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
import {
  buildAdaptivePosterTextVariants,
  buildFallbackCuratedPosterTextBlocks,
  validateCuratedPosterTextBlocks,
} from "../src/lib/templates/curation";

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
  const verboseSources: PosterTextBlock[] = [{
    id: "description",
    text: "Bonjour à tous. Grande soirée communautaire. Dimanche 18 août à 19h30. Salle des fêtes. Réservez votre place. Nous sommes très heureux de vous retrouver pour ce merveilleux moment avec toute la communauté.",
    role: "description",
    priority: "main",
  }];
  const curated = validateCuratedPosterTextBlocks({
    blocks: [
      { sourceId: "description", text: "Grande soirée communautaire.", role: "title" },
      { sourceId: "description", text: "Dimanche 18 août à 19h30.", role: "date" },
      { sourceId: "description", text: "Salle des fêtes.", role: "location" },
      { sourceId: "description", text: "Réservez votre place.", role: "action" },
    ],
  }, verboseSources);
  assert.deepEqual(curated?.map(({ text, priority }) => ({ text, priority })), [
    { text: "Grande soirée communautaire.", priority: "main" },
    { text: "Dimanche 18 août à 19h30.", priority: "important" },
    { text: "Salle des fêtes.", priority: "important" },
    { text: "Réservez votre place.", priority: "complementary" },
  ]);
  assert.equal(validateCuratedPosterTextBlocks({
    blocks: [{ sourceId: "description", text: "Entrée gratuite", role: "action" }],
  }, verboseSources), null, "Une information inventée doit être rejetée");
  const fallbackCurated = buildFallbackCuratedPosterTextBlocks(verboseSources);
  assert.ok(fallbackCurated.length <= 5);
  assert.ok(fallbackCurated.reduce((total, block) => total + block.text.length, 0) <= 300);
  assert.ok(fallbackCurated.every((block) => verboseSources[0].text.includes(block.text)));
  assert.ok(fallbackCurated.every((block) => !block.text.startsWith("Bonjour")));
  const adaptiveVariants = buildAdaptivePosterTextVariants(curated ?? fallbackCurated);
  assert.equal(adaptiveVariants.length, 2);
  assert.ok(adaptiveVariants[0].length <= 4);
  assert.ok(adaptiveVariants[1].length <= 2);
  assert.equal(adaptiveVariants[0][0].priority, "main");
  assert.match(adaptiveVariants[1][1].text, /Dimanche 18 août/);
  assert.match(adaptiveVariants[1][1].text, /Salle des fêtes/);
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
  assert.deepEqual(findDefinitelyOverflowingBlockIds(blocks, 1080, 1080), []);
  assert.deepEqual(
    wrapExactText("Vendredi 18h00\n21 rue des Rosiers", 900, 40, 0),
    ["Vendredi 18h00", "21 rue des Rosiers"],
  );
  const placementRequirements = getBlockPlacementRequirements(blocks, 1080, 1080);
  assert.deepEqual(placementRequirements.map((requirement) => requirement.blockId), ["title", "date"]);
  assert.ok(placementRequirements.every((requirement) => requirement.minimumHeightAtFullWidth > 0));
  assert.deepEqual(
    findDefinitelyOverflowingBlockIds(
      [{ id: "impossible", text: "Information ".repeat(2_000), role: "details", priority: "complementary" }],
      1080,
      1080,
    ),
    ["impossible"],
  );

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
    (error) => error instanceof PosterLayoutValidationError && error.code === "BOX_TOO_SMALL",
  );

  const fontTooSmallPlan: PosterCompositionPlan = {
    ...plan,
    elements: [{
      ...plan.elements[0],
      fontSize: 20,
      outline: undefined,
    }],
  };
  assert.throws(
    () => validatePosterCompositionPlan({
      plan: fontTooSmallPlan,
      blocks: [blocks[0]],
      width: 1080,
      height: 1080,
    }),
    (error) => error instanceof PosterLayoutValidationError && error.code === "FONT_BELOW_MINIMUM",
  );
  const repairedPlan = repairPosterCompositionPlan({
    plan: {
      ...fontTooSmallPlan,
      elements: [{
        ...fontTooSmallPlan.elements[0],
        height: 20,
        shadow: { color: "#000000", opacity: 0.9, offsetX: 30, offsetY: 30, blur: 30 },
      }],
    },
    blocks: [blocks[0]],
    width: 1080,
    height: 1080,
  });
  assert.ok(repairedPlan.elements[0].fontSize >= minimumFontSize("main", 1080, 1080));
  assert.ok(repairedPlan.elements[0].height > 20);
  assert.ok((repairedPlan.elements[0].shadow?.opacity ?? 0) <= 0.35);
  assert.doesNotThrow(() => validatePosterCompositionPlan({
    plan: repairedPlan,
    blocks: [blocks[0]],
    width: 1080,
    height: 1080,
  }));

  const longButRepairableBlock: PosterTextBlock = {
    id: "details",
    text: "Vendredi 18h00 dîner communautaire ouvert à tous sur inscription",
    role: "details",
    priority: "complementary",
  };
  const oversizedTextPlan: PosterCompositionPlan = {
    detectedFixedTexts: [],
    protectedRegions: [],
    elements: [{
      blockId: "details",
      x: 380,
      y: 430,
      width: 320,
      height: 180,
      fontFamily: "noto-sans",
      fontSize: 72,
      fontWeight: 700,
      color: "#FFFFFF",
      alignment: "center",
      lineHeight: 1.1,
      letterSpacing: 0,
    }],
  };
  const fittedTextPlan = repairPosterCompositionPlan({
    plan: oversizedTextPlan,
    blocks: [longButRepairableBlock],
    width: 1080,
    height: 1080,
  });
  assert.ok(fittedTextPlan.elements[0].fontSize < oversizedTextPlan.elements[0].fontSize);
  assert.equal(fittedTextPlan.elements[0].height, oversizedTextPlan.elements[0].height);
  assert.doesNotThrow(() => validatePosterCompositionPlan({
    plan: fittedTextPlan,
    blocks: [longButRepairableBlock],
    width: 1080,
    height: 1080,
  }));

  const missingBlockPlan: PosterCompositionPlan = {
    ...plan,
    elements: [plan.elements[0]],
  };
  assert.throws(
    () => validatePosterCompositionPlan({
      plan: missingBlockPlan,
      blocks,
      width: 1080,
      height: 1080,
    }),
    (error) => error instanceof PosterLayoutValidationError
      && error.code === "MISSING_BLOCKS"
      && error.blockId === "date",
  );

  console.log("Poster composition tests passed");
}

void main();
