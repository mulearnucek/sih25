import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  providers: [
    Google,
    // Requires AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = (profile as any).email
        token.name = (profile as any).name
        token.picture = (profile as any).picture
      }
      return token
    },
    async session({ session, token }) {
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
})
