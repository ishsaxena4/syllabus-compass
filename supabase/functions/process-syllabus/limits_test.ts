import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { MAX_IMAGE_BYTES, MAX_TOTAL_BYTES, sizeProblem } from './limits.ts'

const MB = 1024 * 1024

Deno.test('sizeProblem accepts files within both limits', () => {
  assertEquals(sizeProblem([
    { name: 'syllabus.pdf', mimeType: 'application/pdf', size: 8 * MB },
    { name: 'schedule.png', mimeType: 'image/png', size: MAX_IMAGE_BYTES },
  ]), null)
  assertEquals(sizeProblem([]), null)
})

Deno.test('sizeProblem rejects an image over 5 MB, even when the total is small', () => {
  const problem = sizeProblem([{ name: 'photo.jpg', mimeType: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 }])
  assertStringIncludes(problem ?? '', 'photo.jpg')
})

Deno.test('sizeProblem rejects files over 20 MB in total', () => {
  const half = MAX_TOTAL_BYTES / 2
  assertEquals(sizeProblem([
    { name: 'a.pdf', mimeType: 'application/pdf', size: half },
    { name: 'b.pdf', mimeType: 'application/pdf', size: half },
  ]), null)
  assertStringIncludes(sizeProblem([
    { name: 'a.pdf', mimeType: 'application/pdf', size: half },
    { name: 'b.pdf', mimeType: 'application/pdf', size: half + 1 },
  ]) ?? '', '20 MB')
})
