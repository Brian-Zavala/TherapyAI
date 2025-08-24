// src/lib/custom-prisma-adapter.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/lib/database/prisma-optimized'

// Create the standard adapter
const basePrismaAdapter = PrismaAdapter(prisma)

// Export our custom adapter that uses the renamed session table
export const customPrismaAdapter = {
  ...basePrismaAdapter,
  // Override session methods to use AuthSession table
  createSession: async (data: any) => {
    // @ts-ignore - NextAuth's Session type differs from our DB
    return await prisma.authSession.create({ data })
  },
  getSessionAndUser: async (sessionToken: string) => {
    // @ts-ignore 
    const userAndSession = await prisma.authSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    })
    if (!userAndSession) return null
    const { user, ...session } = userAndSession
    return { user, session }
  },
  updateSession: async (data: any) => {
    // @ts-ignore
    return await prisma.authSession.update({
      where: { sessionToken: data.sessionToken },
      data
    })
  },
  deleteSession: async (sessionToken: string) => {
    // @ts-ignore
    return await prisma.authSession.delete({
      where: { sessionToken }
    })
  }
}