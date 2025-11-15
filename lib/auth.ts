import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { connectDB, User, Site } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb-client'

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        await connectDB()
        const user = await User.findOne({ email: credentials.email })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Create a default site for new users
      try {
        await connectDB()
        
        const siteId = `${user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'site'}-${crypto.randomBytes(3).toString('hex')}`
        const apiKey = crypto.randomBytes(24).toString('hex')

        await Site.create({
          site_id: siteId,
          api_key: apiKey,
          name: `${user.name}'s Website` || 'My Website',
          user_id: user.id,
        })

        console.log(`Created default site for user ${user.id}: ${siteId}`)
      } catch (error) {
        console.error('Error creating default site:', error)
      }
    },
  },
}
