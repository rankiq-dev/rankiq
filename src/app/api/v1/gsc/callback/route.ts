import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectGsc, parseGscState } from "@/domain/sites/gsc"
import { config } from "@/config"

/** GET /api/v1/gsc/callback — Google OAuth2 callback for Search Console connection */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${config.appUrl}/login`)
  }

  const { searchParams } = req.nextUrl
  const code  = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code || !state) {
    return NextResponse.redirect(`${config.appUrl}/dashboard?gsc=error`)
  }

  const parsed = parseGscState(state)
  if (!parsed) {
    return NextResponse.redirect(`${config.appUrl}/dashboard?gsc=invalid`)
  }

  /* Verify the siteId in state belongs to the current user — tenant isolation */
  if (parsed.userId !== session.user.id) {
    return NextResponse.redirect(`${config.appUrl}/dashboard?gsc=forbidden`)
  }

  try {
    await connectGsc({ code, siteId: parsed.siteId, userId: session.user.id })
    return NextResponse.redirect(`${config.appUrl}/sites/${parsed.siteId}?gsc=connected`)
  } catch (err) {
    console.error("[gsc/callback] connectGsc failed:", err)
    return NextResponse.redirect(`${config.appUrl}/sites/${parsed.siteId}?gsc=error`)
  }
}
