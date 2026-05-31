import { useEffect, useRef } from "react";
import { useStore } from "../lib/store";
import { buildWorld, type WorldHandle } from "../simulation/planckWorld";
import type { AssemblyState, Point } from "@cad/shared";
import { visiblePartsAtStep } from "../lib/stepPreview";

const W = 680;
const H = 460;

const DRIVE_SPEED = 0.9; // rad/s of the driving gear (gearA)

export function SimulationView() {
  const { assembly, playing, setPlaying, previewStep } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const assemblyRef = useRef<AssemblyState | null>(assembly);
  const angleRef = useRef(0);        // accumulated drive angle (gearA)
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => { assemblyRef.current = assembly; }, [assembly]);

  // Kinematic rotation: gearA spins at a fixed rate; gearB counter-rotates by the
  // gear ratio so the mesh reads correctly. Real dynamics aren't the point here
  // (PRD §23.2 — the sim view validates motion *relationships*, not torque).
  const renderAngle = (id: string): number => {
    const a = assemblyRef.current;
    if (id === "gearA") return angleRef.current;
    const rA = a?.parts.find((p) => p.id === "gearA")?.simulation.radius ?? 1;
    const rB = a?.parts.find((p) => p.id === "gearB")?.simulation.radius ?? 1;
    const gearBAngle = -angleRef.current * (rA / rB);
    if (id === "gearB") return gearBAngle;
    if (id === "gearC" && a?.projectName !== "compound-gearbox") {
      const rC = a?.parts.find((p) => p.id === "gearC")?.simulation.radius ?? 1;
      return -gearBAngle * (rB / rC);
    }
    if (id === "gearC") return gearBAngle;
    if (id === "gearD") {
      const rC = a?.parts.find((p) => p.id === "gearC")?.simulation.radius ?? 1;
      const rD = a?.parts.find((p) => p.id === "gearD")?.simulation.radius ?? 1;
      return -gearBAngle * (rC / rD);
    }
    return 0;
  };

  const draw = () => {
    const canvas = canvasRef.current, a = assemblyRef.current;
    if (!canvas || !a) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const [bw, bh] = a.layout?.boxSize ?? [200, 200];
    const scale = Math.min(W / (bw * 1.25), H / (bh * 1.25));

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, -scale); // model +y up
    ctx.lineJoin = "round";

    const colorFor = (id: string, type: string) => {
      if (id === "gearA") return "#6e8bff";
      if (id === "gearB") return "#38d6c8";
      if (id === "gearC") return "#d29922";
      if (id === "gearD") return "#f85149";
      if (type === "box") return "#3a4254";
      if (type === "shaft") return "#d29922";
      return "#586069";
    };

    const drawPoly = (pts: Point[], pivot: Point, angle: number, stroke: string, fill?: string) => {
      const c = Math.cos(angle), s = Math.sin(angle);
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const dx = x - pivot[0], dy = y - pivot[1];
        const rx = pivot[0] + dx * c - dy * s;
        const ry = pivot[1] + dx * s + dy * c;
        if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      });
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke();
    };

    // draw box & lid first (background), then shafts, then gears on top
    const order = (t: string) => (t === "box" ? 0 : t === "lid" ? 1 : t === "shaft" ? 2 : 3);
    const parts = [...visiblePartsAtStep(a, previewStep)].sort((p, q) => order(p.type) - order(q.type));

    for (const part of parts) {
      const outline = part.drawing?.outline;
      if (!outline || outline.length < 2) continue;
      const pivot = part.drawing.center as Point;
      const angle = part.type === "gear" ? renderAngle(part.id) : 0;
      const col = colorFor(part.id, part.type);
      const fill = part.type === "gear"
        ? (part.id === "gearA" ? "rgba(110,139,255,0.18)" : part.id === "gearB" ? "rgba(56,214,200,0.18)" : part.id === "gearC" ? "rgba(210,153,34,0.16)" : "rgba(248,81,73,0.14)")
        : part.type === "shaft" ? "rgba(210,153,34,0.5)" : undefined;
      drawPoly(outline, pivot, angle, col, fill);

      // gear hub + spoke to show rotation
      if (part.type === "gear") {
        const r = part.simulation.radius;
        const c = Math.cos(angle), s = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(pivot[0], pivot[1]);
        ctx.lineTo(pivot[0] + r * 0.7 * c, pivot[1] + r * 0.7 * s);
        ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath();
        ctx.arc(pivot[0], pivot[1], Math.max(1.2, r * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }
    }
    ctx.restore();
  };

  // advance one fixed tick (also steps the physics world so it stays a real sim)
  const step = () => {
    angleRef.current += DRIVE_SPEED / 60;
    handleRef.current?.world.step(1 / 60);
    draw();
  };

  // rebuild world + redraw whenever the assembly changes
  useEffect(() => {
    if (assembly) { handleRef.current = buildWorld(assembly); draw(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembly, previewStep]);

  // animation loop driven by shared `playing` flag — time-based so motion is
  // smooth and frame-rate independent.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      return;
    }
    const loop = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.05, (ts - last) / 1000); // clamp big gaps
      lastTsRef.current = ts;
      angleRef.current += DRIVE_SPEED * dt;
      handleRef.current?.world.step(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!assembly) return <p>No assembly.</p>;

  return (
    <div className="sim-wrap">
      <div className="sim-toolbar">
        <button
          className={`btn btn-lg ${playing ? "" : "btn-accent"}`}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "⏸ Pause" : "✦ Animate"}
        </button>
        <button className="btn" onClick={step} disabled={playing}>⏭ Step</button>
        <span className="rpm">{playing ? "running · gearA motorized" : "paused"}</span>
        {previewStep !== null && <span className="rpm">preview step {previewStep}</span>}
        <div className="sim-legend" style={{ marginLeft: "auto" }}>
          <span className="item"><span className="sw" style={{ background: "#6e8bff" }} /> Gear A</span>
          <span className="item"><span className="sw" style={{ background: "#38d6c8" }} /> Gear B</span>
          {assembly.parts.some((part) => part.id === "gearC") && <span className="item"><span className="sw" style={{ background: "#d29922" }} /> Gear C</span>}
          {assembly.parts.some((part) => part.id === "gearD") && <span className="item"><span className="sw" style={{ background: "#f85149" }} /> Gear D</span>}
          <span className="item"><span className="sw" style={{ background: "#d29922" }} /> Shaft</span>
          <span className="item"><span className="sw" style={{ background: "#3a4254" }} /> Box</span>
        </div>
      </div>

      <div className="sim-canvas-frame" style={{ width: W, height: H }}>
        <canvas ref={canvasRef} width={W} height={H} />
      </div>

      <p className="sim-hint">
        Abstract rigid-body view (Planck.js): gears are circles pinned to fixed shafts by revolute joints.
        Gear A is motorized; Gear B counter-rotates by the gear ratio. This is the simulation projection of
        the same Assembly State the Drawing view renders.
      </p>
    </div>
  );
}
