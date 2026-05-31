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
  outline: Point[] | null;
}

export interface SimulationRepr {
  center: Point;
  radius: number;
  shaftId: string | null;
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
  boxSize: Point;
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
  weaveTraceUrl: string | null;
}
