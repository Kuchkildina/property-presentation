import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt() {
  return `You are a luxury real estate presentation writer specialising in London property. 
You create elegant, concise, professional presentations in the style of top London agents.
Always respond with valid JSON only — no markdown, no code fences, no explanation.`
}

function buildUserPrompt(data, lang) {
  const langInstr =
    lang === 'ru'
      ? 'Write the entire presentation in Russian.'
      : lang === 'both'
      ? 'Write each slide in both English and Russian: English text first, then "——" divider, then Russian translation.'
      : 'Write in English.'

  return `Create a 7-slide luxury property presentation.

Property data:
${JSON.stringify(data, null, 2)}

${langInstr}

Return ONLY a JSON array of exactly 7 objects. Each object:
{
  "slideNum": number,
  "tag": "cover" | "about" | "details" | "amenities" | "location" | "apartment" | "contact",
  "headline": "string",
  "body": "string (can be empty)",
  "kvPairs": [{"k": "label", "v": "value"}]
}

Slide structure:
1. cover — headline = development name, body = one elegant tagline sentence, kvPairs = []
2. about — headline = "About [name]", body = 2-3 polished sentences about the development, kvPairs = []
3. details — headline = "Key details", body = "", kvPairs = developer, architect, completion, lease, service charge
4. amenities — headline = "Amenities & lifestyle", body = one sentence, kvPairs = each amenity with short description
5. location — headline = "Prime location", body = 2 sentences about the neighbourhood, kvPairs = nearest tube, parks, airport
6. apartment — headline = apartment type, body = "", kvPairs = price, area, floor, block/unit, completion
7. contact — headline = "Next steps"${data.client ? `, body = "Prepared exclusively for ${data.client}."` : ', body = "We would be delighted to arrange a private viewing."'}, kvPairs = []

Tone: refined, understated luxury. No superlatives. Max 5 kvPairs per slide.`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { mode, data, lang, brochureBase64, priceBase64, url } = body

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    let messages = []

    if (mode === 'manual') {
      messages = [{ role: 'user', content: buildUserPrompt(data, lang) }]
    } else if (mode === 'upload') {
      const contentParts = []
      if (brochureBase64) {
        contentParts.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: brochureBase64 },
        })
      }
      if (priceBase64) {
        contentParts.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: priceBase64 },
        })
      }
      contentParts.push({
        type: 'text',
        text: `Extract all property information from the uploaded documents. Unit/apartment requested: ${data.unit || 'standard apartment'}. Client: ${data.client || ''}. Notes: ${data.notes || ''}\n\n${buildUserPrompt({ name: '[from brochure]', type: data.unit, client: data.client, notes: data.notes }, lang)}`,
      })
      messages = [{ role: 'user', content: contentParts }]
    } else if (mode === 'url') {
      // For URL mode we pass the URL as text; on a real deployment you'd use web search tool
      messages = [
        {
          role: 'user',
          content: `The developer's website is: ${url}\nUnit requested: ${data.unit || 'standard apartment'}\nClient: ${data.client || ''}\nNotes: ${data.notes || ''}\n\nBased on this project information, ${buildUserPrompt({ name: data.name || 'the development', type: data.unit, client: data.client, notes: data.notes, url }, lang)}`,
        },
      ]
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: buildSystemPrompt(),
      messages,
    })

    const text = response.content.map((b) => b.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const slides = JSON.parse(clean)

    return Response.json({ slides })
  } catch (err) {
    console.error('Generate error:', err)
    return Response.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
