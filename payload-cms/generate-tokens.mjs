import { getPayload } from 'payload'
import config from './payload.config.js'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

async function generateTokens() {
  try {
    console.log('Initializing Payload...')

    const payload = await getPayload({ config })

    console.log('Payload initialized successfully')
    console.log('')

    // Generate random secure passwords
    const publicPassword = crypto.randomBytes(32).toString('hex')
    const privatePassword = crypto.randomBytes(32).toString('hex')

    console.log('Creating public API user...')

    // Create public API user
    let publicUser
    try {
      publicUser = await payload.create({
        collection: 'users',
        data: {
          email: 'public-api@system.local',
          password: publicPassword,
          role: 'agent'
        }
      })
      console.log('✓ Public API user created')
    } catch (error) {
      if (error.message && error.message.includes('duplicate')) {
        console.log('Public API user already exists, fetching...')
        const users = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: 'public-api@system.local'
            }
          }
        })
        publicUser = users.docs[0]
      } else {
        throw error
      }
    }

    console.log('Creating private API user...')

    // Create private API user
    let privateUser
    try {
      privateUser = await payload.create({
        collection: 'users',
        data: {
          email: 'private-api@system.local',
          password: privatePassword,
          role: 'admin'
        }
      })
      console.log('✓ Private API user created')
    } catch (error) {
      if (error.message && error.message.includes('duplicate')) {
        console.log('Private API user already exists, fetching...')
        const users = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: 'private-api@system.local'
            }
          }
        })
        privateUser = users.docs[0]
      } else {
        throw error
      }
    }

    console.log('')
    console.log('Logging in to generate JWT tokens...')
    console.log('')

    // Login to generate JWT tokens
    const publicLogin = await payload.login({
      collection: 'users',
      data: {
        email: 'public-api@system.local',
        password: publicPassword
      }
    })

    const privateLogin = await payload.login({
      collection: 'users',
      data: {
        email: 'private-api@system.local',
        password: privatePassword
      }
    })

    console.log('========================================')
    console.log('API TOKENS GENERATED SUCCESSFULLY')
    console.log('========================================')
    console.log('')
    console.log('PUBLIC API TOKEN:')
    console.log(publicLogin.token)
    console.log('')
    console.log('PRIVATE API TOKEN:')
    console.log(privateLogin.token)
    console.log('')
    console.log('========================================')
    console.log('Save these tokens to your .env file')
    console.log('========================================')

    process.exit(0)
  } catch (error) {
    console.error('Error generating tokens:', error)
    process.exit(1)
  }
}

generateTokens()
