import mongoose, { Schema, type InferSchemaType } from "mongoose"

const ScoreSchema = new Schema(
  {
    teamId: { type: String, required: true, index: true },
    teamName: { type: String, required: true },
    judgeId: { type: String, required: true, index: true },
    judgeName: { type: String, required: true },
    // Scoring criteria - flexible structure to handle any rubric configuration
    scores: { type: Schema.Types.Mixed, default: {} },
    totalScore: { type: Number, default: 0 },
    comments: { type: String, default: "" },
    isSubmitted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
)

// Compound index for unique judge-team scoring
ScoreSchema.index({ teamId: 1, judgeId: 1 }, { unique: true })

export type ScoreDoc = InferSchemaType<typeof ScoreSchema>

export default (mongoose.models.Score as mongoose.Model<ScoreDoc>) || mongoose.model<ScoreDoc>("Score", ScoreSchema)
