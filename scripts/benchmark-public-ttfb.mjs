// Run against the same warmed production server before and after the change.
// Headers received by Node fetch approximate TTFB (not full page load time).
import { performance } from "node:perf_hooks";

const origin = process.argv[2] || "http://127.0.0.1:3100";
const results = [];
for (const path of ["/", "/method", "/contact"]) {
  for (let warmup = 0; warmup < 3; warmup++) {
    const response = await fetch(new URL(path, origin));
    await response.arrayBuffer();
  }
  const samples = [];
  for (let index = 0; index < 20; index++) {
    const start = performance.now();
    const response = await fetch(new URL(path, origin), { redirect: "manual" });
    samples.push(performance.now() - start);
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
    await response.arrayBuffer();
  }
  const sorted = [...samples].sort((a, b) => a - b);
  results.push({
    path,
    requests: samples.length,
    medianMs: Number(((sorted[9] + sorted[10]) / 2).toFixed(2)),
    p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)),
    samplesMs: samples.map((value) => Number(value.toFixed(2))),
  });
}
console.log(JSON.stringify({ origin, results }, null, 2));
