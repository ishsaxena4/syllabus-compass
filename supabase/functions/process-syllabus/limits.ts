// Each run costs roughly $0.35 of Anthropic usage and anyone can sign up, so runs are
// capped per user. Ten a day covers setting up a full semester.
export const MAX_RUNS_PER_DAY = 10

// A run stamps the same processed_at on every upload in its batch, so distinct
// timestamps in the window are distinct runs.
export function countRuns(processedAt: (string | null)[]): number {
  return new Set(processedAt.filter(Boolean)).size
}
