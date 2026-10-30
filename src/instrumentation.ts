export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development" &&
    process.env.AUTOMATION_LOCAL_SCHEDULER === "true"
  ) {
    return require("./lib/automation/local-dev-scheduler");
  }
}
