import mongoose, { Schema, type InferSchemaType } from "mongoose"

const PresentationSchema = new Schema(
  {
    teamId: { type: String, required: true, index: true },
    teamName: { type: String, required: true },
    order: { type: Number, required: true, index: true }, // Presentation order
    status: {
      type: String,
      enum: ["waiting", "presenting", "completed", "skipped"],
      default: "waiting",
      index: true,
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    timerDuration: { type: Number, default: 600 }, // 10 minutes in seconds
    isParticipating: { type: Boolean, default: true }, // Whether team is actually participating
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type PresentationDoc = InferSchemaType<typeof PresentationSchema>

export default (mongoose.models.Presentation as mongoose.Model<PresentationDoc>) ||
  mongoose.model<PresentationDoc>("Presentation", PresentationSchema)
