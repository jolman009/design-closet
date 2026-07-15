// Supabase Edge Function: tag-garment
// ---------------------------------------------------------------------------
// Given a clothing photo (base64), returns structured wardrobe attributes using
// a Claude vision model. The Anthropic API key stays server-side (a Supabase
// secret) — the client never sees it.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy tag-garment
//
// The function is JWT-protected (Supabase verifies the token at the gateway),
// and additionally rejects the anonymous role so only signed-in users can spend
// the API budget.

// Allowed color vocabulary — must match COLOR_HEX in the web app.
const COLORS = [
  'white', 'ecru', 'sand', 'camel', 'tobacco', 'espresso', 'sage', 'olive',
  'slate', 'indigo', 'navy', 'charcoal', 'black', 'grey', 'burgundy', 'blush', 'cream',
]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'A concise 2-3 word name, e.g. "Silk Blouse"' },
    category: { type: 'string', enum: ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] },
    colors: {
      type: 'array',
      description: '1-3 dominant colors, chosen only from the allowed list',
      items: { type: 'string', enum: COLORS },
    },
    fabric: { type: 'string', description: 'Best-guess fabric, e.g. Linen, Silk, Wool, Cotton, Denim, Leather, Knit' },
    season: { type: 'string', enum: ['all', 'spring', 'summer', 'fall', 'winter'] },
    formality: { type: 'integer', enum: [1, 2, 3, 4, 5], description: '1 very casual … 5 formal' },
    warmth: { type: 'integer', enum: [1, 2, 3, 4, 5], description: '1 light … 5 heavy/warm' },
  },
  required: ['name', 'category', 'colors', 'fabric', 'season', 'formality', 'warmth'],
}

const PROMPT =
  'You are a fashion cataloguer for a personal wardrobe app. Analyze the single ' +
  'clothing item in this photo and return its attributes. Pick colors ONLY from ' +
  'the allowed list (closest match). Judge formality and warmth on a 1-5 scale. ' +
  'Give a short, natural name. If the item is ambiguous, make your best guess.'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Decode the JWT payload (already signature-verified by the Supabase gateway)
// to confirm the caller is an authenticated user, not the anonymous role.
function callerRole(authHeader: string | null): string | null {
  try {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role ?? null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (callerRole(req.headers.get('Authorization')) !== 'authenticated') {
    return json({ error: 'Sign in required.' }, 401)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Tagging is not configured.' }, 503)

  let image: string, mediaType: string
  try {
    const body = await req.json()
    image = body.image
    mediaType = body.media_type || 'image/jpeg'
    if (!image) throw new Error('missing image')
  } catch {
    return json({ error: 'Send { image: <base64>, media_type }.' }, 400)
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('Anthropic error', resp.status, err)
      return json({ error: 'Vision service error.' }, 502)
    }

    const data = await resp.json()
    // Structured output arrives as a JSON string in the first text block.
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) return json({ error: 'No result.' }, 502)
    const tags = JSON.parse(textBlock.text)
    return json({ tags })
  } catch (e) {
    console.error(e)
    return json({ error: 'Tagging failed.' }, 500)
  }
})
