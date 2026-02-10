import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const CACHE = new Map<string, { data: ArrayBuffer; contentType: string; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24h

async function fetchInstagramAvatar(username: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  // Strategy 1
  try {
    const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const json = await res.json()
      const picUrl =
        json?.graphql?.user?.profile_pic_url_hd ||
        json?.graphql?.user?.profile_pic_url

      if (picUrl) {
        const imgRes = await fetch(picUrl, { signal: AbortSignal.timeout(5000) })
        if (imgRes.ok) {
          const data = await imgRes.arrayBuffer()
          return { data, contentType: imgRes.headers.get("content-type") || "image/jpeg" }
        }
      }
    }
  } catch {}

  // Strategy 2
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const html = await res.text()
      const match = html.match(/<meta property="og:image" content="([^"]+)"/)

      if (match?.[1]) {
        const imgRes = await fetch(match[1], { signal: AbortSignal.timeout(5000) })
        if (imgRes.ok) {
          const data = await imgRes.arrayBuffer()
          return { data, contentType: imgRes.headers.get("content-type") || "image/jpeg" }
        }
      }
    }
  } catch {}

  // Strategy 3: foto local
try {
  const photoDir = path.join(
    process.cwd(),
    "app",
    "api",
    "avatar",
    "photo"
  )

  // tenta primeiro com username original
  let photoPath = path.join(photoDir, `${username}.webp`)

  try {
    await fs.access(photoPath)
  } catch {
    // tenta versão lowercase
    photoPath = path.join(photoDir, `${username.toLowerCase()}.webp`)
  }

  const file = await fs.readFile(photoPath)

  return {
    data: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    contentType: "image/webp",
  }
} catch (e) {
  console.log("Foto local não encontrada:", username)
}


  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const clean = username.replace(/^@/, "")

  const cached = CACHE.get(clean)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    })
  }

  const result = await fetchInstagramAvatar(clean)

  if (result) {
    CACHE.set(clean, { ...result, ts: Date.now() })
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    })
  }

  const initial = clean.charAt(0).toUpperCase()
  const hue = clean.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="hsl(${hue},50%,30%)" rx="100"/>
    <text x="100" y="108" font-size="80" fill="white" text-anchor="middle">${initial}</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  })
}
