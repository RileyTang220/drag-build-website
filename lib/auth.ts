// NextAuth configuration
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import logger from './logger'

export const authOptions: NextAuthOptions = {
  // 生产环境必填：在 Vercel 配置 NEXTAUTH_SECRET（如 openssl rand -base64 32）
  secret: process.env.NEXTAUTH_SECRET,
  // 调试：把详细日志打到 Vercel Runtime Logs 里。这是排查 `error=Callback`
  // 的关键 — NextAuth 默认会吞掉 adapter / callback 抛出的错误，只在 URL 上
  // 留一个粗粒度的错误码。开了 debug 之后，stack trace 会落在服务端日志。
  debug: process.env.NODE_ENV !== 'production' || process.env.NEXTAUTH_DEBUG === '1',
  // PrismaAdapter expects the legacy v5 PrismaClient generic shape, but we
  // generate the v7 client with `prisma-client` provider. The runtime contract
  // (the model accessors used by the adapter: User, Account, Session,
  // VerificationToken) is unchanged, so we cast through unknown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as unknown as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      logger.info('[auth] signIn callback', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        hasProfile: Boolean(profile),
      })
      return true
    },
    session: async ({ session, user }) => {
      // With `strategy: 'database'`, `user` is the database user record. If
      // the adapter failed to create/load it, defending against undefined
      // here prevents a hard crash that would otherwise surface as `Callback`.
      if (session?.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
  },
  // Surface every important auth lifecycle event in Vercel logs. When something
  // breaks the URL only carries `error=Callback`; these logs reveal which step.
  events: {
    async signIn(message) {
      logger.info('[auth] event:signIn', {
        userId: message.user?.id,
        provider: message.account?.provider,
        isNewUser: message.isNewUser,
      })
    },
    async createUser(message) {
      logger.info('[auth] event:createUser', { userId: message.user?.id })
    },
    async linkAccount(message) {
      logger.info('[auth] event:linkAccount', {
        userId: message.user?.id,
        provider: message.account?.provider,
      })
    },
    async session(message) {
      logger.info('[auth] event:session', {
        userId: message.session?.user?.id,
      })
    },
  },
  logger: {
    error(code, metadata) {
      logger.error(`[next-auth] ${code}`, metadata)
    },
    warn(code) {
      logger.warn(`[next-auth] ${code}`)
    },
    debug(code, metadata) {
      logger.debug(`[next-auth] ${code}`, metadata)
    },
  },
}
