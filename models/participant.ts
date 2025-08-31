import mongoose, { Schema, type InferSchemaType } from "mongoose"

const ParticipantSchema = new Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    // using Mixed for flexible JSON-driven fields
    fields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type ParticipantDoc = InferSchemaType<typeof ParticipantSchema>

export default (mongoose.models.Participant as mongoose.Model<ParticipantDoc>) ||
  mongoose.model<ParticipantDoc>("Participant", ParticipantSchema)
