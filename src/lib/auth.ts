// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { compare } from "bcrypt"

export const authOptions: NextAuthOptions = {
  debug: true, // Helpful for troubleshooting
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Return the user with ID explicitly included
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
 
callbacks: {
  async signIn({ user, account }) {
    // Check if this user exists in the database, and create them if not
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email as string }
      });
      
      if (!existingUser && user.email) {
        // Create a basic user in Prisma if they don't exist
        // This ensures all authenticated users have a corresponding database entry
        console.log(`Creating new user in Prisma for: ${user.email}`);
        await prisma.user.create({
          data: {
            id: user.id as string,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            // For credential provider, the password should already be handled
            // But for other providers, we use a placeholder
            password: account?.provider !== 'credentials' ? 'OAUTH_USER' : undefined,
          }
        });
      }
      return true;
    } catch (error) {
      console.error("Error in signIn callback:", error);
      // Still allow sign in for better UX, but log the error
      return true;
    }
  },
  session: ({ session, token }) => {
    return {
      ...session,
      user: {
        ...session.user,
        id: token.id || token.sub, // Use token.id which we set in jwt callback, or token.sub as fallback
      }
    }
  },
  jwt: ({ token, user }) => {
    // Only add user data if available (during sign-in)
    if (user) {
      token.id = user.id
    }
    return token
  },
},
}