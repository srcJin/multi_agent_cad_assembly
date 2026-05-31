# AssemblyCAD AI — MVP Implementation Plan (v0.4, Node/TS + Weave)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agent-controlled 2D mechanical CAD & simulation workspace that takes a natural-language gearbox request, runs a deterministic Director→Part→Simulation→Validation→Repair pipeline, renders synchronized Drawing/Simulation/Orchestration/Timeline views from one shared Assembly State, and traces the whole pipeline in **W&B Weave**.

**Architecture:** A TypeScript **monorepo** (pnpm workspaces): `shared` (the canonical Assembly State types — single source of truth, imported by both sides), `backend` (Node/Fastify; owns state; deterministic agents + tools, **each wrapped in `weave.op`**; JSCAD geometry), `frontend` (Vite + React; views are pure projections of state fetched from the backend; Zustand mirror). Weave `op` traces any function — so the deterministic agent pipeline produces a full server-side trace tree that mirrors the Orchestration View. LLM is NOT in the loop (scripted determinism, demo-reproducible).

**Tech Stack:** TypeScript 5, pnpm workspaces, Vitest everywhere. Backend: Node 20, Fastify, `@jscad/modeling`, `weave`. Frontend: Vite, React 18, Zustand, React Flow, Planck.js, native SVG, @testing-library/react + jsdom. Gear geometry: JSCAD (`@jscad/modeling`) backend-only. Observability: W&B Weave (Tracing = P0, Evaluation = P1, Monitor = P2).

---

## Key Decisions (locked with user 2026-05-31, mirrors PRD §0)

| Decision | Choice | Rationale |
|---|---|---|
| Agent driver | Scripted deterministic pipeline (no LLM) | 100% reproducible demo |
| Backend | Node / TypeScript (Fastify) | Same language as FE; shared types; no Pydantic codegen |
| Frontend | Vite + React (精简栈) | No Next.js SSR overhead |
| Gear geometry | JSCAD `@jscad/modeling`, backend-only | Genuine CAD lib; FE only renders outline points |
| Type contract | Shared TS package | One source of truth; FE+BE import the same types |
| Observability | **W&B Weave** | Tracing P0, Eval P1, Monitor P2 |

---

## File Structure

`shared` is the seam: the Assembly State type lives there and **both** backend and frontend import it. Backend owns the runtime state; frontend mirrors it; every view derives from it; Weave traces a third projection of the same pipeline.

```
.
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── shared/
│   │   ├── package.json              # name: @cad/shared
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # re-exports
│   │   │   ├── assemblyState.ts      # AssemblyState, Part, Constraint, AgentState, TimelineEvent, ValidationReport, RepairRecord, enums
│   │   │   └── factory.ts            # createEmptyState()
│   │   └── tests/assemblyState.test.ts
│   ├── backend/
│   │   ├── package.json              # name: @cad/backend
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── geometry/
│   │   │   │   ├── gearMath.ts       # pitch/outer/root radius, center distance
│   │   │   │   └── gearGeom.ts       # JSCAD: gear outline points + bore
│   │   │   ├── obs/
│   │   │   │   └── weave.ts          # initObservability(), op() wrapper with offline toggle
│   │   │   ├── tools/registry.ts     # recordToolCall()
│   │   │   ├── agents/
│   │   │   │   ├── types.ts          # AgentContext, AgentResult
│   │   │   │   ├── director.ts
│   │   │   │   ├── layoutPreview.ts
│   │   │   │   ├── partDrawing.ts
│   │   │   │   ├── simulation.ts
│   │   │   │   ├── validation.ts
│   │   │   │   ├── repair.ts
│   │   │   │   └── orchestrator.ts   # runWorkflow / runRepairOnce, op-wrapped
│   │   │   ├── store.ts              # in-memory ProjectStore
│   │   │   ├── routes.ts             # Fastify routes
│   │   │   └── server.ts             # Fastify app + weave.init
│   │   ├── eval/
│   │   │   ├── dataset.ts            # gearbox cases
│   │   │   ├── scorers.ts            # validationPass, repairRounds, centerDistanceError, ...
│   │   │   └── runEval.ts            # weave.Evaluation(...).evaluate({model})
│   │   └── tests/
│   │       ├── gearMath.test.ts
│   │       ├── gearGeom.test.ts
│   │       ├── weave.test.ts
│   │       ├── director.test.ts
│   │       ├── layout.test.ts
│   │       ├── partDrawing.test.ts
│   │       ├── simulation.test.ts
│   │       ├── validation.test.ts
│   │       ├── repair.test.ts
│   │       ├── orchestrator.test.ts
│   │       ├── routes.test.ts
│   │       └── scorers.test.ts
│   └── frontend/
│       ├── package.json              # name: @cad/frontend
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── index.html
│       ├── tests/setup.ts
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── lib/{store.ts,api.ts}
│       │   ├── components/PromptPanel.tsx
│       │   ├── components/StatusPanel.tsx
│       │   ├── drawing/svgPrimitives.tsx
│       │   ├── simulation/planckWorld.ts
│       │   └── tabs/{DrawingView,SimulationView,OrchestrationView,TimelineView,ValidationView,StateExportView}.tsx
│       └── tests/{store.test.ts,DrawingView.test.tsx,planckWorld.test.ts,OrchestrationView.test.tsx,TimelineView.test.tsx}
└── docs/DEMO.md
```

---

## Milestones

1. **Phase A** — monorepo + shared Assembly State types.
2. **Phase B** — JSCAD gear geometry (named MVP risk, done early).
3. **Phase C** — Weave wrapper + deterministic agents + orchestrator (every agent/tool op-wrapped).
4. **Phase D** — Fastify API + `weave.init` + "View in Weave" URL.
5. **Phase E** — Vite/React shell + Drawing View.
6. **Phase F** — Simulation (Planck) + Orchestration (React Flow) + Timeline/Validation/Export.
7. **Phase G** — Weave Evaluation harness + end-to-end demo verification.

Each phase yields runnable, tested software. Commit after every task.

---

# PHASE A — Monorepo + Shared Types

### Task A1: Workspace scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `README.md`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
dist/
.DS_Store
*.log
.env
coverage/
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "assemblycad-ai",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev:backend": "pnpm --filter @cad/backend dev",
    "dev:frontend": "pnpm --filter @cad/frontend dev"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2021", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "composite": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# AssemblyCAD AI

Agent-controlled 2D mechanical CAD & simulation workspace (MVP: 2D cube gearbox), traced in W&B Weave.

## Setup
pnpm install

## Run
pnpm dev:backend   # Fastify on :8000, calls weave.init
pnpm dev:frontend  # Vite on :5173

## Test
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git init
git add .gitignore package.json pnpm-workspace.yaml tsconfig.base.json README.md
git commit -m "chore: scaffold pnpm monorepo"
```

---

### Task A2: Shared Assembly State types

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/assemblyState.ts`, `packages/shared/src/factory.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/tests/assemblyState.test.ts`

- [ ] **Step 1: Create package config**

`packages/shared/package.json`:

```json
{
  "name": "@cad/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

`packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "." },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/shared/tests/assemblyState.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState } from "../src/factory";
import type { Part } from "../src/assemblyState";

