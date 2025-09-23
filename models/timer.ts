import mongoose, { Schema, type InferSchemaType } from "mongoose"

const TimerSchema = new Schema(
  {
    currentTime: { type: Number, required: true, default: 600 }, // 10 minutes in seconds
    isActive: { type: Boolean, required: true, default: false },
    currentTeam: { type: String, default: null },
    lastUpdate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type TimerDoc = InferSchemaType<typeof TimerSchema>

export default (mongoose.models.Timer as mongoose.Model<TimerDoc>) || mongoose.model<TimerDoc>("Timer", TimerSchema)
