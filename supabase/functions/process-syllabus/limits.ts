// Each run costs roughly $0.35 of Anthropic usage and anyone can sign up, so runs are
// capped per user. Ten a day covers setting up a full semester. The database enforces
// the limit in claim_extraction_run() (migration 20261024000000); keep the two in sync.
export const MAX_RUNS_PER_DAY = 10

// Claude's API rejects requests over 32 MB, and files are sent base64-encoded (about
// 4/3 of their size), so a run's files must total under this.
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024

// Claude's API rejects any single image over 5 MB.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// Why a run's files can't be sent to Claude, or null if they can.
export function sizeProblem(files: { name: string; mimeType: string; size: number }[]): string | null {
  const bigImage = files.find(f => f.mimeType.startsWith('image/') && f.size > MAX_IMAGE_BYTES)
  if (bigImage) return `${bigImage.name} is over 5 MB. Images must be under 5 MB; try a smaller photo or a PDF.`
  const total = files.reduce((sum, f) => sum + f.size, 0)
  if (total > MAX_TOTAL_BYTES) return 'These files are over 20 MB in total. Upload fewer or smaller files.'
  return null
}