describe("assembly state", () => {
  it("createEmptyState yields empty collections and version 0", () => {
    const s = createEmptyState("cube-gearbox", "make a gearbox");
    expect(s.parts).toEqual([]);
    expect(s.timeline).toEqual([]);
    expect(s.version).toBe(0);
    expect(s.validation.passed).toBe(false);
  });

  it("a Part carries both drawing and simulation representations", () => {
    const part: Part = {
      id: "gearA",
      type: "gear",
      ownerAgent: "GearADrawingAgent",
      drawing: { center: [0, 0], params: { teeth: 20, module: 2 }, outline: null },
      simulation: { center: [0, 0], radius: 20, shaftId: "shaftA", bodyKind: "dynamic" },
      status: "unknown",
      validationStatus: "unknown",
      lastModifiedBy: null,
    };
    expect(part.simulation.radius).toBe(20);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/shared && pnpm install && pnpm test`
Expected: FAIL — cannot find module `../src/factory`.

- [ ] **Step 4: Write the implementation**

`packages/shared/src/assemblyState.ts`:

```typescript
export type PartType = "box" | "gear" | "shaft" | "lid";
export type AgentStatus =
  | "idle" | "planning" | "running" | "waiting"
  | "completed" | "failed" | "repaired" | "skipped";
export type ConstraintType =
  | "gear_mesh" | "coaxial" | "fixed_axis" | "clearance" | "containment"
  | "lid_mate" | "no_collision" | "parameter_equality" | "drawing_simulation_consistency";
export type Severity = "pass" | "warn" | "fail";

export type Point = [number, number];

export interface DrawingRepr {
  center: Point;
  params: Record<string, number>;
  outline: Point[] | null; // computed by geometry layer
}

export interface SimulationRepr {
  center: Point;
  radius: number;            // approximate body radius (pitch radius for gears)
  shaftId: string | null;    // revolute joint anchor reference
  bodyKind: "dynamic" | "static";
}

export interface Part {
  id: string;
  type: PartType;
  ownerAgent: string;
  drawing: DrawingRepr;
  simulation: SimulationRepr;
  status: string;
  validationStatus: string;
  lastModifiedBy: string | null;
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  parts: string[];
  responsibleAgent: string;
  tolerance: number;
  status: string;
}

export interface LayoutPlan {
  boxSize: Point;            // [width, height]
  wallThickness: number;
  gearCenters: Record<string, Point>;
  shaftPositions: Record<string, Point>;
  centerDistance: number;
  lidPosition: Point | null;
}

export interface ValidationItem {
  id: string;
  check: string;
  severity: Severity;
  message: string;
  parts: string[];
  responsibleAgent: string | null;
}

export interface ValidationReport {
  items: ValidationItem[];
  passed: boolean;
}

export interface RepairRecord {
  issueId: string;
  routedTo: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  note: string;
}

export interface AgentState {
  name: string;
  role: string;
  status: AgentStatus;
  owns: string[];
}

export interface ToolCall {
  tool: string;
  agent: string;
  inputSummary: string;
  outputSummary: string;
  status: string;
}

export interface TimelineEvent {
  step: number;
  agent: string;
  action: string;
  tool: string | null;
  inputSummary: string;
  outputSummary: string;
  status: string;
  affectedParts: string[];
}

export interface AssemblyState {
  projectName: string;
  userPrompt: string;
  version: number;
  status: string;
  designIntent: string;
  planText: string;
  layout: LayoutPlan;
  parts: Part[];
  constraints: Constraint[];
  agents: AgentState[];
  timeline: TimelineEvent[];
  toolCalls: ToolCall[];
  validation: ValidationReport;
  repairHistory: RepairRecord[];
  weaveTraceUrl: string | null; // "View in Weave" link
}
```

`packages/shared/src/factory.ts`:

```typescript
import type { AssemblyState } from "./assemblyState";

export function createEmptyState(projectName: string, userPrompt: string): AssemblyState {
  return {
    projectName,
    userPrompt,
    version: 0,
    status: "created",
    designIntent: "",
    planText: "",
    layout: {
      boxSize: [0, 0],
      wallThickness: 0,
      gearCenters: {},
      shaftPositions: {},
      centerDistance: 0,
      lidPosition: null,
    },
    parts: [],
    constraints: [],
    agents: [],
    timeline: [],
    toolCalls: [],
    validation: { items: [], passed: false },
    repairHistory: [],
    weaveTraceUrl: null,
  };
}

export function getPart(state: AssemblyState, id: string) {
  return state.parts.find((p) => p.id === id);
}
```

`packages/shared/src/index.ts`:

```typescript
export * from "./assemblyState";
export * from "./factory";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm test`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add Assembly State types and factory (single source of truth)"
```

---

# PHASE B — JSCAD Gear Geometry

### Task B1: Backend package + gear math

**Files:**
- Create: `packages/backend/package.json`, `packages/backend/tsconfig.json`, `packages/backend/src/geometry/gearMath.ts`
- Test: `packages/backend/tests/gearMath.test.ts`

- [ ] **Step 1: Create package config**

`packages/backend/package.json`:

```json
{
  "name": "@cad/backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "dev": "tsx watch src/server.ts",
    "eval": "tsx eval/runEval.ts"
  },
  "dependencies": {
    "@cad/shared": "workspace:*",
    "@jscad/modeling": "^2.12.0",
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.0",
    "weave": "^1.1.0"
  },
  "devDependencies": {
    "tsx": "^4.10.0",
    "@types/node": "^20.0.0"
  }
}
```

`packages/backend/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "." },
  "include": ["src/**/*", "tests/**/*", "eval/**/*"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/backend/tests/gearMath.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { pitchRadius, outerRadius, rootRadius, centerDistance } from "../src/geometry/gearMath";

describe("gear math", () => {
  it("pitch radius = module * teeth / 2", () => expect(pitchRadius(2, 20)).toBe(20));
  it("outer radius = pitch + module", () => expect(outerRadius(2, 20)).toBe(22));
  it("root radius = pitch - 1.25*module", () => expect(rootRadius(2, 20)).toBe(17.5));
  it("center distance = sum of pitch radii", () => expect(centerDistance(2, 20, 30)).toBe(50));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/backend && pnpm install && pnpm test`
Expected: FAIL — cannot find module `../src/geometry/gearMath`.

- [ ] **Step 4: Write the implementation**

`packages/backend/src/geometry/gearMath.ts`:

```typescript
export const pitchRadius = (module: number, teeth: number): number => (module * teeth) / 2;
export const outerRadius = (module: number, teeth: number): number => pitchRadius(module, teeth) + module;
export const rootRadius = (module: number, teeth: number): number => pitchRadius(module, teeth) - 1.25 * module;
export const centerDistance = (module: number, teethA: number, teethB: number): number =>
  pitchRadius(module, teethA) + pitchRadius(module, teethB);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/backend && pnpm test`
Expected: PASS (4 passed)

- [ ] **Step 6: Commit**

```bash
git add packages/backend/package.json packages/backend/tsconfig.json packages/backend/src/geometry/gearMath.ts packages/backend/tests/gearMath.test.ts
git commit -m "feat(backend): add spur-gear sizing math"
```

---

### Task B2: JSCAD gear outline generator

**Files:**
- Create: `packages/backend/src/geometry/gearGeom.ts`
- Test: `packages/backend/tests/gearGeom.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/gearGeom.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateGearOutline } from "../src/geometry/gearGeom";
import { outerRadius } from "../src/geometry/gearMath";

describe("JSCAD gear outline", () => {
  it("returns a non-empty closed polygon of points", () => {
    const pts = generateGearOutline({ teeth: 12, module: 2, pressureAngle: 20, center: [0, 0], bore: 6 });
    expect(pts.length).toBeGreaterThan(12);
    expect(pts[0]).toEqual(pts[pts.length - 1]); // closed
  });

  it("all points lie within the outer radius (+epsilon)", () => {
    const teeth = 20, module = 2;
    const pts = generateGearOutline({ teeth, module, pressureAngle: 20, center: [0, 0], bore: 6 });
    const rOuter = outerRadius(module, teeth);
    for (const [x, y] of pts) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(rOuter + 1e-6);
    }
  });

  it("respects center offset", () => {
    const pts = generateGearOutline({ teeth: 12, module: 2, pressureAngle: 20, center: [100, 50], bore: 6 });
    const cx = pts.slice(0, -1).reduce((s, p) => s + p[0], 0) / (pts.length - 1);
    const cy = pts.slice(0, -1).reduce((s, p) => s + p[1], 0) / (pts.length - 1);
    expect(Math.abs(cx - 100)).toBeLessThan(1.5);
    expect(Math.abs(cy - 50)).toBeLessThan(1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test gearGeom`
Expected: FAIL — cannot find module `../src/geometry/gearGeom`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/geometry/gearGeom.ts`:

```typescript
import { primitives, booleans, geometries, transforms } from "@jscad/modeling";
import type { Point } from "@cad/shared";
import { pitchRadius, outerRadius, rootRadius } from "./gearMath";

const { circle, polygon } = primitives;
const { union, subtract } = booleans;
const { geom2 } = geometries;
const { translate } = transforms;

export interface GearSpec {
  teeth: number;
  module: number;
  pressureAngle: number;
  center: Point;
  bore: number;
}

// Build a 2D spur gear as a JSCAD geom2: a root-circle body unioned with
// trapezoidal teeth, minus a central bore. We own the tooth math; JSCAD owns
// the boolean composition and canonical geometry. Then extract the outline.
export function generateGearOutline(spec: GearSpec): Point[] {
  const { teeth, module, pressureAngle, center, bore } = spec;
  const rPitch = pitchRadius(module, teeth);
  const rOuter = outerRadius(module, teeth);
  const rRoot = Math.max(0.5, rootRadius(module, teeth));

  const body = circle({ radius: rRoot, segments: Math.max(24, teeth * 3) });

  // tooth half-angles at root and tip (tip narrower => trapezoid, leaning per pressure angle)
  const angPitch = (2 * Math.PI) / teeth;
  const lean = (pressureAngle / 90) * (angPitch * 0.12);
  const rootHalf = angPitch * 0.28;
  const tipHalf = Math.max(0.02, rootHalf - lean);

  const teethGeoms = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * angPitch;
    const p = (r: number, da: number): Point => [r * Math.cos(a + da), r * Math.sin(a + da)];
    const toothPts: Point[] = [
      p(rRoot - 0.01, -rootHalf),
      p(rOuter, -tipHalf),
      p(rOuter, tipHalf),
      p(rRoot - 0.01, rootHalf),
    ];
    teethGeoms.push(polygon({ points: toothPts }));
  }

  let gear = union(body, ...teethGeoms);
  if (bore > 0) {
    gear = subtract(gear, circle({ radius: bore / 2, segments: 24 }));
  }
  gear = translate([center[0], center[1], 0], gear) as ReturnType<typeof union>;

  // outermost outline (the boolean may yield the bore as a second outline; take the largest)
  const outlines = geom2.toOutlines(gear as Parameters<typeof geom2.toOutlines>[0]);
  const ranked = outlines
    .map((o) => o.map((pt) => [pt[0], pt[1]] as Point))
    .sort((a, b) => boundingSpan(b) - boundingSpan(a));
  const outer = ranked[0] ?? [];
  return outer.length ? [...outer, outer[0]] : [];
}

function boundingSpan(pts: Point[]): number {
  if (!pts.length) return 0;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test gearGeom`
Expected: PASS (3 passed)

> If `geom2.toOutlines` returns outlines whose winding makes the "within outer radius" assertion flaky on a particular `@jscad/modeling` patch version, increase the epsilon to `1e-3`. Do NOT loosen the closed-polygon or center-offset assertions.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/geometry/gearGeom.ts packages/backend/tests/gearGeom.test.ts
git commit -m "feat(backend): add JSCAD-based 2D gear outline generator"
```

---

# PHASE C — Weave wrapper + agents + orchestrator

### Task C1: Weave observability wrapper (with offline toggle)

**Files:**
- Create: `packages/backend/src/obs/weave.ts`
- Test: `packages/backend/tests/weave.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/weave.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { op, isWeaveEnabled } from "../src/obs/weave";

describe("weave wrapper", () => {
  it("disabled by default in tests (no WEAVE_ENABLED env)", () => {
    expect(isWeaveEnabled()).toBe(false);
  });

  it("op() passes through and preserves behavior when disabled", async () => {
    const add = op(async (a: number, b: number) => a + b, { name: "add" });
    expect(await add(2, 3)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test weave`
Expected: FAIL — cannot find module `../src/obs/weave`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/obs/weave.ts`:

```typescript
import * as weave from "weave";

let initialized = false;

export function isWeaveEnabled(): boolean {
  return process.env.WEAVE_ENABLED === "1" && !!process.env.WANDB_API_KEY;
}

// Initialize Weave once; returns the project URL fragment or null when disabled.
export async function initObservability(project = "assemblycad-ai"): Promise<boolean> {
  if (!isWeaveEnabled() || initialized) return initialized;
  await weave.init(project);
  initialized = true;
  return true;
}

// Wrap any async fn as a Weave op. When Weave is disabled the original fn is
// returned untouched, so offline/no-key demos and tests still run.
export function op<F extends (...args: any[]) => any>(fn: F, opts?: { name?: string }): F {
  if (!isWeaveEnabled()) return fn;
  return weave.op(fn, opts) as F;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test weave`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/obs/weave.ts packages/backend/tests/weave.test.ts
git commit -m "feat(backend): add Weave op wrapper with offline toggle"
```

---

### Task C2: Tool registry + agent types

**Files:**
- Create: `packages/backend/src/tools/registry.ts`, `packages/backend/src/agents/types.ts`
- Test: `packages/backend/tests/orchestrator.test.ts` (start the file)

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/orchestrator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { recordToolCall } from "../src/tools/registry";

describe("tool registry", () => {
  it("appends a tool call to state", () => {
    const s = createEmptyState("p", "x");
    recordToolCall(s, { tool: "draw_rect", agent: "BoxDrawingAgent", inputSummary: "120x80", outputSummary: "ok" });
    expect(s.toolCalls).toHaveLength(1);
    expect(s.toolCalls[0].tool).toBe("draw_rect");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test orchestrator`
Expected: FAIL — cannot find module `../src/tools/registry`.

- [ ] **Step 3: Write the implementations**

`packages/backend/src/tools/registry.ts`:

```typescript
import type { AssemblyState } from "@cad/shared";

export interface ToolCallInput {
  tool: string;
  agent: string;
  inputSummary?: string;
  outputSummary?: string;
  status?: string;
}

export function recordToolCall(state: AssemblyState, c: ToolCallInput): void {
  state.toolCalls.push({
    tool: c.tool,
    agent: c.agent,
    inputSummary: c.inputSummary ?? "",
    outputSummary: c.outputSummary ?? "",
    status: c.status ?? "ok",
  });
}
```

`packages/backend/src/agents/types.ts`:

```typescript
import type { AssemblyState, TimelineEvent } from "@cad/shared";

export interface WorkflowParams {
  module: number;
  teethA: number;
  teethB: number;
  pressureAngle?: number;
  bore?: number;
  shaftDiameter?: number;
}

export interface AgentContext {
  step: number;
  params: WorkflowParams;
}

export type AgentResult = { state: AssemblyState; events: TimelineEvent[] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test orchestrator`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/tools/registry.ts packages/backend/src/agents/types.ts packages/backend/tests/orchestrator.test.ts
git commit -m "feat(backend): add tool registry and agent context types"
```

---

### Task C3: Director agent

**Files:**
- Create: `packages/backend/src/agents/director.ts`
- Test: `packages/backend/tests/director.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/director.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };

describe("director", () => {
  it("populates plan, intent, six parts and agent roster", () => {
    const { state, events } = runDirector(createEmptyState("cube-gearbox", "two meshing gears in a box"), ctx);
    expect(state.parts.map((p) => p.id).sort()).toEqual(
      ["box", "gearA", "gearB", "lid", "shaftA", "shaftB"]
    );
    expect(state.planText).not.toBe("");
    expect(state.designIntent).not.toBe("");
    expect(getPart(state, "gearA")!.ownerAgent).toBe("GearADrawingAgent");
    expect(state.agents.find((a) => a.name === "DirectorAgent")!.status).toBe("completed");
    expect(events.some((e) => e.agent === "DirectorAgent")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test director`
Expected: FAIL — cannot find module `../src/agents/director`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/director.ts`:

```typescript
import type { AssemblyState, Part, PartType, AgentState } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const PART_ROSTER: ReadonlyArray<[string, PartType, string]> = [
  ["box", "box", "BoxDrawingAgent"],
  ["gearA", "gear", "GearADrawingAgent"],
  ["gearB", "gear", "GearBDrawingAgent"],
  ["shaftA", "shaft", "ShaftADrawingAgent"],
  ["shaftB", "shaft", "ShaftBDrawingAgent"],
  ["lid", "lid", "LidDrawingAgent"],
];

export const AGENT_ROSTER: ReadonlyArray<[string, string]> = [
  ["DirectorAgent", "Director"],
  ["LayoutPreviewAgent", "Layout"],
  ["BoxDrawingAgent", "Part:box"],
  ["GearADrawingAgent", "Part:gearA"],
  ["GearBDrawingAgent", "Part:gearB"],
  ["ShaftADrawingAgent", "Part:shaftA"],
  ["ShaftBDrawingAgent", "Part:shaftB"],
  ["LidDrawingAgent", "Part:lid"],
  ["SimulationAgent", "Simulation"],
  ["ValidationAgent", "Validation"],
  ["RepairCoordinator", "Repair"],
];

function emptyPart(id: string, type: PartType, owner: string): Part {
  return {
    id, type, ownerAgent: owner,
    drawing: { center: [0, 0], params: {}, outline: null },
    simulation: { center: [0, 0], radius: 0, shaftId: null, bodyKind: "static" },
    status: "unknown", validationStatus: "unknown", lastModifiedBy: null,
  };
}

export function runDirector(state: AssemblyState, ctx: AgentContext): AgentResult {
  state.designIntent = "2D cube gearbox: two meshing gears on fixed shafts inside a box, no collision.";
  const partIds = PART_ROSTER.map(([id]) => id);
  state.planText =
    `Design intent: build a 2D cube gearbox from "${state.userPrompt}". ` +
    `Decompose into [${partIds.join(", ")}], lay out two meshing gears on fixed shafts inside a box ` +
    `with clearance, then validate meshing, coaxial shafts, containment and drawing/simulation consistency.`;

  state.parts = PART_ROSTER.map(([id, type, owner]) => emptyPart(id, type, owner));
  state.agents = AGENT_ROSTER.map<AgentState>(([name, role]) => ({
    name, role, status: "idle",
    owns: PART_ROSTER.filter(([, , owner]) => owner === name).map(([id]) => id),
  }));
  const dir = state.agents.find((a) => a.name === "DirectorAgent");
  if (dir) dir.status = "completed";

  recordToolCall(state, { tool: "generate_plan", agent: "DirectorAgent", inputSummary: state.userPrompt.slice(0, 40), outputSummary: `${partIds.length} parts` });

  return {
    state,
    events: [{
      step: ctx.step, agent: "DirectorAgent", action: "generated design plan",
      tool: "generate_plan", inputSummary: "user prompt",
      outputSummary: `intent + plan + ${partIds.length} parts`, status: "ok", affectedParts: partIds,
    }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test director`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/director.ts packages/backend/tests/director.test.ts
git commit -m "feat(backend): add DirectorAgent with part + agent roster"
```

---

### Task C4: Layout preview agent

**Files:**
- Create: `packages/backend/src/agents/layoutPreview.ts`
- Test: `packages/backend/tests/layout.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/layout.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";

const ctx = { step: 1, params: { module: 2, teethA: 20, teethB: 20 } };
const seeded = () => runDirector(createEmptyState("g", "g"), { ...ctx, step: 0 }).state;

describe("layout", () => {
  it("sets gear centers and center distance (40 for two m2 z20 gears)", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    expect(state.layout.gearCenters.gearA).toBeDefined();
    expect(Math.abs(state.layout.centerDistance - 40)).toBeLessThan(1e-6);
  });

  it("box is larger than the center distance", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    expect(state.layout.boxSize[0]).toBeGreaterThan(state.layout.centerDistance);
  });

  it("writes layout centers into both part representations", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    const gA = getPart(state, "gearA")!;
    expect(gA.drawing.center).toEqual(state.layout.gearCenters.gearA);
    expect(gA.simulation.center).toEqual(state.layout.gearCenters.gearA);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test layout`
Expected: FAIL — cannot find module `../src/agents/layoutPreview`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/layoutPreview.ts`:

```typescript
import type { AssemblyState, Point } from "@cad/shared";
import { getPart } from "@cad/shared";
import { centerDistance, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

export function runLayoutPreview(state: AssemblyState, ctx: AgentContext): AgentResult {
  const { module, teethA, teethB } = ctx.params;
  const wall = 5, clearance = 5;
  const cd = centerDistance(module, teethA, teethB);
  const rA = outerRadius(module, teethA);
  const rB = outerRadius(module, teethB);

  const cA: Point = [-cd / 2, 0];
  const cB: Point = [cd / 2, 0];
  const innerW = cd + rA + rB + 2 * clearance;
  const innerH = 2 * Math.max(rA, rB) + 2 * clearance;
  const boxW = innerW + 2 * wall;
  const boxH = innerH + 2 * wall;

  state.layout = {
    boxSize: [boxW, boxH], wallThickness: wall, centerDistance: cd,
    gearCenters: { gearA: cA, gearB: cB },
    shaftPositions: { shaftA: cA, shaftB: cB },
    lidPosition: [0, boxH / 2],
  };

  for (const [id, c] of [...Object.entries(state.layout.gearCenters), ...Object.entries(state.layout.shaftPositions)]) {
    const part = getPart(state, id);
    if (part) { part.drawing.center = [...c]; part.simulation.center = [...c]; }
  }

  const ag = state.agents.find((a) => a.name === "LayoutPreviewAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool: "generate_layout", agent: "LayoutPreviewAgent", inputSummary: `m=${module},Za=${teethA},Zb=${teethB}`, outputSummary: `box ${boxW.toFixed(0)}x${boxH.toFixed(0)}, cd=${cd.toFixed(0)}` });

  return {
    state,
    events: [{
      step: ctx.step, agent: "LayoutPreviewAgent", action: "generated layout",
      tool: "generate_layout", inputSummary: "", outputSummary: `cd=${cd.toFixed(0)}, box=${boxW.toFixed(0)}x${boxH.toFixed(0)}`,
      status: "ok", affectedParts: ["box", "gearA", "gearB", "shaftA", "shaftB", "lid"],
    }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test layout`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/layoutPreview.ts packages/backend/tests/layout.test.ts
git commit -m "feat(backend): add LayoutPreviewAgent"
```

---

### Task C5: Part drawing agents

**Files:**
- Create: `packages/backend/src/agents/partDrawing.ts`
- Test: `packages/backend/tests/partDrawing.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/partDrawing.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function laidOut() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  return s;
}

describe("part drawing agents", () => {
  it("gear agent writes outline + params and pitch-radius sim body", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    const gA = getPart(state, "gearA")!;
    expect(gA.drawing.outline!.length).toBeGreaterThan(10);
    expect(gA.drawing.params.teeth).toBe(20);
    expect(Math.abs(gA.simulation.radius - 20)).toBeLessThan(1e-6);
    expect(gA.simulation.shaftId).toBe("shaftA");
  });

  it("box agent writes a 5-point rectangle outline", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    expect(getPart(state, "box")!.drawing.outline!.length).toBe(5);
  });

  it("shaft body is static and smaller than the gear", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    expect(getPart(state, "shaftA")!.simulation.radius).toBeLessThan(getPart(state, "gearA")!.simulation.radius);
    expect(getPart(state, "shaftA")!.simulation.bodyKind).toBe("static");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test partDrawing`
Expected: FAIL — cannot find module `../src/agents/partDrawing`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/partDrawing.ts`:

```typescript
import type { AssemblyState, Part, Point, TimelineEvent } from "@cad/shared";
import { getPart } from "@cad/shared";
import { pitchRadius } from "../geometry/gearMath";
import { generateGearOutline } from "../geometry/gearGeom";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

function rectOutline(cx: number, cy: number, w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2;
  const pts: Point[] = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
  return [...pts, pts[0]];
}

const DRAWING_AGENTS: ReadonlyArray<[string, string]> = [
  ["BoxDrawingAgent", "box"],
  ["GearADrawingAgent", "gearA"],
  ["GearBDrawingAgent", "gearB"],
  ["ShaftADrawingAgent", "shaftA"],
  ["ShaftBDrawingAgent", "shaftB"],
  ["LidDrawingAgent", "lid"],
];

function drawOne(state: AssemblyState, agentName: string, partId: string, ctx: AgentContext): TimelineEvent {
  const part = getPart(state, partId) as Part;
  const { module } = ctx.params;
  let tool = "";

  if (part.type === "gear") {
    const teeth = partId === "gearA" ? ctx.params.teethA : ctx.params.teethB;
    const pa = ctx.params.pressureAngle ?? 20;
    const bore = ctx.params.bore ?? 6;
    const [cx, cy] = part.drawing.center;
    part.drawing.params = { teeth, module, pressureAngle: pa, bore };
    part.drawing.outline = generateGearOutline({ teeth, module, pressureAngle: pa, center: [cx, cy], bore });
    part.simulation.radius = pitchRadius(module, teeth);
    part.simulation.shaftId = partId === "gearA" ? "shaftA" : "shaftB";
    part.simulation.bodyKind = "dynamic";
    tool = "create_gear";
  } else if (part.type === "box") {
    const [w, h] = state.layout.boxSize;
    part.drawing.center = [0, 0]; part.simulation.center = [0, 0];
    part.drawing.params = { width: w, height: h, wall: state.layout.wallThickness };
    part.drawing.outline = rectOutline(0, 0, w, h);
    part.simulation.radius = Math.max(w, h) / 2;
    part.simulation.bodyKind = "static";
    tool = "create_box";
  } else if (part.type === "shaft") {
    const [cx, cy] = part.drawing.center;
    const d = ctx.params.shaftDiameter ?? 6;
    part.drawing.params = { diameter: d };
    part.drawing.outline = rectOutline(cx, cy, d, d);
    part.simulation.radius = d / 2;
    part.simulation.bodyKind = "static";
    tool = "create_shaft";
  } else { // lid
    const [w, h] = state.layout.boxSize;
    part.drawing.center = [0, h / 2];
    part.drawing.params = { width: w };
    part.drawing.outline = rectOutline(0, h / 2, w, state.layout.wallThickness);
    part.simulation.radius = 0;
    part.simulation.bodyKind = "static";
    tool = "create_lid";
  }

  part.lastModifiedBy = agentName;
  part.status = "drawn";
  const ag = state.agents.find((a) => a.name === agentName);
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool, agent: agentName, inputSummary: partId, outputSummary: "outline generated" });
  return { step: ctx.step, agent: agentName, action: `generated ${partId}`, tool, inputSummary: partId, outputSummary: "outline", status: "ok", affectedParts: [partId] };
}

export function runPartDrawingAgents(state: AssemblyState, ctx: AgentContext): AgentResult {
  const events = DRAWING_AGENTS.map(([agent, part]) => drawOne(state, agent, part, ctx));
  return { state, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test partDrawing`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/partDrawing.ts packages/backend/tests/partDrawing.test.ts
git commit -m "feat(backend): add part drawing agents (box/gear/shaft/lid)"
```

---

### Task C6: Simulation agent

**Files:**
- Create: `packages/backend/src/agents/simulation.ts`
- Test: `packages/backend/tests/simulation.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/simulation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function drawn() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  return s;
}

describe("simulation agent", () => {
  it("creates mesh, coaxial and consistency constraints", () => {
    const { state } = runSimulationAgent(drawn(), ctx);
    const types = new Set(state.constraints.map((c) => c.type));
    expect(types.has("gear_mesh")).toBe(true);
    expect(types.has("coaxial")).toBe(true);
    expect(types.has("drawing_simulation_consistency")).toBe(true);
  });

  it("mesh constraint links both gears", () => {
    const { state } = runSimulationAgent(drawn(), ctx);
    const mesh = state.constraints.find((c) => c.type === "gear_mesh")!;
    expect(new Set(mesh.parts)).toEqual(new Set(["gearA", "gearB"]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test simulation`
Expected: FAIL — cannot find module `../src/agents/simulation`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/simulation.ts`:

```typescript
import type { AssemblyState, Constraint } from "@cad/shared";
import { getPart } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

export function runSimulationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const constraints: Constraint[] = [
    { id: "mesh-AB", type: "gear_mesh", parts: ["gearA", "gearB"], responsibleAgent: "LayoutPreviewAgent", tolerance: 0.5, status: "unknown" },
    { id: "coax-A", type: "coaxial", parts: ["gearA", "shaftA"], responsibleAgent: "ShaftADrawingAgent", tolerance: 0.1, status: "unknown" },
    { id: "coax-B", type: "coaxial", parts: ["gearB", "shaftB"], responsibleAgent: "ShaftBDrawingAgent", tolerance: 0.1, status: "unknown" },
    { id: "contain-A", type: "containment", parts: ["gearA", "box"], responsibleAgent: "BoxDrawingAgent", tolerance: 0, status: "unknown" },
    { id: "contain-B", type: "containment", parts: ["gearB", "box"], responsibleAgent: "BoxDrawingAgent", tolerance: 0, status: "unknown" },
    { id: "consistency", type: "drawing_simulation_consistency", parts: ["gearA", "gearB"], responsibleAgent: "SimulationAgent", tolerance: 0.01, status: "unknown" },
  ];
  state.constraints = constraints;

  for (const [g, s] of [["gearA", "shaftA"], ["gearB", "shaftB"]] as const) {
    const gear = getPart(state, g);
    if (gear) gear.simulation.shaftId = s;
  }

  const ag = state.agents.find((a) => a.name === "SimulationAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool: "build_simulation", agent: "SimulationAgent", inputSummary: "parts", outputSummary: `${constraints.length} constraints` });

  return {
    state,
    events: [{ step: ctx.step, agent: "SimulationAgent", action: "built simulation model", tool: "build_simulation", inputSummary: "", outputSummary: `${constraints.length} constraints`, status: "ok", affectedParts: ["gearA", "gearB", "shaftA", "shaftB", "box"] }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test simulation`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/simulation.ts packages/backend/tests/simulation.test.ts
git commit -m "feat(backend): add SimulationAgent declaring constraints"
```

---

### Task C7: Validation agent

**Files:**
- Create: `packages/backend/src/agents/validation.ts`
- Test: `packages/backend/tests/validation.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";
import { runValidationAgent } from "../src/agents/validation";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function built() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  s = runSimulationAgent(s, ctx).state;
  return s;
}

describe("validation", () => {
  it("passes on a consistent assembly", () => {
    const { state } = runValidationAgent(built(), ctx);
    expect(state.validation.passed).toBe(true);
    expect(state.validation.items.every((i) => i.severity !== "fail")).toBe(true);
  });

  it("detects mesh failure when a gear center is wrong, with a responsible agent", () => {
    const s = built();
    const gA = getPart(s, "gearA")!;
    gA.drawing.center = [gA.drawing.center[0] - 15, gA.drawing.center[1]];
    gA.simulation.center = [...gA.drawing.center];
    const { state } = runValidationAgent(s, ctx);
    expect(state.validation.passed).toBe(false);
    const fail = state.validation.items.find((i) => i.check === "gear_center_distance" && i.severity === "fail")!;
    expect(fail.responsibleAgent).not.toBeNull();
  });

  it("detects cross-view inconsistency", () => {
    const s = built();
    const gB = getPart(s, "gearB")!;
    gB.simulation.center = [gB.drawing.center[0] + 9, gB.drawing.center[1]];
    const { state } = runValidationAgent(s, ctx);
    expect(state.validation.items.some((i) => i.check === "drawing_simulation_consistency" && i.severity === "fail")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test validation`
Expected: FAIL — cannot find module `../src/agents/validation`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/validation.ts`:

```typescript
import type { AssemblyState, Point, ValidationItem } from "@cad/shared";
import { getPart } from "@cad/shared";
import { pitchRadius, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function runValidationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const items: ValidationItem[] = [];
  const { module } = ctx.params;
  const gA = getPart(state, "gearA"), gB = getPart(state, "gearB");

  if (gA && gB) {
    const actual = dist(gA.drawing.center, gB.drawing.center);
    const expected = pitchRadius(module, Number(gA.drawing.params.teeth ?? 20)) + pitchRadius(module, Number(gB.drawing.params.teeth ?? 20));
    const pass = Math.abs(actual - expected) <= 0.5;
    items.push({ id: "v-mesh", check: "gear_center_distance", severity: pass ? "pass" : "fail", message: `center distance ${actual.toFixed(1)} vs expected ${expected.toFixed(1)}`, parts: ["gearA", "gearB"], responsibleAgent: pass ? null : "LayoutPreviewAgent" });
  }

  for (const [g, sh] of [["gearA", "shaftA"], ["gearB", "shaftB"]] as const) {
    const gear = getPart(state, g), shaft = getPart(state, sh);
    if (gear && shaft) {
      const off = dist(gear.drawing.center, shaft.drawing.center);
      const pass = off <= 0.1;
      items.push({ id: `v-coax-${g}`, check: "shaft_alignment", severity: pass ? "pass" : "fail", message: `${g} vs ${sh} offset ${off.toFixed(2)}`, parts: [g, sh], responsibleAgent: pass ? null : `Shaft${g.slice(-1)}DrawingAgent` });
    }
  }

  const box = getPart(state, "box");
  if (box) {
    const [w, h] = state.layout.boxSize;
    const wall = state.layout.wallThickness;
    const innerHw = w / 2 - wall, innerHh = h / 2 - wall;
    for (const g of ["gearA", "gearB"]) {
      const gear = getPart(state, g);
      if (gear) {
        const r = outerRadius(module, Number(gear.drawing.params.teeth ?? 20));
        const [cx, cy] = gear.drawing.center;
        const fits = Math.abs(cx) + r <= innerHw && Math.abs(cy) + r <= innerHh;
        items.push({ id: `v-contain-${g}`, check: "gear_box_clearance", severity: fits ? "pass" : "fail", message: `${g} ${fits ? "fits" : "collides with box wall"}`, parts: [g, "box"], responsibleAgent: fits ? null : g === "gearA" ? "GearADrawingAgent" : "GearBDrawingAgent" });
      }
    }
  }

  for (const g of ["gearA", "gearB"]) {
    const gear = getPart(state, g);
    if (gear) {
      const off = dist(gear.drawing.center, gear.simulation.center);
      const pass = off <= 0.01;
      items.push({ id: `v-consist-${g}`, check: "drawing_simulation_consistency", severity: pass ? "pass" : "fail", message: `${g} drawing/sim center offset ${off.toFixed(2)}`, parts: [g], responsibleAgent: pass ? null : "SimulationAgent" });
    }
  }

  const passed = items.every((i) => i.severity !== "fail");
  state.validation = { items, passed };
  for (const c of state.constraints) c.status = "ok";
  for (const i of items) if (i.severity === "fail") for (const pid of i.parts) { const p = getPart(state, pid); if (p) p.validationStatus = "failed"; }

  const ag = state.agents.find((a) => a.name === "ValidationAgent");
  if (ag) ag.status = passed ? "completed" : "failed";

  recordToolCall(state, { tool: "run_validation", agent: "ValidationAgent", inputSummary: "assembly", outputSummary: `${passed ? "PASS" : "FAIL"} (${items.length} checks)`, status: passed ? "ok" : "fail" });

  return {
    state,
    events: [{ step: ctx.step, agent: "ValidationAgent", action: "validated assembly", tool: "run_validation", inputSummary: "", outputSummary: passed ? "passed" : "failed", status: passed ? "ok" : "fail", affectedParts: [...new Set(items.flatMap((i) => i.parts))] }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test validation`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/validation.ts packages/backend/tests/validation.test.ts
git commit -m "feat(backend): add ValidationAgent (mesh/coaxial/containment/cross-view)"
```

---

### Task C8: Repair coordinator

**Files:**
- Create: `packages/backend/src/agents/repair.ts`
- Test: `packages/backend/tests/repair.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/repair.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";
import { runValidationAgent } from "../src/agents/validation";
import { runRepairCoordinator } from "../src/agents/repair";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function failed() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  s = runSimulationAgent(s, ctx).state;
  const gA = getPart(s, "gearA")!;
  gA.drawing.center = [gA.drawing.center[0] - 15, 0];
  gA.simulation.center = [...gA.drawing.center];
  s = runValidationAgent(s, ctx).state;
  expect(s.validation.passed).toBe(false);
  return s;
}

describe("repair", () => {
  it("records repair history routed to a responsible agent", () => {
    const { state } = runRepairCoordinator(failed(), ctx);
    expect(state.repairHistory.length).toBeGreaterThanOrEqual(1);
    expect(state.repairHistory[0].routedTo).toBe("LayoutPreviewAgent");
  });

  it("re-derivation fixes the assembly so re-validation passes", () => {
    let { state } = runRepairCoordinator(failed(), ctx);
    state = runValidationAgent(state, ctx).state;
    expect(state.validation.passed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test repair`
Expected: FAIL — cannot find module `../src/agents/repair`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/repair.ts`:

```typescript
import type { AssemblyState, TimelineEvent } from "@cad/shared";
import { runLayoutPreview } from "./layoutPreview";
import { runPartDrawingAgents } from "./partDrawing";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const ROUTING: Record<string, string> = {
  gear_center_distance: "LayoutPreviewAgent",
  shaft_alignment: "ShaftADrawingAgent",
  gear_box_clearance: "GearADrawingAgent",
  drawing_simulation_consistency: "SimulationAgent",
};

export function runRepairCoordinator(state: AssemblyState, ctx: AgentContext): AgentResult {
  const fails = state.validation.items.filter((i) => i.severity === "fail");
  const events: TimelineEvent[] = [];

  for (const fail of fails) {
    const routedTo = fail.responsibleAgent ?? ROUTING[fail.check] ?? "DirectorAgent";
    // Repair strategy: re-run layout (canonical centers), then re-draw all parts so
    // every downstream representation is re-derived from the single source of truth.
    runLayoutPreview(state, ctx);
    runPartDrawingAgents(state, ctx);

    const note = `Validation issue "${fail.message}" routed to ${routedTo}; re-derived layout + drawings, will re-validate.`;
    state.repairHistory.push({ issueId: fail.id, routedTo, before: { check: fail.check, message: fail.message }, after: { action: "re-layout + re-draw" }, note });

    const ag = state.agents.find((a) => a.name === routedTo);
    if (ag) ag.status = "repaired";

    recordToolCall(state, { tool: "repair", agent: "RepairCoordinator", inputSummary: fail.check, outputSummary: `routed to ${routedTo}` });
    events.push({ step: ctx.step, agent: "RepairCoordinator", action: `routed '${fail.check}' to ${routedTo}`, tool: "repair", inputSummary: fail.check, outputSummary: note.slice(0, 60), status: "ok", affectedParts: fail.parts });
  }

  return { state, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test repair`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/agents/repair.ts packages/backend/tests/repair.test.ts
git commit -m "feat(backend): add RepairCoordinator re-deriving from layout"
```

---

### Task C9: Orchestrator (op-wrapped pipeline + repair loop)

**Files:**
- Create: `packages/backend/src/agents/orchestrator.ts`
- Test: `packages/backend/tests/orchestrator.test.ts` (append)

- [ ] **Step 1: Write the failing test (append to orchestrator.test.ts)**

```typescript
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";

const params = { module: 2, teethA: 20, teethB: 20 };

describe("orchestrator", () => {
  it("runs the full pipeline producing state + timeline", async () => {
    const state = await runWorkflow("Create a 2D cube gearbox", params);
    expect(state.parts).toHaveLength(6);
    expect(state.constraints.length).toBeGreaterThanOrEqual(4);
    expect(state.timeline.length).toBeGreaterThanOrEqual(8);
    expect(state.validation.items.length).toBeGreaterThan(0);
  });

  it("seeded failure then repair passes", async () => {
    const failed = await runWorkflow("gearbox", params, { seedFailure: true });
    expect(failed.validation.passed).toBe(false);
    const repaired = await runRepairOnce(failed, params);
    expect(repaired.validation.passed).toBe(true);
    expect(repaired.repairHistory.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test orchestrator`
Expected: FAIL — cannot find `runWorkflow`.

- [ ] **Step 3: Write the implementation**

`packages/backend/src/agents/orchestrator.ts`:

```typescript
import type { AssemblyState } from "@cad/shared";
import { createEmptyState, getPart } from "@cad/shared";
import { op } from "../obs/weave";
import { runDirector } from "./director";
import { runLayoutPreview } from "./layoutPreview";
import { runPartDrawingAgents } from "./partDrawing";
import { runSimulationAgent } from "./simulation";
import { runValidationAgent } from "./validation";
import { runRepairCoordinator } from "./repair";
import type { WorkflowParams } from "./types";

// Each agent wrapped as a Weave op so the trace tree mirrors the pipeline.
const opDirector = op(async (s: AssemblyState, c: any) => runDirector(s, c), { name: "DirectorAgent" });
const opLayout = op(async (s: AssemblyState, c: any) => runLayoutPreview(s, c), { name: "LayoutPreviewAgent" });
const opParts = op(async (s: AssemblyState, c: any) => runPartDrawingAgents(s, c), { name: "PartDrawingAgents" });
const opSim = op(async (s: AssemblyState, c: any) => runSimulationAgent(s, c), { name: "SimulationAgent" });
const opVal = op(async (s: AssemblyState, c: any) => runValidationAgent(s, c), { name: "ValidationAgent" });
const opRepair = op(async (s: AssemblyState, c: any) => runRepairCoordinator(s, c), { name: "RepairCoordinator" });

interface RunOpts { seedFailure?: boolean }

async function runWorkflowImpl(prompt: string, params: WorkflowParams, opts: RunOpts = {}): Promise<AssemblyState> {
  let state = createEmptyState("cube-gearbox", prompt);
  let step = 0;
  const pump = async (fn: (s: AssemblyState, c: any) => Promise<{ state: AssemblyState; events: any[] }>) => {
    const res = await fn(state, { step, params });
    state = res.state;
    state.timeline.push(...res.events);
    step += res.events.length || 1;
  };

  await pump(opDirector);
  await pump(opLayout);
  await pump(opParts);
  await pump(opSim);

  if (opts.seedFailure) {
    const gA = getPart(state, "gearA")!;
    gA.drawing.center = [gA.drawing.center[0] - 15, 0];
    gA.simulation.center = [...gA.drawing.center];
  }

  await pump(opVal);
  state.status = "validated";
  return state;
}

async function runRepairOnceImpl(state: AssemblyState, params: WorkflowParams): Promise<AssemblyState> {
  let step = state.timeline.length;
  const pump = async (fn: (s: AssemblyState, c: any) => Promise<{ state: AssemblyState; events: any[] }>) => {
    const res = await fn(state, { step, params });
    state = res.state;
    state.timeline.push(...res.events);
    step = state.timeline.length;
  };
  await pump(opRepair);
  await pump(opSim);
  await pump(opVal);
  state.status = "repaired";
  return state;
}

// Top-level workflow ops: one root trace contains the whole nested pipeline.
export const runWorkflow = op(runWorkflowImpl, { name: "runWorkflow" });
export const runRepairOnce = op(runRepairOnceImpl, { name: "runRepairOnce" });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test orchestrator`
Expected: PASS (all orchestrator tests)

- [ ] **Step 5: Run the full backend suite**

Run: `cd packages/backend && pnpm test`
Expected: PASS (all backend tests across all files)

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/agents/orchestrator.ts packages/backend/tests/orchestrator.test.ts
git commit -m "feat(backend): add orchestrator with Weave op-wrapped pipeline + repair"
```

---

# PHASE D — Fastify API + Weave init

### Task D1: Store + routes + server

**Files:**
- Create: `packages/backend/src/store.ts`, `packages/backend/src/routes.ts`, `packages/backend/src/server.ts`
- Test: `packages/backend/tests/routes.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/routes.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/server";
import { store } from "../src/store";

const app = buildApp();
const params = { module: 2, teethA: 20, teethB: 20 };

describe("routes", () => {
  beforeEach(() => store.reset());

  it("POST /workflow/run returns state with seeded failure", async () => {
    const r = await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "Create a 2D cube gearbox", params, seedFailure: true } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.parts).toHaveLength(6);
    expect(body.validation.passed).toBe(false);
  });

  it("POST /workflow/repair passes after seeded failure", async () => {
    await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "g", params, seedFailure: true } });
    const r = await app.inject({ method: "POST", url: "/workflow/repair", payload: { params } });
    expect(r.statusCode).toBe(200);
    expect(r.json().validation.passed).toBe(true);
  });

  it("GET /state 404 then 200 then reset 404", async () => {
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(404);
    await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "g", params } });
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(200);
    await app.inject({ method: "POST", url: "/reset" });
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test routes`
Expected: FAIL — cannot find module `../src/server`.

- [ ] **Step 3: Write the implementations**

`packages/backend/src/store.ts`:

```typescript
import type { AssemblyState } from "@cad/shared";

class ProjectStore {
  private state: AssemblyState | null = null;
  get(): AssemblyState | null { return this.state; }
  set(s: AssemblyState): AssemblyState { s.version += 1; this.state = s; return s; }
  reset(): void { this.state = null; }
}

export const store = new ProjectStore();
```

`packages/backend/src/routes.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { runWorkflow, runRepairOnce } from "./agents/orchestrator";
import { store } from "./store";
import type { WorkflowParams } from "./agents/types";

const DEFAULT_PARAMS: WorkflowParams = { module: 2, teethA: 20, teethB: 20 };

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post("/workflow/run", async (req) => {
    const b = req.body as { prompt?: string; params?: WorkflowParams; seedFailure?: boolean };
    const state = await runWorkflow(b.prompt ?? "Create a 2D cube gearbox", b.params ?? DEFAULT_PARAMS, { seedFailure: !!b.seedFailure });
    return store.set(state);
  });

  app.post("/workflow/repair", async (req, reply) => {
    const current = store.get();
    if (!current) return reply.code(404).send({ error: "no active project" });
    const b = req.body as { params?: WorkflowParams };
    const state = await runRepairOnce(current, b.params ?? DEFAULT_PARAMS);
    return store.set(state);
  });

  app.get("/state", async (_req, reply) => {
    const s = store.get();
    return s ? s : reply.code(404).send({ error: "no active project" });
  });

  app.post("/reset", async () => { store.reset(); return { status: "reset" }; });
  app.get("/export", async (_req, reply) => {
    const s = store.get();
    return s ? s : reply.code(404).send({ error: "no active project" });
  });
}
```

`packages/backend/src/server.ts`:

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { initObservability } from "./obs/weave";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });
  app.register(registerRoutes);
  return app;
}

async function main() {
  await initObservability("assemblycad-ai"); // no-op unless WEAVE_ENABLED=1 + WANDB_API_KEY
  const app = buildApp();
  const port = Number(process.env.PORT ?? 8000);
  await app.listen({ port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`AssemblyCAD backend on :${port}`);
}

// run only when invoked directly (not under test import)
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test routes`
Expected: PASS (3 passed)

- [ ] **Step 5: Full backend suite**

Run: `cd packages/backend && pnpm test`
Expected: PASS (all backend tests)

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/store.ts packages/backend/src/routes.ts packages/backend/src/server.ts packages/backend/tests/routes.test.ts
git commit -m "feat(backend): add Fastify server, routes, store, weave init"
```

---

# PHASE E — Vite/React shell + Drawing View

### Task E1: Frontend scaffold + store + api + shell

**Files:**
- Create: `packages/frontend/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `tests/setup.ts`, `src/main.tsx`, `src/App.tsx`, `src/lib/store.ts`, `src/lib/api.ts`, `src/components/PromptPanel.tsx`
- Test: `packages/frontend/tests/store.test.ts`

- [ ] **Step 1: Create package + config**

`packages/frontend/package.json`:

```json
{
  "name": "@cad/frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@cad/shared": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "reactflow": "^11.11.0",
    "planck": "^1.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.2.0",
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0"
  }
}
```

`packages/frontend/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "outDir": "dist", "rootDir": "." },
  "include": ["src/**/*", "tests/**/*"]
}
```

`packages/frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

`packages/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], globals: true },
});
```

`packages/frontend/tests/setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

`packages/frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>AssemblyCAD AI</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 2: Write the failing store test**

`packages/frontend/tests/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../src/lib/store";

describe("store", () => {
  beforeEach(() => useStore.getState().reset());

  it("starts null on the drawing tab", () => {
    expect(useStore.getState().assembly).toBeNull();
    expect(useStore.getState().activeTab).toBe("drawing");
  });

  it("setAssembly + setTab + selectPart", () => {
    useStore.getState().setAssembly({ projectName: "p", parts: [] } as any);
    useStore.getState().setTab("simulation");
    useStore.getState().selectPart("gearA");
    const st = useStore.getState();
    expect(st.assembly?.projectName).toBe("p");
    expect(st.activeTab).toBe("simulation");
    expect(st.selectedPartId).toBe("gearA");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/frontend && pnpm install && pnpm test store`
Expected: FAIL — cannot find module `../src/lib/store`.

- [ ] **Step 4: Write store, api, shell**

`packages/frontend/src/lib/store.ts`:

```typescript
import { create } from "zustand";
import type { AssemblyState } from "@cad/shared";

export type TabId = "drawing" | "simulation" | "orchestration" | "timeline" | "validation" | "state";

interface AppState {
  assembly: AssemblyState | null;
  activeTab: TabId;
  selectedPartId: string | null;
  loading: boolean;
  setAssembly: (s: AssemblyState) => void;
  setTab: (t: TabId) => void;
  selectPart: (id: string | null) => void;
  setLoading: (b: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  assembly: null, activeTab: "drawing", selectedPartId: null, loading: false,
  setAssembly: (s) => set({ assembly: s }),
  setTab: (t) => set({ activeTab: t }),
  selectPart: (id) => set({ selectedPartId: id }),
  setLoading: (b) => set({ loading: b }),
  reset: () => set({ assembly: null, activeTab: "drawing", selectedPartId: null, loading: false }),
}));
```

`packages/frontend/src/lib/api.ts`:

```typescript
import type { AssemblyState } from "@cad/shared";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const params = { module: 2, teethA: 20, teethB: 20 };

export async function runWorkflow(prompt: string, seedFailure = true): Promise<AssemblyState> {
  const r = await fetch(`${BASE}/workflow/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, params, seedFailure }) });
  if (!r.ok) throw new Error(`run failed: ${r.status}`);
  return r.json();
}
export async function repairOnce(): Promise<AssemblyState> {
  const r = await fetch(`${BASE}/workflow/repair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ params }) });
  if (!r.ok) throw new Error(`repair failed: ${r.status}`);
  return r.json();
}
export async function resetProject(): Promise<void> { await fetch(`${BASE}/reset`, { method: "POST" }); }
```

`packages/frontend/src/components/PromptPanel.tsx`:

```tsx
import { useState } from "react";
import { useStore } from "../lib/store";
import { runWorkflow, repairOnce, resetProject } from "../lib/api";

const DEFAULT_PROMPT = "Create a 2D cube gearbox with two meshing gears inside a box.";

export function PromptPanel() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const { setAssembly, setLoading, loading, reset } = useStore();
  const run = async () => { setLoading(true); try { setAssembly(await runWorkflow(prompt, true)); } finally { setLoading(false); } };
  const repair = async () => { setLoading(true); try { setAssembly(await repairOnce()); } finally { setLoading(false); } };
  const doReset = async () => { await resetProject(); reset(); };
  return (
    <div>
      <h3>AssemblyCAD AI</h3>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} style={{ width: "100%" }} />
      <button onClick={run} disabled={loading}>Run Full Workflow</button>
      <button onClick={repair} disabled={loading}>Repair Once</button>
      <button onClick={doReset}>Reset</button>
    </div>
  );
}
```

`packages/frontend/src/App.tsx`:

```tsx
import { useStore, type TabId } from "./lib/store";
import { PromptPanel } from "./components/PromptPanel";

const TABS: TabId[] = ["drawing", "simulation", "orchestration", "timeline", "validation", "state"];

export default function App() {
  const { activeTab, setTab, assembly } = useStore();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", height: "100vh", fontFamily: "system-ui" }}>
      <aside style={{ borderRight: "1px solid #ddd", padding: 12 }}><PromptPanel /></aside>
      <main style={{ display: "flex", flexDirection: "column" }}>
        <nav style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid #ddd" }}>
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontWeight: activeTab === t ? 700 : 400 }}>{t}</button>)}
        </nav>
        <section style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {assembly ? <div data-testid="active-tab">{activeTab} view</div> : <p>Run a workflow to begin.</p>}
        </section>
      </main>
      <aside style={{ borderLeft: "1px solid #ddd", padding: 12 }}><p>Status panel</p></aside>
    </div>
  );
}
```

`packages/frontend/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/frontend && pnpm test store`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add packages/frontend
git commit -m "feat(frontend): add Vite/React shell, store, api client, prompt panel"
```

---

### Task E2: Drawing View (SVG)

**Files:**
- Create: `packages/frontend/src/drawing/svgPrimitives.tsx`, `packages/frontend/src/tabs/DrawingView.tsx`
- Modify: `packages/frontend/src/App.tsx`
- Test: `packages/frontend/tests/DrawingView.test.tsx`

- [ ] **Step 1: Write the failing test**

`packages/frontend/tests/DrawingView.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { DrawingView } from "../src/tabs/DrawingView";
import { useStore } from "../src/lib/store";

const fake = {
  projectName: "p", layout: { boxSize: [120, 80] },
  parts: [
    { id: "box", type: "box", drawing: { center: [0, 0], outline: [[-60,-40],[60,-40],[60,40],[-60,40],[-60,-40]] } },
    { id: "gearA", type: "gear", drawing: { center: [-20, 0], outline: [[-20,-10],[-10,0],[-20,10],[-30,0],[-20,-10]] } },
  ],
} as any;

describe("DrawingView", () => {
  beforeEach(() => { useStore.getState().reset(); useStore.getState().setAssembly(fake); });
  it("renders one polyline per part with an outline", () => {
    render(<DrawingView />);
    expect(document.querySelectorAll("polyline[data-part-id]").length).toBe(2);
  });
  it("tags polylines by part id", () => {
    render(<DrawingView />);
    expect(document.querySelector('polyline[data-part-id="gearA"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpm test DrawingView`
Expected: FAIL — cannot find module `../src/tabs/DrawingView`.

- [ ] **Step 3: Write the implementations**

`packages/frontend/src/drawing/svgPrimitives.tsx`:

```tsx
import type { Point } from "@cad/shared";

export const pointsToAttr = (pts: Point[]): string => pts.map(([x, y]) => `${x},${y}`).join(" ");

export function PartPolyline({ id, pts, selected, onClick }: { id: string; pts: Point[]; selected: boolean; onClick: () => void }) {
  return (
    <polyline
      data-part-id={id}
      points={pointsToAttr(pts)}
      fill={id.startsWith("gear") ? "rgba(80,140,255,0.15)" : "none"}
      stroke={selected ? "#e0533d" : "#222"}
      strokeWidth={selected ? 1.6 : 0.8}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    />
  );
}
```

`packages/frontend/src/tabs/DrawingView.tsx`:

```tsx
import { useStore } from "../lib/store";
import { PartPolyline } from "../drawing/svgPrimitives";

export function DrawingView() {
  const { assembly, selectedPartId, selectPart } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const [w, h] = assembly.layout?.boxSize ?? [200, 200];
  const pad = 20;
  return (
    <svg viewBox={`${-w / 2 - pad} ${-h / 2 - pad} ${w + 2 * pad} ${h + 2 * pad}`} width="100%" height="100%" style={{ background: "#fafafa" }}>
      <g transform="scale(1,-1)">
        {assembly.parts.map((p) => p.drawing?.outline ? (
          <PartPolyline key={p.id} id={p.id} pts={p.drawing.outline} selected={selectedPartId === p.id} onClick={() => selectPart(p.id)} />
        ) : null)}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Wire into App**

In `packages/frontend/src/App.tsx`, add `import { DrawingView } from "./tabs/DrawingView";` and replace the `{assembly ? <div ...` line with:

```tsx
{assembly ? (
  activeTab === "drawing" ? <DrawingView /> : <div data-testid="active-tab">{activeTab} view</div>
) : <p>Run a workflow to begin.</p>}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/frontend && pnpm test DrawingView`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/drawing packages/frontend/src/tabs/DrawingView.tsx packages/frontend/tests/DrawingView.test.tsx packages/frontend/src/App.tsx
git commit -m "feat(frontend): add Drawing View rendering part outlines"
```

---

# PHASE F — Simulation, Orchestration, Timeline, Validation, Export

### Task F1: Planck world + Simulation View

**Files:**
- Create: `packages/frontend/src/simulation/planckWorld.ts`, `packages/frontend/src/tabs/SimulationView.tsx`
- Modify: `packages/frontend/src/App.tsx`
- Test: `packages/frontend/tests/planckWorld.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/frontend/tests/planckWorld.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildWorld } from "../src/simulation/planckWorld";

const assembly = {
  parts: [
    { id: "box", type: "box", simulation: { center: [0, 0], radius: 60, bodyKind: "static" } },
    { id: "gearA", type: "gear", simulation: { center: [-20, 0], radius: 20, bodyKind: "dynamic", shaftId: "shaftA" } },
    { id: "gearB", type: "gear", simulation: { center: [20, 0], radius: 20, bodyKind: "dynamic", shaftId: "shaftB" } },
    { id: "shaftA", type: "shaft", simulation: { center: [-20, 0], radius: 3, bodyKind: "static" } },
    { id: "shaftB", type: "shaft", simulation: { center: [20, 0], radius: 3, bodyKind: "static" } },
  ],
} as any;

describe("buildWorld", () => {
  it("creates one body per part", () => {
    expect(Object.keys(buildWorld(assembly).bodies).length).toBe(5);
  });
  it("gear dynamic, box static", () => {
    const { bodies } = buildWorld(assembly);
    expect(bodies.gearA.isDynamic()).toBe(true);
    expect(bodies.box.isStatic()).toBe(true);
  });
  it("steps and gearA rotates", () => {
    const { world, bodies } = buildWorld(assembly);
    const before = bodies.gearA.getAngle();
    for (let i = 0; i < 30; i++) world.step(1 / 60);
    expect(bodies.gearA.getAngle()).not.toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpm test planckWorld`
Expected: FAIL — cannot find module `../src/simulation/planckWorld`.

- [ ] **Step 3: Write the implementation**

`packages/frontend/src/simulation/planckWorld.ts`:

```typescript
import planck from "planck";
import type { AssemblyState } from "@cad/shared";

export interface WorldHandle { world: planck.World; bodies: Record<string, planck.Body>; }

// Abstract mechanism: gears = dynamic circles pinned to a shaft via a revolute
// joint; gearA is motorized; box/shaft are static. No tooth-on-tooth contact.
export function buildWorld(assembly: AssemblyState): WorldHandle {
  const world = new planck.World({ gravity: planck.Vec2(0, 0) });
  const bodies: Record<string, planck.Body> = {};

  for (const p of assembly.parts) {
    const sim = p.simulation;
    const body = world.createBody({ type: sim.bodyKind === "dynamic" ? "dynamic" : "static", position: planck.Vec2(sim.center[0], sim.center[1]) });
    if (p.type === "gear") body.createFixture({ shape: planck.Circle(sim.radius), density: 1, friction: 0.3 });
    else if (p.type === "shaft") body.createFixture({ shape: planck.Circle(Math.max(0.5, sim.radius)), density: 1 });
    bodies[p.id] = body;
  }

  for (const p of assembly.parts) {
    if (p.type === "gear" && p.simulation.shaftId) {
      const gear = bodies[p.id], shaft = bodies[p.simulation.shaftId];
      if (gear && shaft) {
        const joint = world.createJoint(planck.RevoluteJoint({ enableMotor: false }, shaft, gear, gear.getPosition())) as planck.RevoluteJoint | null;
        if (p.id === "gearA" && joint) { joint.enableMotor(true); joint.setMotorSpeed(1.5); joint.setMaxMotorTorque(1000); }
      }
    }
  }
  return { world, bodies };
}
```

- [ ] **Step 4: Write the Simulation View + wire into App**

`packages/frontend/src/tabs/SimulationView.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { buildWorld, type WorldHandle } from "../simulation/planckWorld";

export function SimulationView() {
  const { assembly } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { if (assembly) handleRef.current = buildWorld(assembly); }, [assembly]);

  const draw = () => {
    const canvas = canvasRef.current, handle = handleRef.current;
    if (!canvas || !handle || !assembly) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(2, -2);
    for (const [id, body] of Object.entries(handle.bodies)) {
      const pos = body.getPosition(), angle = body.getAngle();
      const r = assembly.parts.find((p) => p.id === id)?.simulation.radius ?? 2;
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(angle);
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2); ctx.moveTo(0, 0); ctx.lineTo(r, 0);
      ctx.strokeStyle = id.startsWith("gear") ? "#3d6be0" : "#888"; ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  };
  const step = () => { handleRef.current?.world.step(1 / 60); draw(); };

  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const loop = () => { step(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);
  useEffect(() => { draw(); }, [assembly]);

  if (!assembly) return <p>No assembly.</p>;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        <button onClick={step}>Step</button>
      </div>
      <canvas ref={canvasRef} width={500} height={360} style={{ background: "#fafafa", border: "1px solid #ddd" }} />
    </div>
  );
}
```

In `App.tsx` add the import and extend the tab switch:

```tsx
import { SimulationView } from "./tabs/SimulationView";
// ...
{activeTab === "drawing" && <DrawingView />}
{activeTab === "simulation" && <SimulationView />}
{!["drawing", "simulation"].includes(activeTab) && <div data-testid="active-tab">{activeTab} view</div>}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/frontend && pnpm test planckWorld`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/simulation packages/frontend/src/tabs/SimulationView.tsx packages/frontend/tests/planckWorld.test.ts packages/frontend/src/App.tsx
git commit -m "feat(frontend): add Planck simulation world + Simulation View"
```

---

### Task F2: Orchestration + Timeline + Validation + State/Export + Status

**Files:**
- Create: `packages/frontend/src/tabs/OrchestrationView.tsx`, `TimelineView.tsx`, `ValidationView.tsx`, `StateExportView.tsx`, `packages/frontend/src/components/StatusPanel.tsx`
- Modify: `packages/frontend/src/App.tsx`
- Test: `packages/frontend/tests/OrchestrationView.test.tsx`, `packages/frontend/tests/TimelineView.test.tsx`

- [ ] **Step 1: Write the failing tests**

`packages/frontend/tests/OrchestrationView.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { agentsToNodes } from "../src/tabs/OrchestrationView";

describe("agentsToNodes", () => {
  it("maps each agent to a node with status data", () => {
    const nodes = agentsToNodes([
      { name: "DirectorAgent", role: "Director", status: "completed", owns: [] },
      { name: "GearADrawingAgent", role: "Part:gearA", status: "repaired", owns: ["gearA"] },
    ] as any);
    expect(nodes.length).toBe(2);
    expect(nodes[0].data.status).toBe("completed");
    expect(nodes[1].id).toBe("GearADrawingAgent");
  });
});
```

`packages/frontend/tests/TimelineView.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineView } from "../src/tabs/TimelineView";
import { useStore } from "../src/lib/store";

describe("TimelineView", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().setAssembly({ timeline: [
      { step: 0, agent: "DirectorAgent", action: "generated design plan", tool: "generate_plan", status: "ok", affectedParts: [] },
      { step: 1, agent: "ValidationAgent", action: "validated assembly", tool: "run_validation", status: "fail", affectedParts: ["gearA"] },
    ] } as any);
  });
  it("renders one row per event", () => { render(<TimelineView />); expect(screen.getAllByTestId("timeline-row").length).toBe(2); });
  it("shows agent + action", () => { render(<TimelineView />); expect(screen.getByText(/generated design plan/)).toBeInTheDocument(); });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/frontend && pnpm test OrchestrationView TimelineView`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

`packages/frontend/src/tabs/OrchestrationView.tsx`:

```tsx
import ReactFlow, { Background, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import type { AgentState } from "@cad/shared";
import { useStore } from "../lib/store";

const STATUS_COLOR: Record<string, string> = { idle: "#bbb", planning: "#e8b339", running: "#3d6be0", waiting: "#9b59b6", completed: "#37a169", failed: "#e0533d", repaired: "#1e9e8a", skipped: "#888" };
const ORDER = ["DirectorAgent","LayoutPreviewAgent","BoxDrawingAgent","GearADrawingAgent","GearBDrawingAgent","ShaftADrawingAgent","ShaftBDrawingAgent","LidDrawingAgent","SimulationAgent","ValidationAgent","RepairCoordinator"];

export function agentsToNodes(agents: AgentState[]): Node[] {
  return agents.map((a) => {
    const idx = ORDER.indexOf(a.name);
    const col = idx < 0 ? 0 : idx % 4, row = idx < 0 ? 0 : Math.floor(idx / 4);
    return { id: a.name, position: { x: col * 200, y: row * 110 }, data: { label: `${a.name}\n[${a.status}]`, status: a.status }, style: { border: `2px solid ${STATUS_COLOR[a.status] ?? "#bbb"}`, borderRadius: 8, padding: 6, fontSize: 11, whiteSpace: "pre-line", width: 160 } };
  });
}

function pipelineEdges(agents: AgentState[]): Edge[] {
  const present = new Set(agents.map((a) => a.name));
  const seq = ORDER.filter((n) => present.has(n));
  const edges: Edge[] = [];
  for (let i = 0; i < seq.length - 1; i++) edges.push({ id: `${seq[i]}-${seq[i + 1]}`, source: seq[i], target: seq[i + 1] });
  for (const a of agents) if (a.status === "repaired") edges.push({ id: `repair-${a.name}`, source: "RepairCoordinator", target: a.name, animated: true, style: { stroke: "#e0533d" }, label: "repair" });
  return edges;
}

export function OrchestrationView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  return (
    <div style={{ height: 460 }}>
      <ReactFlow nodes={agentsToNodes(assembly.agents)} edges={pipelineEdges(assembly.agents)} fitView><Background /></ReactFlow>
    </div>
  );
}
```

`packages/frontend/src/tabs/TimelineView.tsx`:

```tsx
import { useStore } from "../lib/store";

export function TimelineView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  return (
    <ol style={{ listStyle: "none", padding: 0 }}>
      {assembly.timeline.map((e, i) => (
        <li key={i} data-testid="timeline-row" style={{ padding: 8, borderBottom: "1px solid #eee", color: e.status === "fail" ? "#e0533d" : "#222" }}>
          <strong>{e.step}. {e.agent}</strong> — {e.action}{e.tool ? <em> ({e.tool})</em> : null}{e.affectedParts.length ? <span> · {e.affectedParts.join(", ")}</span> : null}
        </li>
      ))}
    </ol>
  );
}
```

`packages/frontend/src/tabs/ValidationView.tsx`:

```tsx
import { useStore } from "../lib/store";

const SEV: Record<string, string> = { pass: "#37a169", warn: "#e8b339", fail: "#e0533d" };

export function ValidationView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const v = assembly.validation;
  return (
    <div>
      <h4>Validation: {v.passed ? "PASSED" : "FAILED"}</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {v.items.map((it) => (
          <li key={it.id} style={{ padding: 6, borderLeft: `4px solid ${SEV[it.severity]}`, marginBottom: 4 }}>
            <strong>{it.check}</strong> [{it.severity}] — {it.message}{it.responsibleAgent ? <em> → {it.responsibleAgent}</em> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`packages/frontend/src/tabs/StateExportView.tsx`:

```tsx
import { useStore } from "../lib/store";

export function StateExportView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const download = () => {
    const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${assembly.projectName}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      {assembly.weaveTraceUrl ? <p><a href={assembly.weaveTraceUrl} target="_blank" rel="noreferrer">View in Weave ↗</a></p> : null}
      <button onClick={download}>Export JSON</button>
      <pre style={{ fontSize: 11, maxHeight: 400, overflow: "auto", background: "#f6f6f6", padding: 8 }}>{JSON.stringify(assembly, null, 2)}</pre>
    </div>
  );
}
```

`packages/frontend/src/components/StatusPanel.tsx`:

```tsx
import { useStore } from "../lib/store";

export function StatusPanel() {
  const { assembly } = useStore();
  if (!assembly) return <p>No project.</p>;
  const fails = assembly.validation.items.filter((i) => i.severity === "fail");
  return (
    <div>
      <h4>Status: {assembly.status}</h4>
      <p>Version: {assembly.version}</p>
      <p>Parts: {assembly.parts.length} · Constraints: {assembly.constraints.length}</p>
      <p>Validation: {assembly.validation.passed ? "✅ passed" : `❌ ${fails.length} failing`}</p>
      <p>Repairs: {assembly.repairHistory.length}</p>
    </div>
  );
}
```

- [ ] **Step 4: Wire all tabs + status panel into App**

Replace the `<section>` body and right `<aside>` in `App.tsx`:

```tsx
import { DrawingView } from "./tabs/DrawingView";
import { SimulationView } from "./tabs/SimulationView";
import { OrchestrationView } from "./tabs/OrchestrationView";
import { TimelineView } from "./tabs/TimelineView";
import { ValidationView } from "./tabs/ValidationView";
import { StateExportView } from "./tabs/StateExportView";
import { StatusPanel } from "./components/StatusPanel";

// section body:
{assembly ? (
  <>
    {activeTab === "drawing" && <DrawingView />}
    {activeTab === "simulation" && <SimulationView />}
    {activeTab === "orchestration" && <OrchestrationView />}
    {activeTab === "timeline" && <TimelineView />}
    {activeTab === "validation" && <ValidationView />}
    {activeTab === "state" && <StateExportView />}
  </>
) : <p>Run a workflow to begin.</p>}

// right aside body:
<StatusPanel />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/frontend && pnpm test`
Expected: PASS (all frontend tests)

- [ ] **Step 6: Compile check**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/tabs packages/frontend/src/components/StatusPanel.tsx packages/frontend/tests/OrchestrationView.test.tsx packages/frontend/tests/TimelineView.test.tsx packages/frontend/src/App.tsx
git commit -m "feat(frontend): add Orchestration/Timeline/Validation/Export views + status panel"
```

---

# PHASE G — Weave Evaluation harness + end-to-end demo

### Task G1: Weave Evaluation (dataset + scorers + run script)

**Files:**
- Create: `packages/backend/eval/dataset.ts`, `packages/backend/eval/scorers.ts`, `packages/backend/eval/runEval.ts`
- Test: `packages/backend/tests/scorers.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/backend/tests/scorers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";
import { validationPass, repairRounds, centerDistanceError } from "../eval/scorers";

const params = { module: 2, teethA: 20, teethB: 20 };

describe("eval scorers", () => {
  it("validationPass reflects final validation", async () => {
    const ok = await runWorkflow("g", params);
    expect(validationPass({ modelOutput: ok })).toBe(true);
  });

  it("repairRounds counts repair history", async () => {
    let s = await runWorkflow("g", params, { seedFailure: true });
    s = await runRepairOnce(s, params);
    expect(repairRounds({ modelOutput: s })).toBeGreaterThanOrEqual(1);
  });

  it("centerDistanceError is ~0 for a passing assembly", async () => {
    const ok = await runWorkflow("g", params);
    expect(centerDistanceError({ modelOutput: ok })).toBeLessThan(0.5);
  });

  it("scorers tolerate an empty state", () => {
    expect(validationPass({ modelOutput: createEmptyState("p", "x") })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/backend && pnpm test scorers`
Expected: FAIL — cannot find module `../eval/scorers`.

- [ ] **Step 3: Write dataset, scorers, runner**

`packages/backend/eval/dataset.ts`:

```typescript
import type { WorkflowParams } from "../src/agents/types";

export interface GearboxCase {
  id: string;
  prompt: string;
  params: WorkflowParams;
  seedFailure: boolean;
  expectedPassAfterRepair: boolean;
}

export const GEARBOX_CASES: GearboxCase[] = [
  { id: "baseline-20-20", prompt: "Create a 2D cube gearbox", params: { module: 2, teethA: 20, teethB: 20 }, seedFailure: false, expectedPassAfterRepair: true },
  { id: "seeded-failure-20-20", prompt: "Create a 2D cube gearbox", params: { module: 2, teethA: 20, teethB: 20 }, seedFailure: true, expectedPassAfterRepair: true },
  { id: "asymmetric-20-30", prompt: "gearbox with a reduction", params: { module: 2, teethA: 20, teethB: 30 }, seedFailure: false, expectedPassAfterRepair: true },
  { id: "fine-module-1-24-24", prompt: "fine-pitch gearbox", params: { module: 1, teethA: 24, teethB: 24 }, seedFailure: true, expectedPassAfterRepair: true },
];
```

`packages/backend/eval/scorers.ts`:

```typescript
import type { AssemblyState, Point } from "@cad/shared";
import { getPart } from "@cad/shared";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function validationPass({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return modelOutput.validation.passed === true;
}

export function repairRounds({ modelOutput }: { modelOutput: AssemblyState }): number {
  return modelOutput.repairHistory.length;
}

export function centerDistanceError({ modelOutput }: { modelOutput: AssemblyState }): number {
  const gA = getPart(modelOutput, "gearA"), gB = getPart(modelOutput, "gearB");
  if (!gA || !gB) return Number.POSITIVE_INFINITY;
  const actual = dist(gA.drawing.center, gB.drawing.center);
  const expected = modelOutput.layout.centerDistance;
  return Math.abs(actual - expected);
}

export function crossViewConsistency({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return ["gearA", "gearB"].every((id) => {
    const p = getPart(modelOutput, id);
    return p ? dist(p.drawing.center, p.simulation.center) <= 0.01 : false;
  });
}

export function clearanceOk({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return !modelOutput.validation.items.some((i) => i.check === "gear_box_clearance" && i.severity === "fail");
}
```

`packages/backend/eval/runEval.ts`:

```typescript
import * as weave from "weave";
import { initObservability } from "../src/obs/weave";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";
import { GEARBOX_CASES, type GearboxCase } from "./dataset";
import { validationPass, repairRounds, centerDistanceError, crossViewConsistency, clearanceOk } from "./scorers";

// model: run the full pipeline, and if it failed, attempt one repair round.
const model = weave.op(async ({ prompt, params, seedFailure }: GearboxCase) => {
  let state = await runWorkflow(prompt, params, { seedFailure });
  if (!state.validation.passed) state = await runRepairOnce(state, params);
  return state;
}, { name: "gearboxModel" });

async function main() {
  await initObservability("assemblycad-ai"); // requires WEAVE_ENABLED=1 + WANDB_API_KEY
  const dataset = new weave.Dataset({ id: "gearbox-cases", rows: GEARBOX_CASES });
  const evaluation = new weave.Evaluation({
    id: "gearbox-eval",
    dataset,
    scorers: [validationPass, repairRounds, centerDistanceError, crossViewConsistency, clearanceOk].map((f) => weave.op(f, { name: f.name })),
  });
  const results = await evaluation.evaluate({ model });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
}

main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/backend && pnpm test scorers`
Expected: PASS (4 passed)

> The runner `runEval.ts` requires a live W&B key (`WEAVE_ENABLED=1 WANDB_API_KEY=… pnpm eval`); it is exercised manually in Task G2. The scorers themselves are unit-tested here without any network.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/eval packages/backend/tests/scorers.test.ts
git commit -m "feat(backend): add Weave Evaluation harness (dataset + scorers + runner)"
```

---

### Task G2: End-to-end demo verification (manual, scripted)

**Files:** create `docs/DEMO.md`; no runtime code.

- [ ] **Step 1: Install + build shared types**

Run: `pnpm install && pnpm --filter @cad/shared build`
Expected: no errors; `@cad/shared` resolvable by both packages.

- [ ] **Step 2: Start backend (Weave on)**

Run: `WEAVE_ENABLED=1 WANDB_API_KEY=<key> pnpm dev:backend`
Expected: "AssemblyCAD backend on :8000"; terminal prints a Weave project URL on first traced call.

- [ ] **Step 3: Start frontend**

Run: `pnpm dev:frontend`
Expected: Vite on `http://localhost:5173`.

- [ ] **Step 4: Run Full Workflow and verify PRD §22.1 metrics**

Click **Run Full Workflow**, confirm:
- [ ] State tab `planText` non-empty (metric 1)
- [ ] 6 part agents in Orchestration View (metric 2)
- [ ] Drawing View shows two gear outlines + box + shafts + lid (metric 3)
- [ ] Simulation View plays; gears rotate (metric 4)
- [ ] Orchestration graph renders with statuses (metric 5)
- [ ] Timeline lists ≥8 events with tools (metric 6)
- [ ] Validation View shows **FAILED** `gear_center_distance` (seeded) (metric 7)

- [ ] **Step 5: Verify Weave trace tree (PRD §22.1 metric 11 + §22.2)**

In the Weave UI (Traces panel), confirm one `runWorkflow` root trace contains nested `DirectorAgent → LayoutPreviewAgent → PartDrawingAgents → SimulationAgent → ValidationAgent` ops, each with input/output captured. Confirm it mirrors the Orchestration View.

- [ ] **Step 6: Repair Once and verify recovery (metrics 8–9)**

Click **Repair Once**, confirm:
- [ ] Repair routing edge appears (RepairCoordinator → LayoutPreviewAgent)
- [ ] Drawing AND Simulation views update with corrected gear centers
- [ ] Validation View now **PASSED**
- [ ] A second `runRepairOnce` trace appears in Weave

- [ ] **Step 7: Run the Weave Evaluation (P1)**

Run: `WEAVE_ENABLED=1 WANDB_API_KEY=<key> pnpm --filter @cad/backend eval`
Expected: prints results JSON; the eval appears in the Weave UI with per-scorer aggregates (validationPass rate, mean repairRounds, mean centerDistanceError).

- [ ] **Step 8: Verify export**

State tab → **Export JSON** downloads `cube-gearbox.json` with the full Assembly State.

- [ ] **Step 9: Full suites one last time**

Run: `pnpm test`
Expected: all shared + backend + frontend tests PASS.

- [ ] **Step 10: Write `docs/DEMO.md` and commit**

Create `docs/DEMO.md` mirroring PRD §21 (Run Full Workflow → observe failure → Repair Once → observe pass → show Weave trace → Export), then:

```bash
git add docs/DEMO.md
git commit -m "docs: add MVP demo script with Weave trace walkthrough"
```

---

## Self-Review

**1. Spec coverage** (PRD → task):
- §0 locked decisions (Node/TS, Vite, JSCAD backend, scripted, Weave) → entire plan stack ✅
- §6.2 parts (box/gearA/gearB/shaftA/shaftB/lid) → C3 roster, C5 drawing ✅
- §6.3 four views + Validation + Export → E2, F1, F2 ✅
- §10 agents (Director/Layout/Part/Sim/Validation/Repair) → C3–C8 ✅
- §11 tools traced → C2 registry + each agent's `recordToolCall`; ops in C9 ✅
- §12 dual view from one state → layout seeds centers (C4); both reprs derived; cross-view check (C7) ✅
- §13.5 Weave (init/tracing P0, eval P1, monitor P2, offline) → C1 wrapper, C9 op-wrapping, D1 init, G1 eval ✅
- §14 Assembly State (parts/constraints/agents/timeline/toolCalls/validation/repairHistory/layout/weaveTraceUrl) → A2 ✅
- §15.1 P0 flow + Weave observability → C9 + D1 + G2 ✅
- §15.2 P1 Weave Evaluation → G1 ✅
- §16 validation (drawing/sim/cross-view) → C7 ✅
- §17 repair (route + 1 round via re-derive) → C8 + C9 ✅
- §18 architecture (Node owns state, Vite derives views, Weave layer) → all tasks ✅
- §20 tech route (Vite, JSCAD backend, Planck, shared state, weave) → A1/B2/E1/F1 ✅
- §22 metrics incl. Weave trace tree (11) + eval pass-rate → G2 ✅

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N"; every code step is complete. ✅

**3. Type consistency:** `AssemblyState`/`Part`/`DrawingRepr`/`SimulationRepr`/`Constraint`/`ValidationItem`/`ValidationReport`/`TimelineEvent`/`AgentState`/`RepairRecord` defined once in `@cad/shared` (A2) and imported everywhere. Function names match across producer/consumer: `runDirector`/`runLayoutPreview`/`runPartDrawingAgents`/`runSimulationAgent`/`runValidationAgent`/`runRepairCoordinator`/`runWorkflow`/`runRepairOnce`, `generateGearOutline`, `buildWorld`, `agentsToNodes`, `recordToolCall`, `op`/`initObservability`. camelCase fields (`teethA`, `boxSize`, `shaftId`, `weaveTraceUrl`) are consistent across BE/FE/eval. ✅

**Intentional approximations (documented in code, allowed by PRD §23):**
- JSCAD gear = root-circle + trapezoidal teeth − bore, outline via `geom2.toOutlines` (§23.1 allows approximate teeth).
- Planck: only gearA motorized; gearB visual coupling omitted (§23.2 — sim validates motion/boundary, not tooth contact).
- Repair re-derives all reprs from layout — simplest correct fix for the seeded center-distance failure; reinforces single-source-of-truth.
- `weaveTraceUrl` is wired in state and surfaced in the UI; populating it from the live Weave client is a small follow-up if the SDK exposes the call URL (otherwise the link points at the project's Traces page).

---
