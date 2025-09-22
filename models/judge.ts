import mongoose, { Schema, type InferSchemaType } from "mongoose"

const JudgeSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    // Judge-specific fields
    expertise: { type: [String], default: [] }, // Areas of expertise
    organization: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type JudgeDoc = InferSchemaType<typeof JudgeSchema>

export default (mongoose.models.Judge as mongoose.Model<JudgeDoc>) || mongoose.model<JudgeDoc>("Judge", JudgeSchema)
