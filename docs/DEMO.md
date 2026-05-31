# AssemblyCAD AI — MVP Demo Script

Presenter script for the 2D cube gearbox demo. All numbers come from the verified headless run (vitest inject, 2026-05-31).

---

## Prerequisites

- Node 20+ (tested on v25.2.1) and pnpm installed
- `pnpm install` from the repo root

**Optional — W&B Weave live tracing:**
Set `WEAVE_ENABLED=1` and `WANDB_API_KEY=<your-key>` before starting the backend. Without those variables the pipeline runs fully offline in deterministic pass-through mode; every other feature is identical.

---

## Start

Open two terminals in the repo root:

```bash
# Terminal 1 — backend API on :8000
pnpm -C packages/backend dev

# Terminal 2 — frontend on :5173
pnpm -C packages/frontend dev
```

> Note: `pnpm -C packages/backend dev` uses `tsx watch src/server.ts`. The backend
> requires a Node environment where Vite's bundler-mode ESM/CJS interop is available
> (i.e. the test suite via `pnpm test` always works; the live dev server requires the
> same Node + tsx environment used during development).

---

## Demo Flow

Work through these steps in order. Each step maps to a visible UI change.

### 1. Open the app

Navigate to **http://localhost:5173**.

The left sidebar shows the prompt panel with the default text:

> "Create a 2D cube gearbox with two meshing gears inside a box."

Three buttons are visible: **Run Full Workflow**, **Repair Once**, **Reset**.

### 2. Run Full Workflow (with seeded failure)

Click **Run Full Workflow**. The frontend calls `POST /workflow/run` with `seedFailure: true`.

After the call completes, switch through the tabs:

**Drawing tab**
An SVG canvas renders 6 parts: `box` (rectangle), `gearA` (JSCAD parametric gear outline, 20 teeth), `gearB` (20 teeth), `shaftA`, `shaftB`, `lid`. Click any part to highlight it.

**Simulation tab**
Plays the gear animation. `gearA` is motorized (`bodyKind: dynamic`); `gearB`, shafts, and box are static. Gear radii are derived from `pitchRadius(module=2, teeth=20) = 20 mm`.

**Orchestration tab**
React Flow graph of **11 agents**: DirectorAgent, LayoutPreviewAgent, BoxDrawingAgent, GearADrawingAgent, GearBDrawingAgent, ShaftADrawingAgent, ShaftBDrawingAgent, LidDrawingAgent, SimulationAgent, ValidationAgent, RepairCoordinator. Agent statuses are shown (completed / failed / idle).

**Timeline tab**
**10 timeline events** from the run:
1. DirectorAgent — `generate_plan`
2. LayoutPreviewAgent — `layout_preview`
3–8. Six drawing agents — `create_box`, `create_gear` (×2), `create_shaft` (×2), `create_lid`
9. SimulationAgent — `build_simulation` (6 constraints)
10. ValidationAgent — `run_validation`

**Validation tab**
Status: **FAILED**. The seeded failure moves `gearA`'s center 15 mm off its correct position, triggering 3 out of 7 checks as `fail`:
- `gear_center_distance` — actual 55.0 mm vs expected 40.0 mm
- `shaft_alignment` — gearA/shaftA offset 15.00 mm (tolerance 0.1)
- `gear_box_clearance` — gearA collides with box wall

The 4 remaining checks pass (gearB alignment, both containment-pass cases, and drawing/simulation consistency — both views were moved together).

### 3. Repair Once

Click **Repair Once**. The frontend calls `POST /workflow/repair`.

RepairCoordinator iterates the 3 failing checks and routes each to the responsible agent, re-running layout and re-drawing all parts for each issue. This produces **3 repair history records** and **3 new timeline events**.

After repair + re-simulation + re-validation:

- **Orchestration tab** — a repair edge appears from RepairCoordinator to LayoutPreviewAgent; all agent statuses update.
- **Drawing + Simulation tabs** — gearA snaps back to the correct center `(-20, 0)`; gearB remains at `(20, 0)`; center distance restored to 40 mm.
- **Validation tab** — status: **PASSED** (all 7 checks pass).
- **Timeline tab** — now shows **15 total events** (10 original + 3 repair + 1 re-simulation + 1 re-validation).

### 4. State / Export tab

Click the **state** tab:

- **Export JSON** button downloads `cube-gearbox.json` — the full Assembly State (parts, constraints, timeline, repairHistory, validation).
- **View in Weave ↗** link appears only when `WEAVE_ENABLED=1` and `WANDB_API_KEY` are set; it opens the nested trace tree in the W&B Weave UI.

### 5. Reset

Click **Reset** (sidebar). Calls `POST /reset`; a subsequent `GET /state` returns 404. The UI clears back to the initial prompt panel.

---

## Pitch

