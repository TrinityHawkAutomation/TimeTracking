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
// 4. Create a Database Webhook in Supabase Dashboard:
//    - Table: time_entries
//    - Events: INSERT
//    - Type: Supabase Edge Function
//    - Function: sync-google-sheet

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

interface TimeEntry {
  id: string
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

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()

    if (payload.type !== "INSERT" || payload.table !== "time_entries") {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 })
    }

    const { label, start_time, end_time, duration_seconds } = payload.record

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
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    const claim = btoa(
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
    const jwt = `${header}.${claim}.${btoa(
      String.fromCharCode(...new Uint8Array(signature))
    )}`

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    const { access_token } = await tokenRes.json()

    // Format duration as HH:MM:SS
    const hrs = Math.floor(duration_seconds / 3600)
    const mins = Math.floor((duration_seconds % 3600) / 60)
    const secs = duration_seconds % 60
    const durationStr = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`

    // Append row to Google Sheet
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:E:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[label, start_time, end_time, durationStr, new Date().toISOString()]],
        }),
      }
    )

    const result = await appendRes.json()
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
