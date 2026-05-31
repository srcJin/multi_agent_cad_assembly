import type { Point } from "@cad/shared";

export const pointsToAttr = (pts: Point[]): string => pts.map(([x, y]) => `${x},${y}`).join(" ");

const FILL: Record<string, string> = {
  gearA: "rgba(110,139,255,0.16)",
  gearB: "rgba(56,214,200,0.16)",
};
const STROKE: Record<string, string> = {
  gearA: "#6e8bff",
  gearB: "#38d6c8",
  box: "#4a5568",
  lid: "#6b7689",
  shaftA: "#d29922",
  shaftB: "#d29922",
};

export function PartPolyline({ id, pts, selected, onClick }: { id: string; pts: Point[]; selected: boolean; onClick: () => void }) {
  const base = STROKE[id] ?? "#9aa7b8";
  return (
    <polyline
      data-part-id={id}
      points={pointsToAttr(pts)}
      fill={FILL[id] ?? "none"}
      stroke={selected ? "#f0883e" : base}
      strokeWidth={selected ? 1.8 : 0.9}
      strokeLinejoin="round"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    />
  );
}
