import { config } from "dotenv";
import sharp from "sharp";
import {
  composePosterWithVisualValidation,
  type PosterTextBlock,
} from "../src/lib/templates/composition";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const posterCases: Array<{
    name: string;
    width: number;
    height: number;
    background: string;
    decoration: string;
    blocks: PosterTextBlock[];
  }> = [
    {
      name: "portrait-fr",
      width: 640,
      height: 800,
      background: "#17324d",
      decoration: '<circle cx="320" cy="160" r="72" fill="#f2c14e"/>',
      blocks: [{ id: "title", text: "Grand allumage de Hanoucca", role: "title", priority: "main" }],
    },
    {
      name: "square-he",
      width: 720,
      height: 720,
      background: "#421388",
      decoration: '<circle cx="580" cy="140" r="64" fill="#d9b3ff"/>',
      blocks: [{ id: "title", text: "שיעור תורה השבוע", role: "title", priority: "main" }],
    },
    {
      name: "landscape-bilingual",
      width: 900,
      height: 600,
      background: "#0f766e",
      decoration: '<rect x="70" y="90" width="150" height="150" rx="75" fill="#99f6e4"/>',
      blocks: [
        { id: "title", text: "Cours de Torah — שיעור תורה", role: "title", priority: "main" },
        { id: "date", text: "Dimanche 20h30", role: "date", priority: "important" },
      ],
    },
  ];

  const results = [];
  for (const posterCase of posterCases) {
    const sourceBuffer = await sharp({
      create: {
        width: posterCase.width,
        height: posterCase.height,
        channels: 4,
        background: posterCase.background,
      },
    })
      .composite([{
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${posterCase.width}" height="${posterCase.height}">
          <rect x="32" y="32" width="${posterCase.width - 64}" height="${posterCase.height - 64}" rx="8" fill="none" stroke="#d7b56d" stroke-width="4"/>
          ${posterCase.decoration}
        </svg>`),
      }])
      .png()
      .toBuffer();
    const originalUrl = `data:image/png;base64,${sourceBuffer.toString("base64")}`;
    const result = await composePosterWithVisualValidation({
      originalUrl,
      sourceBuffer,
      blocks: posterCase.blocks,
    });
    results.push({
      name: posterCase.name,
      score: result.visualReport.score,
      passed: result.visualReport.passed,
      dimensions: `${result.width}x${result.height}`,
    });
  }

  console.log(JSON.stringify(results));
}

void main();