AI agents don't one-shot a model — a DirectorAgent orchestrates 11 persistent part agents that call drawing, simulation, validation, and repair tools over one shared Assembly State. The seeded center-distance failure is caught by ValidationAgent, routed by RepairCoordinator back to LayoutPreviewAgent, and the entire pipeline re-derives all downstream representations automatically. When Weave is enabled, every `op`-wrapped agent and tool call appears as a nested span in the W&B Weave trace tree, giving full replay and auditability of the multi-agent CAD pipeline.

---

## Headless CLI Equivalent

The demo flow is fully reproducible without a browser using `curl` (requires the dev server running on :8000) or via vitest inject (used for verification above).

### curl commands

```bash
# Step 1: run full workflow with seeded failure
curl -s -X POST http://localhost:8000/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a 2D cube gearbox","params":{"module":2,"teethA":20,"teethB":20},"seedFailure":true}' \
  | jq '{parts: (.parts | length), validation_passed: .validation.passed, timeline_length: (.timeline | length), agents_length: (.agents | length), constraints_length: (.constraints | length)}'
# Expected: {"parts":6,"validation_passed":false,"timeline_length":10,"agents_length":11,"constraints_length":6}

# Step 2: repair once
curl -s -X POST http://localhost:8000/workflow/repair \
  -H "Content-Type: application/json" \
  -d '{"params":{"module":2,"teethA":20,"teethB":20}}' \
  | jq '{validation_passed: .validation.passed, repairHistory_length: (.repairHistory | length), timeline_length: (.timeline | length)}'
# Expected: {"validation_passed":true,"repairHistory_length":3,"timeline_length":15}

# Step 3: check state (200 = active project)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/state
# Expected: 200

# Step 4: reset
curl -s -X POST http://localhost:8000/reset
# Expected: {"status":"reset"}

# Step 5: state after reset (404 = no active project)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/state
# Expected: 404
```

### Observed values (2026-05-31 verification run, vitest inject)

| Call | Field | Observed |
|---|---|---|
| `POST /workflow/run` | `parts.length` | 6 |
| `POST /workflow/run` | `validation.passed` | false |
| `POST /workflow/run` | `timeline.length` | 10 |
| `POST /workflow/run` | `agents.length` | 11 |
| `POST /workflow/run` | `constraints.length` | 6 |
| `POST /workflow/run` | `validation.items.length` | 7 |
| `POST /workflow/repair` | `validation.passed` | true |
| `POST /workflow/repair` | `repairHistory.length` | 3 |
| `POST /workflow/repair` | `timeline.length` | 15 |
| `GET /state` (active) | HTTP status | 200 |
| `GET /state` (after reset) | HTTP status | 404 |

---

## Weave Evaluation (P1)

With a W&B account, run the built-in evaluation harness against the `gearbox-cases` dataset:

```bash
WEAVE_ENABLED=1 WANDB_API_KEY=<your-key> pnpm -C packages/backend eval
```

This runs the gearbox test cases through scorers (`validationPass`, `repairRounds`, `centerDistanceError`, `crossViewConsistency`, `clearance`) and reports the pass-rate in the Weave Evaluation UI. Use the results to compare different layout/repair heuristics without changing production code.

---

## Success Metrics (PRD §22.1)

All 11 demo success criteria, mapped to what the presenter sees and how each is verified.

| # | PRD criterion | Verified by | How to observe |
|---|---|---|---|
| 1 | Director Agent generates a plan | Headless + Browser | Timeline event 1: `generate_plan`; `planText` in state JSON |
| 2 | Multiple Part Agents created/activated | Headless + Browser | `agents.length = 11`; Orchestration tab shows 11 nodes |
| 3 | Parametric gear Drawing View | Browser | Drawing tab: two JSCAD gear outlines with 20 teeth each |
| 4 | Simulation View | Browser | Simulation tab: gear rotation animation, gearA motorized |
| 5 | Agent graph (Orchestration View) | Browser | Orchestration tab: React Flow graph, 11 nodes with status badges |
| 6 | Tool call Timeline | Headless + Browser | `timeline.length = 10` after run; Timeline tab lists all events |
| 7 | Validation FAILED shown | Headless + Browser | `validation.passed = false`; Validation tab shows 3 failing checks |
| 8 | Repair routing shown | Headless + Browser | `repairHistory.length = 3`; Orchestration tab repair edge; Timeline events 11-13 |
| 9 | Drawing + Simulation update after repair | Browser | Both tabs reflect corrected gearA center after Repair Once |
| 10 | This is agent-controlled CAD, not a generator | Browser | Each agent owns parts, modifies state, routes to responsible agent on failure |
| 11 | W&B Weave trace tree visible | Browser (Weave enabled) | "View in Weave ↗" link in State tab; nested span tree in Weave UI |

Items verified by **Headless** are confirmed by the vitest inject run without a browser.
Items requiring **Browser** need the frontend running at http://localhost:5173.
