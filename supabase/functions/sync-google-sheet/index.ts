// Supabase Edge Function: Sync time entries to Google Sheets
//
// Setup:
// 1. Create a Google Cloud service account with Sheets API access
// 2. Share your Google Sheet with the service account email
// 3. Set these secrets in Supabase:
//    supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=...
//    supabase secrets set GOOGLE_PRIVATE_KEY=...
//    supabase secrets set GOOGLE_SHEET_ID=...
//
// 4. A database trigger (on_time_entry_insert) on public.time_entries
//    fires net.http_post to call this function on every INSERT.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface TimeEntry {
  id: string
  user_id: string
  user_email: string
  label: string
  start_time: string
  end_time: string
  duration_seconds: number
  created_at: string
}

interface WebhookPayload {
  type: "INSERT"
  table: string
  record: TimeEntry
  schema: string
}

// Base64url encode (JWT requires this, not standard base64)
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64urlFromBuffer(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()

    if (payload.type !== "INSERT" || payload.table !== "time_entries") {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 })
    }

    const { user_email, label, start_time, end_time, duration_seconds } = payload.record

    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n")
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID")

    if (!serviceAccountEmail || !privateKey || !sheetId) {
      console.error("Missing Google Sheets configuration")
      return new Response(
        JSON.stringify({ error: "Missing Google Sheets config" }),
        { status: 500 }
      )
    }

    // Create JWT for Google Sheets API
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    const claim = base64url(
      JSON.stringify({
        iss: serviceAccountEmail,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )

    // Sign JWT with private key
    const encoder = new TextEncoder()
    const signData = encoder.encode(`${header}.${claim}`)

    const keyData = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "")

    const key = await crypto.subtle.importKey(
      "pkcs8",
      Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, signData)
    const jwt = `${header}.${claim}.${base64urlFromBuffer(signature)}`

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error("Token exchange failed:", JSON.stringify(tokenData))
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenData }),
        { status: 500 }
      )
    }

    // Format duration as HH:MM:SS
    const hrs = Math.floor(duration_seconds / 3600)
    const mins = Math.floor((duration_seconds % 3600) / 60)
    const secs = duration_seconds % 60
    const durationStr = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`

    // Append row to Google Sheet
    const appendRes = await fetch(
      // A:F matches the six columns written below. Keep these in sync - a wider
      // range lets stray data (e.g. a fill-down formula in G) push the detected
      // table further down, so appends land below a block of blank rows.
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[user_email || "unknown", label, formatTimestamp(start_time), formatTimestamp(end_time), durationStr, formatTimestamp(new Date().toISOString())]],
        }),
      }
    )

    const result = await appendRes.json()
    return new Response(JSON.stringify(result), { status: appendRes.ok ? 200 : 500 })
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
