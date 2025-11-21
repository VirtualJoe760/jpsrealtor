import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
// import { s3Storage } from '@payloadcms/plugin-cloud-storage/s3'
import path from 'path'
import { fileURLToPath } from 'url'
import { Users } from './src/collections/Users'
import { Cities } from './src/collections/Cities'
import { Neighborhoods } from './src/collections/Neighborhoods'
import { Schools } from './src/collections/Schools'
import { BlogPosts } from './src/collections/BlogPosts'
import { Contacts } from './src/collections/Contacts'
import { Media } from './src/collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Editor used by the admin panel
  editor: lexicalEditor({}),

  // Collections
  collections: [
    Users,
    Media,
    Cities,
    Neighborhoods,
    Schools,
    BlogPosts,
    Contacts,
  ],

  // Plugins - conditionally enable cloud storage if env vars are set
  plugins: [
    // TODO: Fix S3 storage plugin import after Step 10
    // The plugin API has changed - needs to use cloudStoragePlugin instead of s3Storage
    // Commented out temporarily since DO_SPACES_BUCKET is not set anyway
    // ...(process.env.DO_SPACES_BUCKET
    //   ? [
    //       s3Storage({
    //         collections: {
    //           media: true,
    //         },
    //         bucket: process.env.DO_SPACES_BUCKET,
    //         config: {
    //           endpoint: process.env.DO_SPACES_ENDPOINT,
    //           region: process.env.DO_SPACES_REGION,
    //           forcePathStyle: false,
    //           credentials: {
    //             accessKeyId: process.env.DO_SPACES_KEY as string,
    //             secretAccessKey: process.env.DO_SPACES_SECRET as string,
    //           },
    //         },
    //       }),
    //     ]
    //   : []),
  ],

  // Secret for JWT tokens
  secret: process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE',

  // TypeScript configuration
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // Database adapter
  db: mongooseAdapter({
    url: process.env.MONGODB_URI as string,
  }),

  // Email configuration - conditionally enable if SMTP credentials are set
  ...(process.env.SMTP_HOST
    ? {
        email: {
          transport: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
          fromName: 'JPS Realtor',
          fromAddress: process.env.EMAIL_FROM as string,
        },
      }
    : {}),

  // Admin configuration
  admin: {
    meta: {
      titleSuffix: '- JPSRealtor CMS',
    },
  },
})
