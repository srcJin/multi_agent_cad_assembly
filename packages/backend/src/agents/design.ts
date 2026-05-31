import type { PartType } from "@cad/shared";
import type { WorkflowParams } from "./types";

export type DesignId = "cube-gearbox" | "compound-gearbox" | "idler-transfer";

export interface GearSpec {
  id: string;
  shaftId: string;
  teeth: number;
}

export interface MeshSpec {
  id: string;
  gears: [string, string];
}

export interface DesignSpec {
  id: DesignId;
  projectName: string;
  label: string;
  intent: string;
  parts: ReadonlyArray<[string, PartType, string]>;
  agents: ReadonlyArray<[string, string]>;
  gears: GearSpec[];
  meshes: MeshSpec[];
}

const BASE_AGENTS: ReadonlyArray<[string, string]> = [
  ["DirectorAgent", "Director"],
  ["LayoutPreviewAgent", "Layout"],
  ["SimulationAgent", "Simulation"],
  ["ValidationAgent", "Validation"],
  ["RepairCoordinator", "Repair"],
];

function partAgent(partId: string): string {
  return `${partId[0].toUpperCase()}${partId.slice(1)}DrawingAgent`;
}

function roleFor(partId: string): string {
  return `Part:${partId}`;
}

function part(partId: string, type: PartType): [string, PartType, string] {
  return [partId, type, partAgent(partId)];
}

function buildAgents(parts: ReadonlyArray<[string, PartType, string]>): ReadonlyArray<[string, string]> {
  const drawingAgents = parts.map(([id, , agent]) => [agent, roleFor(id)] as [string, string]);
  return [
    BASE_AGENTS[0],
    BASE_AGENTS[1],
    ...drawingAgents,
    BASE_AGENTS[2],
    BASE_AGENTS[3],
    BASE_AGENTS[4],
  ];
}

export function resolveDesign(params: WorkflowParams, prompt = ""): DesignSpec {
  const promptHintsCompound = /compound|complex|four|4|reduction|multi/i.test(prompt);
  const promptHintsIdler = /idler|transfer|three|3|reverse/i.test(prompt);
  const id: DesignId = params.designId ?? (promptHintsCompound ? "compound-gearbox" : promptHintsIdler ? "idler-transfer" : "cube-gearbox");

  if (id === "compound-gearbox") {
    const parts = [
      part("box", "box"),
      part("gearA", "gear"),
      part("gearB", "gear"),
      part("gearC", "gear"),
      part("gearD", "gear"),
      part("shaftA", "shaft"),
      part("shaftB", "shaft"),
      part("shaftC", "shaft"),
      part("lid", "lid"),
    ] as const;

    return {
      id,
      projectName: "compound-gearbox",
      label: "Compound reduction gearbox",
      intent: "2D compound gearbox: input gear drives an intermediate compound shaft, then a second mesh drives the output shaft inside a shared housing.",
      parts,
      agents: buildAgents(parts),
      gears: [
        { id: "gearA", shaftId: "shaftA", teeth: params.teethA },
        { id: "gearB", shaftId: "shaftB", teeth: params.teethB },
        { id: "gearC", shaftId: "shaftB", teeth: params.teethC ?? 14 },
        { id: "gearD", shaftId: "shaftC", teeth: params.teethD ?? 32 },
      ],
      meshes: [
        { id: "mesh-AB", gears: ["gearA", "gearB"] },
        { id: "mesh-CD", gears: ["gearC", "gearD"] },
      ],
    };
  }

  if (id === "idler-transfer") {
    const parts = [
      part("box", "box"),
      part("gearA", "gear"),
      part("gearB", "gear"),
      part("gearC", "gear"),
      part("shaftA", "shaft"),
      part("shaftB", "shaft"),
      part("shaftC", "shaft"),
      part("lid", "lid"),
    ] as const;

    return {
      id,
      projectName: "idler-transfer",
      label: "Idler transfer gearbox",
      intent: "2D idler transfer gearbox: an input gear drives a center idler gear, which reverses through a second mesh to the output gear on a third shaft.",
      parts,
      agents: buildAgents(parts),
      gears: [
        { id: "gearA", shaftId: "shaftA", teeth: params.teethA },
        { id: "gearB", shaftId: "shaftB", teeth: params.teethB },
        { id: "gearC", shaftId: "shaftC", teeth: params.teethC ?? 24 },
      ],
      meshes: [
        { id: "mesh-AB", gears: ["gearA", "gearB"] },
        { id: "mesh-BC", gears: ["gearB", "gearC"] },
      ],
    };
  }

  const parts = [
    part("box", "box"),
    part("gearA", "gear"),
    part("gearB", "gear"),
    part("shaftA", "shaft"),
    part("shaftB", "shaft"),
    part("lid", "lid"),
  ] as const;

  return {
    id,
    projectName: "cube-gearbox",
    label: "Cube gearbox",
    intent: "2D cube gearbox: two meshing gears on fixed shafts inside a box, no collision.",
    parts,
    agents: buildAgents(parts),
    gears: [
      { id: "gearA", shaftId: "shaftA", teeth: params.teethA },
      { id: "gearB", shaftId: "shaftB", teeth: params.teethB },
    ],
    meshes: [{ id: "mesh-AB", gears: ["gearA", "gearB"] }],
  };
}

export function gearSpecFor(params: WorkflowParams, prompt: string, partId: string): GearSpec | undefined {
  return resolveDesign(params, prompt).gears.find((gear) => gear.id === partId);
}
