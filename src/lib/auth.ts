// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
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
    signIn: "/auth/login",
    error: "/auth/login?error=true",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
  async signIn({ user, account, profile }) {
    // Check if this user exists in the database
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email as string }
      });
      
      if (existingUser) {
        // If user exists and this is OAuth login, link the account
        if (account && account.provider !== 'credentials') {
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }
          });
          
          if (!existingAccount) {
            // Link this OAuth account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                type: account.type,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            });
          }
        }
      } else if (user.email) {
        // Create a new user if they don't exist
        console.log(`Creating new user in Prisma for: ${user.email}`);
        await prisma.user.create({
          data: {
            id: user.id as string,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            password: account?.provider !== 'credentials' ? null : undefined,
            image: user.image as string | undefined,
            emailVerified: new Date(), // Mark as verified for OAuth users
          }
        });
      }
      return true;
    } catch (error) {
      console.error("Error in signIn callback:", error);
      return false;
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