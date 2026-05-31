import type { AssemblyState, Part, TimelineEvent, ValidationItem } from "@cad/shared";

export function eventsThroughStep(events: TimelineEvent[], step: number | null): TimelineEvent[] {
  return step === null ? events : events.filter((event) => event.step <= step);
}

export function visiblePartIdsAtStep(assembly: AssemblyState, step: number | null): Set<string> {
  if (step === null) return new Set(assembly.parts.map((part) => part.id));
  const ids = new Set<string>();
  for (const event of eventsThroughStep(assembly.timeline, step)) {
    if (event.tool?.startsWith("create_")) {
      for (const partId of event.affectedParts) ids.add(partId);
    }
  }
  return ids;
}

export function visiblePartsAtStep(assembly: AssemblyState, step: number | null): Part[] {
  const visible = visiblePartIdsAtStep(assembly, step);
  return assembly.parts.filter((part) => visible.has(part.id));
}

export function validationItemsAtStep(assembly: AssemblyState, step: number | null): ValidationItem[] {
  if (step === null) return assembly.validation.items;
  const validationRan = assembly.timeline.some((event) => event.step <= step && event.tool === "run_validation");
  return validationRan ? assembly.validation.items : [];
}
