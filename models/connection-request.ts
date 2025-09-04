import mongoose, { Schema, type InferSchemaType } from "mongoose"

const ConnectionRequestSchema = new Schema(
  {
    fromEmail: { type: String, required: true, index: true },
    fromName: { type: String, required: true },
    toEmail: { type: String, required: true, index: true },
    toName: { type: String, required: true },
    fromUserDetails: {
      department: { type: String },
      year: { type: String },
      phone: { type: String },
      skills: { type: [String], default: [] }
    },
    status: { 
      type: String, 
      enum: ['pending', 'connected', 'declined'], 
      default: 'pending',
      index: true 
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

export type ConnectionRequestDoc = InferSchemaType<typeof ConnectionRequestSchema>

export default (mongoose.models.ConnectionRequest as mongoose.Model<ConnectionRequestDoc>) ||
  mongoose.model<ConnectionRequestDoc>("ConnectionRequest", ConnectionRequestSchema)
