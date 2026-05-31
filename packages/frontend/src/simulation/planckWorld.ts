import { World, Vec2, Circle, RevoluteJoint } from "planck";
import type { AssemblyState } from "@cad/shared";
import type { Body, RevoluteJoint as RevoluteJointType } from "planck";

export interface WorldHandle {
  world: InstanceType<typeof World>;
  bodies: Record<string, Body>;
}

// Abstract mechanism: gears = dynamic circles pinned to a shaft via a revolute
// joint; gearA is motorized; box/shaft are static. No tooth-on-tooth contact.
export function buildWorld(assembly: AssemblyState): WorldHandle {
  const world = new World({ gravity: new Vec2(0, 0) });
  const bodies: Record<string, Body> = {};

  for (const p of assembly.parts) {
    const sim = (p as any).simulation;
    const body = world.createBody({
      type: sim.bodyKind === "dynamic" ? "dynamic" : "static",
      position: new Vec2(sim.center[0], sim.center[1]),
    });
    if ((p as any).type === "gear") {
      body.createFixture({ shape: new Circle(sim.radius), density: 1, friction: 0.3 });
    } else if ((p as any).type === "shaft") {
      body.createFixture({ shape: new Circle(Math.max(0.5, sim.radius)), density: 1 });
    }
    bodies[p.id] = body;
  }

  for (const p of assembly.parts) {
    if ((p as any).type === "gear" && (p as any).simulation?.shaftId) {
      const gear = bodies[p.id];
      const shaft = bodies[(p as any).simulation.shaftId];
      if (gear && shaft) {
        const joint = world.createJoint(
          new RevoluteJoint({ enableMotor: false }, shaft, gear, gear.getPosition())
        ) as RevoluteJointType | null;
        if (p.id === "gearA" && joint) {
          joint.enableMotor(true);
          joint.setMotorSpeed(1.5);
          joint.setMaxMotorTorque(1000);
        }
      }
    }
  }
  return { world, bodies };
}
