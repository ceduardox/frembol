export function recordHasArea(
  record: { jobKind: string; tasks: { area: string }[] },
  ...areas: string[]
): boolean {
  return areas.includes(record.jobKind) || record.tasks.some((task) => areas.includes(task.area))
}
