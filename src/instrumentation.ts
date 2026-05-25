export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.AUTOMATION_LOCAL_SCHEDULER === "false") return;

  await import("./lib/automation/local-dev-scheduler");
}
