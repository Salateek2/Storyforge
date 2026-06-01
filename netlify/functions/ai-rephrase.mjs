async function askGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Groq error')
  return data.choices[0].message.content
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { text, genre } = JSON.parse(event.body)
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: 'No text provided' }) }

    const prompt = `You are a fiction editor. Rewrite the following passage to improve its flow, clarity, and prose while preserving the original meaning, point of view, and the author's voice. Do not add new plot events. Output only the rewritten passage, no commentary or quotation marks.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`
    const result = await askGroq(prompt)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
