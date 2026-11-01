import assert from "node:assert/strict";
import {
  hasSocialComposerContent,
  resolveManualPublishText,
  resolveSocialComposerTexts,
  selectSocialComposerTexts,
} from "../src/lib/publishing/social-composer-content";

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

console.log("Social publishing input tests passed (11 scenarios).");
