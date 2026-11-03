import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is not configured')

const globalForMongo = globalThis as typeof globalThis & {
  __interviewBoxMongo?: Promise<MongoClient>
}

export function getDb() {
  if (!globalForMongo.__interviewBoxMongo) {
    const client = new MongoClient(uri, { maxPoolSize: 10, appName: 'InterviewBox' })
    globalForMongo.__interviewBoxMongo = client.connect()
  }
  const name = process.env.MONGODB_DATABASE || 'interview_box'
  return globalForMongo.__interviewBoxMongo.then((client) => client.db(name))
}
