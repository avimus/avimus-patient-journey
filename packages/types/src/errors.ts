import { z } from 'zod'

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
