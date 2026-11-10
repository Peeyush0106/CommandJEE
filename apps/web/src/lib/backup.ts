import type { State } from "./store";

export function exportBackup(state: State) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  a.href = url;
  a.download = `commandjee-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
