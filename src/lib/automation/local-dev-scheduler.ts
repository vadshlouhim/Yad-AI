import { runAutomationEngine } from "@/lib/automation/engine";

const globalForAutomation = globalThis as typeof globalThis & {
  __easycomAutomationScheduler?: {
    running: boolean;
    interval: NodeJS.Timeout;
  };
};

if (!globalForAutomation.__easycomAutomationScheduler) {
  const state = {
    running: false,
    interval: setInterval(async () => {
      if (state.running) return;
      state.running = true;
      try {
        await runAutomationEngine();
      } catch (error) {
        console.error("[Automation Local Scheduler] Erreur:", error);
      } finally {
        state.running = false;
      }
    }, 30_000),
  };

  state.interval.unref?.();
  globalForAutomation.__easycomAutomationScheduler = state;
  console.log("[Automation Local Scheduler] Actif en developpement toutes les 30 secondes.");
}
