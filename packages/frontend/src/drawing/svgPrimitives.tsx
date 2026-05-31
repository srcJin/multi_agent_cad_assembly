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
