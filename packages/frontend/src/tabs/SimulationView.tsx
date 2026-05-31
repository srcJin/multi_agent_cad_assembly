import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { buildWorld, type WorldHandle } from "../simulation/planckWorld";

export function SimulationView() {
  const { assembly } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const assemblyRef = useRef(assembly);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    assemblyRef.current = assembly;
  }, [assembly]);

  const draw = () => {
    const canvas = canvasRef.current, handle = handleRef.current;
    const a = assemblyRef.current;
    if (!canvas || !handle || !a) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(2, -2);
    for (const [id, body] of Object.entries(handle.bodies)) {
      const pos = body.getPosition(), angle = body.getAngle();
      const r = (a.parts as any[]).find((p) => p.id === id)?.simulation?.radius ?? 2;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.strokeStyle = id.startsWith("gear") ? "#3d6be0" : "#888";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  const step = () => {
    handleRef.current?.world.step(1 / 60);
    draw();
  };

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const loop = () => {
      step();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  useEffect(() => {
    if (assembly) handleRef.current = buildWorld(assembly);
    draw();
  }, [assembly]);

  if (!assembly) return <p>No assembly.</p>;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        <button onClick={step}>Step</button>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={360}
        style={{ background: "#fafafa", border: "1px solid #ddd" }}
      />
    </div>
  );
}
