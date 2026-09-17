import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getImageProps } = require("next/image");
const ts = require("typescript");
const fixtures = [
  { src: "/agents/dov-ber-transparent.png", width: 54, height: 75, sizes: "3.35rem" },
  { src: "/agents/mendy-transparent.png", width: 64, height: 80, sizes: "4rem" },
  { src: "/agents/avi-transparent.png", width: 79, height: 98, sizes: "4.9rem" },
  { src: "/agents/david-transparent.png", width: 94, height: 137, sizes: "94px" },
];
for (const fixture of fixtures) {
  const { props } = getImageProps({ ...fixture, alt: "", "aria-hidden": "true" });
  assert.equal(props.loading, "lazy");
  assert.equal(props.sizes, fixture.sizes);
  assert.equal(props.alt, "");
  assert.equal(props["aria-hidden"], "true");
  assert.ok(props.src.startsWith("/_next/image?"));
  assert.ok(props.srcSet.includes("&q=75"));
  assert.equal(props.width, fixture.width);
  assert.equal(props.height, fixture.height);
}
for (const [file, expectedCount] of [
  ["../src/components/layout/sidebar.tsx", 4],
  ["../src/components/dashboard/mobile-dashboard-home.tsx", 1],
]) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let count = 0;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "Image") {
      count++;
      const attributes = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => [attribute.name.getText(source), attribute.initializer]));
      for (const name of ["src", "width", "height", "sizes", "alt", "aria-hidden", "className"]) assert.ok(attributes.has(name), `${file}: missing ${name}`);
      for (const name of ["priority", "preload", "unoptimized", "quality"]) assert.ok(!attributes.has(name), `${file}: unexpected ${name}`);
      assert.equal(attributes.get("alt").text, "");
      assert.equal(attributes.get("aria-hidden").text, "true");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(count, expectedCount, file);
}
console.log("Dashboard image tests passed: agent components optimized, dimensions/sizes/accessibility present, lazy loading and default quality retained.");
