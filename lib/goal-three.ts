export function pilotScenario(eligible: number, completed: number, increase: number) {
  const baseline = completed / eligible * 100;
  const target = Math.min(100, baseline + increase);
  const additional = Math.round(eligible * target / 100) - completed;
  return { baseline, target, additional };
}
