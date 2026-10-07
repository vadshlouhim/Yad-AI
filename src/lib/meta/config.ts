import "server-only";

const DEFAULT_META_GRAPH_VERSION = "v25.0";

export function getMetaGraphVersion() {
  const configuredVersion = process.env.META_GRAPH_API_VERSION?.trim();
  return configuredVersion && /^v\d+\.\d+$/.test(configuredVersion)
    ? configuredVersion
    : DEFAULT_META_GRAPH_VERSION;
}

export function getMetaGraphBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}

export function getMetaOAuthDialogUrl() {
  return `https://www.facebook.com/${getMetaGraphVersion()}/dialog/oauth`;
}
