export function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export type Gender = "male" | "female" | "non-binary"

export function canJoinPreservingFemaleRequirement(currentGenders: Gender[], joining: Gender, maxSize = 6) {
  const hasFemale = currentGenders.includes("female")
  const size = currentGenders.length
  if (size < maxSize - 1) return true
  if (size === maxSize - 1) {
    if (hasFemale) return true
    return joining === "female"
  }
  return false
}
