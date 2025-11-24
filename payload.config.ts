import sharp from 'sharp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { buildConfig } from 'payload'

export default buildConfig({
  // Editor for rich text fields
  editor: lexicalEditor(),

  // Collections - we'll add these later
  collections: [],

  // Payload secret - MUST be a complex, secure string
  secret: process.env.PAYLOAD_SECRET || '',

  // MongoDB database adapter
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),

  // Image processing with Sharp
  sharp,

  // Server URL configuration
  serverURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',

  // CORS configuration for API access
  cors: [
    'http://localhost:3000',
    'https://chatrealty.io',
    'https://www.chatrealty.io',
  ],

  // CSRF protection
  csrf: [
    'http://localhost:3000',
    'https://chatrealty.io',
    'https://www.chatrealty.io',
  ],
})
