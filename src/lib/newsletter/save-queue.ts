/** At most one server write in flight; newer pending drafts replace older ones. */
export function createDraftSaveQueue<T>(save: (draft: T) => Promise<void>) {
  let pending: T | undefined;
  let running: Promise<void> | undefined;
  return {
    push(draft: T): Promise<void> {
      pending = draft;
      if (!running) {
        running = (async () => {
          // Let push assign running before a synchronously failing save.
          await Promise.resolve();
          try {
            while (pending !== undefined) {
              const next = pending;
              pending = undefined;
              await save(next);
            }
          } finally {
            running = undefined;
          }
        })();
      }
      return running;
    },
  };
}
