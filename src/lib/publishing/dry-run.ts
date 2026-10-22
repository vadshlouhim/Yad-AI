export function isPublishDryRun(): boolean {
  // Development is safe by default. A developer must explicitly opt out, while
  // production can only use dry-run when it is explicitly enabled.
  return process.env.NODE_ENV === "development"
    ? process.env.PUBLISH_DRY_RUN !== "false"
    : process.env.PUBLISH_DRY_RUN === "true";
}
