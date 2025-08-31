import mongoose, { Schema, type InferSchemaType } from "mongoose"

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
    leaderUserId: { type: String, required: true, index: true },
    memberUserIds: { type: [String], default: [], index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type TeamDoc = InferSchemaType<typeof TeamSchema>

export default (mongoose.models.Team as mongoose.Model<TeamDoc>) || mongoose.model<TeamDoc>("Team", TeamSchema)
