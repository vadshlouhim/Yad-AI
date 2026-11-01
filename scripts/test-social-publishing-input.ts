import assert from "node:assert/strict";
import {
  hasSocialComposerContent,
  getSelectedSocialTextLengthError,
  fitHashtagsWithinTextLimit,
  normalizeSelectedSocialTexts,
  truncateSocialComposerText,
  resolveManualPublishText,
  resolveSocialComposerTexts,
  selectSocialComposerTexts,
} from "../src/lib/publishing/social-composer-content";
import { splitTelegramText } from "../src/lib/publishing/adapters/telegram";

const emptyVersions = { FACEBOOK: "", INSTAGRAM: "" };

const manualText = resolveSocialComposerTexts("  Annonce saisie manuellement  ", emptyVersions);
assert.deepEqual(manualText, {
  FACEBOOK: "Annonce saisie manuellement",
  INSTAGRAM: "Annonce saisie manuellement",
});
assert.equal(hasSocialComposerContent(["FACEBOOK"], manualText, []), true);

const generatedVersions = resolveSocialComposerTexts("Idée initiale", {
  FACEBOOK: "Version Facebook",
  INSTAGRAM: "Version Instagram",
});
assert.deepEqual(generatedVersions, {
  FACEBOOK: "Version Facebook",
  INSTAGRAM: "Version Instagram",
});

const incompleteGeneration = resolveSocialComposerTexts("Texte de secours", {
  FACEBOOK: "Version Facebook",
  INSTAGRAM: "",
});
assert.equal(incompleteGeneration.INSTAGRAM, "Texte de secours");

assert.equal(hasSocialComposerContent(["FACEBOOK"], emptyVersions, ["https://example.com/photo.jpg"]), true);
assert.equal(hasSocialComposerContent(["FACEBOOK", "INSTAGRAM"], emptyVersions, []), false);
assert.equal(resolveManualPublishText("Texte de départ Facebook", ""), "Texte de départ Facebook");
assert.equal(resolveManualPublishText("Prompt Telegram", "Message Telegram préparé"), "Message Telegram préparé");
assert.equal(resolveManualPublishText("  Légende Instagram  ", ""), "Légende Instagram");

const longFacebookPost = resolveSocialComposerTexts("F".repeat(8_562), emptyVersions);
const selectedLongFacebookPost = selectSocialComposerTexts(["FACEBOOK"], longFacebookPost);
assert.deepEqual(Object.keys(selectedLongFacebookPost), ["FACEBOOK"]);
assert.equal(selectedLongFacebookPost.FACEBOOK?.length, 8_562);
assert.equal(selectedLongFacebookPost.INSTAGRAM, undefined);
assert.equal(getSelectedSocialTextLengthError(["FACEBOOK"], longFacebookPost), null);
assert.equal(
  getSelectedSocialTextLengthError(["INSTAGRAM"], longFacebookPost),
  null,
);
const legacyLongPayload = { FACEBOOK: "F".repeat(8_562), INSTAGRAM: "I".repeat(8_562) };
assert.equal(normalizeSelectedSocialTexts(["FACEBOOK"], legacyLongPayload).FACEBOOK?.length, 8_562);
assert.equal(normalizeSelectedSocialTexts(["FACEBOOK"], legacyLongPayload).INSTAGRAM, undefined);
assert.equal(normalizeSelectedSocialTexts(["INSTAGRAM"], legacyLongPayload).INSTAGRAM?.length, 2_200);
const telegramChunks = splitTelegramText("mot ".repeat(2_500));
assert.equal(telegramChunks.length > 1, true);
assert.equal(telegramChunks.every((chunk) => chunk.length <= 4_096), true);
assert.equal(telegramChunks.join(" ").replace(/\s+/g, " ").trim(), "mot ".repeat(2_500).trim());
assert.deepEqual(fitHashtagsWithinTextLimit("A".repeat(2_190), ["#un", "#deux"], 2_200), ["#un"]);
const emojiBoundaryText = `${"A".repeat(2_198)}😀suite`;
const truncatedEmojiText = truncateSocialComposerText("INSTAGRAM", emojiBoundaryText);
assert.equal(truncatedEmojiText.length <= 2_200, true);
assert.equal(truncatedEmojiText.includes("�"), false);
assert.equal(truncateSocialComposerText("FACEBOOK", "F".repeat(256_000)).length, 63_206);

console.log("Social publishing input tests passed (23 scenarios).");
