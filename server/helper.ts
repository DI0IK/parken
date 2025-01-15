export function parseIDs(ids: string): number[] {
  return ids
    .split(",")
    .map((id) => Number(id))
    .filter((id) => !isNaN(id));
}
