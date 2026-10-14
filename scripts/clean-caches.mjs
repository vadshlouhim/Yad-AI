import { readdir, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedDirectories = [
  ".next",
  ".netlify",
  ".tmp/design-captures",
  ".tmp/design-profile",
  "tmp/home-qa",
  "tmp/pdfs",
];
const allowedFiles = [
  "tsconfig.tsbuildinfo",
  "tmp/dashboard-colors-qa.cjs",
  "tmp/home-dialog-navigation-qa.cjs",
  "tmp/home-gradient-qa.cjs",
  "tmp/home-supabase-qa.cjs",
  "tmp/home-visual-qa.cjs",
];

function resolveAllowedPath(relativePath) {
  const absolutePath = resolve(projectRoot, relativePath);
  if (!absolutePath.startsWith(`${projectRoot}${sep}`)) {
    throw new Error(`Refusing to remove a path outside the project: ${absolutePath}`);
  }
  return absolutePath;
}

async function remove(relativePath, options) {
  await rm(resolveAllowedPath(relativePath), { force: true, ...options });
  console.log(`Removed ${relativePath}`);
}

const rootEntries = await readdir(projectRoot, { withFileTypes: true });
const nextCacheDirectories = rootEntries
  .filter((entry) => entry.isDirectory() && /^\.next-[A-Za-z0-9._-]+$/.test(entry.name))
  .map((entry) => entry.name);

for (const directory of [...allowedDirectories, ...nextCacheDirectories]) {
  await remove(directory, { recursive: true });
}

for (const file of allowedFiles) {
  await remove(file);
}

const logNamePattern = /^(?:\.next|\.whatsapp-service).+\.(?:out|err|stdout|stderr)\.log$/;

for (const entry of rootEntries) {
  if (entry.isFile() && logNamePattern.test(entry.name)) {
    await remove(entry.name);
  }
}
