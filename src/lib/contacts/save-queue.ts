import type { MemberInput } from "./normalize";
import type { CommunityMember } from "./crm";
export type SaveState = { pending: MemberInput[]; running: boolean; error: string | null };

/** A failed write blocks later writes for this contact until an explicit retry. */
export class ContactSaveQueue {
  private rows = new Map<string, SaveState>();
  constructor(private send: (id: string, patch: MemberInput) => Promise<CommunityMember>, private changed: (id: string, state: SaveState, saved?: CommunityMember) => void) {}
  enqueue(id: string, patch: MemberInput) {
    const row = this.rows.get(id) ?? { pending: [], running: false, error: null };
    row.pending.push(patch); this.rows.set(id, row);
    this.emit(id, row);
    if (!row.running && !row.error) void this.drain(id, row);
  }
  retry(id: string) {
    const row = this.rows.get(id);
    if (!row || row.running) return;
    row.error = null; void this.drain(id, row);
  }
  private emit(id: string, row: SaveState, saved?: CommunityMember) { this.changed(id, { ...row, pending: [...row.pending] }, saved); }
  private async drain(id: string, row: SaveState) {
    row.running = true; this.emit(id, row);
    while (row.pending.length) {
      try {
        const saved = await this.send(id, row.pending[0]);
        row.pending.shift(); this.emit(id, row, saved);
      } catch (error) {
        row.error = error instanceof Error ? error.message : "Sauvegarde impossible.";
        break;
      }
    }
    row.running = false; this.emit(id, row);
  }
}
