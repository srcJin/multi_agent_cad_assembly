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
