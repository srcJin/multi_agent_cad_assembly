export const pitchRadius = (module: number, teeth: number): number => (module * teeth) / 2;
export const outerRadius = (module: number, teeth: number): number => pitchRadius(module, teeth) + module;
export const rootRadius = (module: number, teeth: number): number => pitchRadius(module, teeth) - 1.25 * module;
export const centerDistance = (module: number, teethA: number, teethB: number): number =>
  pitchRadius(module, teethA) + pitchRadius(module, teethB);
