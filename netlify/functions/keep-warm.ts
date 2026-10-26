import type { Handler } from "@netlify/functions";

// The site's pages are rendered on demand; after a few idle minutes the first visitor
// waited about 4.6 s for a cold server instead of 0.3–0.6 s. Requesting the public pages
// on a schedule keeps that server warm. Production only.
const PATHS = ["/", "/tarification", "/auth/login"];

export const handler: Handler = async () => {
  const origin = process.env.URL;
  if (process.env.CONTEXT !== "production" || !origin) {
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  const results = await Promise.all(PATHS.map(async (path) => {
    const startedAt = Date.now();
    try {
      const response = await fetch(new URL(path, origin), { headers: { "user-agent": "easycom-keep-warm" } });
      await response.arrayBuffer();
      return { path, status: response.status, ms: Date.now() - startedAt };
    } catch (error) {
      return { path, error: error instanceof Error ? error.message : "fetch failed", ms: Date.now() - startedAt };
    }
  }));

  return { statusCode: 200, body: JSON.stringify({ results }) };
};
