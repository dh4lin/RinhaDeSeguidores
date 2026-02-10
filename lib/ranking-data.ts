import fs from "fs"
import path from "path"

export interface RankedUserWithPosition {
  position: number
  username: string
  displayName: string
  avatarUrl: string
  victories: number
  isVerified: boolean
}

function parseLines(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  } catch {
    return []
  }
}

function normalizeUsername(raw: string): string {
  return raw.startsWith("@") ? raw.slice(1).toLowerCase() : raw.toLowerCase()
}

function generateDisplayName(username: string): string {
  return username
    .replace(/[_.]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function getRankingData(): RankedUserWithPosition[] {
  const dataDir = path.join(process.cwd(), "data")

  // Read victories
  const victoriesLines = parseLines(path.join(dataDir, "victories.txt"))
  const victoriesMap = new Map<string, number>()
  for (const line of victoriesLines) {
    const username = normalizeUsername(line)
    if (username) {
      victoriesMap.set(username, (victoriesMap.get(username) || 0) + 1)
    }
  }

  // Read verified users
  const verifiedLines = parseLines(path.join(dataDir, "verified.txt"))
  const verifiedSet = new Set(verifiedLines.map(normalizeUsername))

  // Build ranking sorted by victories descending
  const users: RankedUserWithPosition[] = Array.from(victoriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([username, victories], index) => ({
      position: index + 1,
      username: `@${username}`,
      displayName: generateDisplayName(username),
      avatarUrl: `/api/avatar/${username}`,
      victories,
      isVerified: verifiedSet.has(username),
    }))

  return users
}
