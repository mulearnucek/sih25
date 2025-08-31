import { MongoClient, type Db } from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null
let connecting: Promise<void> | null = null

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var __mongoDb: Db | undefined
}

async function ensureIndexes(database: Db) {
  await database.collection("participants").createIndex({ email: 1 }, { unique: true })
  await database.collection("participants").createIndex({ userId: 1 }, { unique: true })
  await database.collection("teams").createIndex({ name: 1 }, { unique: true })
  await database.collection("teams").createIndex({ inviteCode: 1 }, { unique: true })
}

export async function getDb() {
  if (db) return db

  if (global.__mongoDb) {
    db = global.__mongoDb
    return db
  }

  if (!connecting) {
    connecting = (async () => {
      const uri = process.env.MONGODB_URI
      const dbName = process.env.MONGODB_DB || "sih-internals"
      if (!uri) throw new Error("Missing MONGODB_URI")
      client = global.__mongoClient ?? new MongoClient(uri)
      if (!global.__mongoClient) {
        await client.connect()
        global.__mongoClient = client
      }
      db = global.__mongoDb ?? client.db(dbName)
      global.__mongoDb = db
      await ensureIndexes(db!)
    })()
  }
  await connecting
  return db!
}
