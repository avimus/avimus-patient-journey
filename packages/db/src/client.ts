import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

const basePrisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma
}

export function createPrismaClient(tenantId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async findFirst({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async findUnique({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          const result = await query(args) as Record<string, unknown> | null
          if (result && 'tenantId' in result && result.tenantId !== tenantId) {
            return null
          }
          return result
        },
        async update({ args, query }: { args: { where?: Record<string, unknown>; data?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async updateMany({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async delete({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async deleteMany({ args, query }: { args: { where?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        async create({ args, query }: { args: { data?: Record<string, unknown> }; query: (a: unknown) => Promise<unknown> }) {
          if (args.data) {
            args.data.tenantId = tenantId
          }
          return query(args)
        },
      },
    },
  })
}

export type TenantPrismaClient = ReturnType<typeof createPrismaClient>

export { basePrisma }
