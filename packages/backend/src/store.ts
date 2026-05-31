import type { AssemblyState } from "@cad/shared";

class ProjectStore {
  private state: AssemblyState | null = null;
  get(): AssemblyState | null { return this.state; }
  set(s: AssemblyState): AssemblyState { s.version += 1; this.state = s; return s; }
  reset(): void { this.state = null; }
}

export const store = new ProjectStore();
