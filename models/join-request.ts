import mongoose, { Schema, type InferSchemaType } from "mongoose"

const JoinRequestSchema = new Schema(
  {
    teamId: { type: String, required: true, index: true },
    teamName: { type: String, required: true },
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userDetails: {
      department: { type: String },
      year: { type: String },
      phone: { type: String },
      skills: { type: [String], default: [] }
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected'], 
      default: 'pending',
      index: true 
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type JoinRequestDoc = InferSchemaType<typeof JoinRequestSchema>

export default (mongoose.models.JoinRequest as mongoose.Model<JoinRequestDoc>) ||
  mongoose.model<JoinRequestDoc>("JoinRequest", JoinRequestSchema)
