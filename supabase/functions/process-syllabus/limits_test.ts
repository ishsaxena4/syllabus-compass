import { assertEquals } from 'jsr:@std/assert@1'
import { countRuns } from './limits.ts'

Deno.test('countRuns counts each batch once and ignores unprocessed uploads', () => {
  const a = '2026-10-13T20:00:00.000Z'
  const b = '2026-10-13T21:00:00.000Z'
  assertEquals(countRuns([a, a, a, b, null]), 2)
  assertEquals(countRuns([]), 0)
})
