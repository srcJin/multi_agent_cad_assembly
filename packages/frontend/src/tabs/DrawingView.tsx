import { useStore } from "../lib/store";
import { PartPolyline } from "../drawing/svgPrimitives";
import { visiblePartsAtStep } from "../lib/stepPreview";

export function DrawingView() {
  const { assembly, selectedPartId, selectPart, previewStep } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const [w, h] = assembly.layout?.boxSize ?? [200, 200];
  const pad = 24;
  const visibleParts = visiblePartsAtStep(assembly, previewStep);

  return (
    <div className="draw-wrap">
      <div className="sim-legend">
        <span className="item"><span className="sw" style={{ background: "#6e8bff" }} /> Gear A</span>
        <span className="item"><span className="sw" style={{ background: "#38d6c8" }} /> Gear B</span>
        <span className="item"><span className="sw" style={{ background: "#d29922" }} /> Shaft</span>
        <span className="item"><span className="sw" style={{ background: "#4a5568" }} /> Box / Lid</span>
        {previewStep !== null && <span className="rpm">preview step {previewStep}</span>}
        <span className="sim-hint" style={{ marginLeft: "auto" }}>click a part to highlight</span>
      </div>
      <div className="draw-frame">
        <svg
          viewBox={`${-w / 2 - pad} ${-h / 2 - pad} ${w + 2 * pad} ${h + 2 * pad}`}
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="scale(1,-1)">
            {visibleParts.map((p) => p.drawing?.outline ? (
              <PartPolyline
                key={p.id}
                id={p.id}
                pts={p.drawing.outline}
                selected={selectedPartId === p.id}
                onClick={() => selectPart(selectedPartId === p.id ? null : p.id)}
              />
            ) : null)}
          </g>
        </svg>
      </div>
    </div>
  );
}
