import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // query logging disabled: too chatty for the dev loop (see docs/observability)
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db