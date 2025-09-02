import NextAuth, { NextAuthOptions } from "next-auth"
import Google from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Admin credentials
const ADMIN_EMAIL = "admin@sih25.com"
const ADMIN_PASSWORD = "SIH2025@Admin"

// Shared NextAuth configuration (works for current v5 API; fallback logic added for v4)
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email === ADMIN_EMAIL && credentials?.password === ADMIN_PASSWORD) {
          return {
            id: "admin",
            email: ADMIN_EMAIL,
            name: "Admin",
            isAdmin: true
          }
        }
        return null
      }
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
  async jwt({ token, account, profile, user }: { token: any; account?: any; profile?: any; user?: any }) {
      if (account && profile) {
        token.email = (profile as any).email
        token.name = (profile as any).name
        token.picture = (profile as any).picture
      }
      if (user) {
        token.email = user.email
        token.name = user.name
        token.isAdmin = (user as any).isAdmin || false
      }
      return token
    },
  async session({ session, token }: { session: any; token: any }) {
      if (session && token) {
        session.user = {
          ...session.user,
          email: token.email as string,
          name: token.name as string,
          image: token.picture as string | undefined,
          isAdmin: token.isAdmin as boolean || false,
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} as const;

export const auth = NextAuth(authOptions);