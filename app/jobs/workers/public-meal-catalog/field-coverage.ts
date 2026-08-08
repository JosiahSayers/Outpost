// Tracks, across one import run, how many processed items came out with a
// given field still null after merging. Feeds detectSystemicFieldFailures
// below -- entirely in-memory, no persisted run-history table, since all we
// need is "did this run fail systematically," not a historical trend.
export interface FieldCoverageTracker {
  record(row: Record<string, unknown>): void;
  counts(): Record<string, number>;
}

export function createFieldCoverageTracker(
  fields: string[],
): FieldCoverageTracker {
  const nullCounts: Record<string, number> = Object.fromEntries(
    fields.map((field) => [field, 0]),
  );

  return {
    record(row) {
      for (const field of fields) {
        if (row[field] === null || row[field] === undefined) {
          nullCounts[field]!++;
        }
      }
    },
    counts() {
      return { ...nullCounts };
    },
  };
}

// Returns the field names that were null for every single processed item --
// a signal a vendor's page structure changed (the parser broke outright)
// rather than routine per-product gaps. Gated on a minimum run size so a
// tiny/degenerate run (e.g. the vendor's catalog page returned 1 item due to
// a transient issue) doesn't false-positive.
export function detectSystemicFieldFailures(
  nullCounts: Record<string, number>,
  totalProcessed: number,
  minRunSize = 3,
): string[] {
  if (totalProcessed < minRunSize) {
    return [];
  }

  return Object.entries(nullCounts)
    .filter(([, count]) => count === totalProcessed)
    .map(([field]) => field);
}
