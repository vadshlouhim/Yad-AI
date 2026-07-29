import { config } from "dotenv";
import sharp from "sharp";
import { composePosterWithVisualValidation } from "../src/lib/templates/composition";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const sourceBuffer = await sharp({
    create: { width: 640, height: 800, channels: 4, background: "#17324d" },
  })
    .composite([{
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800">
        <rect x="32" y="32" width="576" height="736" rx="8" fill="none" stroke="#d7b56d" stroke-width="4"/>
        <circle cx="320" cy="160" r="72" fill="#f2c14e"/>
      </svg>`),
    }])
    .png()
    .toBuffer();
  const originalUrl = `data:image/png;base64,${sourceBuffer.toString("base64")}`;
  const result = await composePosterWithVisualValidation({
    originalUrl,
    sourceBuffer,
    blocks: [{
      id: "title",
      text: "Grand allumage de Hanoucca",
      role: "title",
      priority: "main",
    }],
  });
  console.log(JSON.stringify({
    score: result.visualReport.score,
    attemptsPassed: result.visualReport.passed,
    textHash: result.textHash.slice(0, 16),
    dimensions: `${result.width}x${result.height}`,
  }));
}

void main();
