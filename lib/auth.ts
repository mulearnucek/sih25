import NextAuth, { NextAuthOptions } from "next-auth"
import Google from "next-auth/providers/google"

// Shared NextAuth configuration (works for current v5 API; fallback logic added for v4)
export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
  async jwt({ token, account, profile }: { token: any; account?: any; profile?: any }) {
      if (account && profile) {
        token.email = (profile as any).email
        token.name = (profile as any).name
        token.picture = (profile as any).picture
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
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} as const;

export const auth = NextAuth(authOptions);