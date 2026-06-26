import { z } from 'zod'
import { UserRoleSchema } from './enums'

export const JWTPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  tenant_id: z.string().uuid(),
  role: UserRoleSchema,
  iat: z.number(),
  exp: z.number(),
})
export type JWTPayload = z.infer<typeof JWTPayloadSchema>
