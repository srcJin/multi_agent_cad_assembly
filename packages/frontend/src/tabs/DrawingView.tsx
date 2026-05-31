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
