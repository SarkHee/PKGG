import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '../../../utils/prisma.js';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      // Google 로그인 시 AuthUser upsert
      try {
        await prisma.authUser.upsert({
          where: { googleId: user.id },
          update: { email: user.email, name: user.name, image: user.image },
          create: {
            googleId: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          },
        });
      } catch (e) {
        console.error('[NextAuth] signIn DB error:', e.message);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.googleId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.googleId) {
        session.user.googleId = token.googleId;
        // DB에서 AuthUser 조회해 mainAccountId 포함
        try {
          const dbUser = await prisma.authUser.findUnique({
            where: { googleId: token.googleId },
            select: { id: true, mainAccountId: true },
          });
          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.mainAccountId = dbUser.mainAccountId;
          }
        } catch {}
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};

export default NextAuth(authOptions);
