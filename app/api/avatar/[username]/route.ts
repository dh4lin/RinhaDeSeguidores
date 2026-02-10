import { NextResponse } from "next/server"

const CACHE = new Map<string, { data: ArrayBuffer; contentType: string; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24h

async function fetchInstagramAvatar(username: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  // Strategy 1: Try fetching from Instagram's CDN via the public profile page
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
  } catch {
    // continue to next strategy
  }

  // Strategy 2: scrape og:image from the public profile page
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
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
  } catch {
    // continue to next strategy
  }

  // Strategy 3: unavatar.io as last attempt
  try {
    const res = await fetch(`https://unavatar.io/instagram/${username}?fallback=false`, {
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      const data = await res.arrayBuffer()
      return { data, contentType: res.headers.get("content-type") || "image/jpeg" }
    }
  } catch {
    // fallback below
  }

  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const clean = username.toLowerCase().replace(/^@/, "")

  // Check cache
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

  // Generate a nice default avatar with initials using SVG
  const initial = clean.charAt(0).toUpperCase()
  const hue = clean.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="hsl(${hue}, 50%, 30%)" rx="100"/>
    <text x="100" y="108" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="hsl(${hue}, 70%, 80%)" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
