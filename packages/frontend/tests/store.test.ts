import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../src/lib/store";

describe("store", () => {
  beforeEach(() => useStore.getState().reset());

  it("starts null on the drawing tab", () => {
    expect(useStore.getState().assembly).toBeNull();
    expect(useStore.getState().activeTab).toBe("drawing");
  });

  it("setAssembly + setTab + selectPart", () => {
    useStore.getState().setAssembly({ projectName: "p", parts: [] } as any);
    useStore.getState().setTab("simulation");
    useStore.getState().selectPart("gearA");
    const st = useStore.getState();
    expect(st.assembly?.projectName).toBe("p");
    expect(st.activeTab).toBe("simulation");
    expect(st.selectedPartId).toBe("gearA");
  });
});
