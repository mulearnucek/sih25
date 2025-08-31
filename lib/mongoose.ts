import mongoose from "mongoose"

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}

const cached = global.__mongooseConn || {
  conn: null as typeof mongoose | null,
  promise: null as Promise<typeof mongoose> | null,
}

export async function connectMongoose() {
  if (cached.conn) return cached.conn
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI")
  const dbName = process.env.MONGODB_DB || "sih"

  if (!cached.promise) {
    mongoose.set("strictQuery", true)
    cached.promise = mongoose.connect(process.env.MONGODB_URI!, { dbName }).then((m) => m)
  }
  cached.conn = await cached.promise
  global.__mongooseConn = cached
  return cached.conn
}
