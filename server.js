import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

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

// Continue Writing
app.post('/api/ai/continue', async (req, res) => {
  const { text, genre } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })
  try {
    const prompt = `You are a creative fiction writer. Continue the following story naturally and seamlessly. Write 2-3 paragraphs only. Output story text only, no commentary.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`
    res.json({ result: await askGroq(prompt) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Auto-summarize
app.post('/api/ai/summarize', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })
  try {
    const prompt = `Summarize the following chapter in 2-3 concise sentences. Focus on plot events and character actions. Output the summary only.\n\n${text}`
    res.json({ result: await askGroq(prompt) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Rephrase selection
app.post('/api/ai/rephrase', async (req, res) => {
  const { text, genre } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })
  try {
    const prompt = `You are a fiction editor. Rewrite the following passage to improve its flow, clarity, and prose while preserving the original meaning, point of view, and the author's voice. Do not add new plot events. Output only the rewritten passage, no commentary or quotation marks.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`
    res.json({ result: await askGroq(prompt) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Suggest what happens next
app.post('/api/ai/suggest', async (req, res) => {
  const { text, genre } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })
  try {
    const prompt = `You are a fiction writing assistant. Based on the story so far, suggest 3 distinct, compelling possibilities for what could happen next. Make them specific to the characters and situation, not generic. Each suggestion should be one sentence. Output as a numbered list (1., 2., 3.) only, no preamble or commentary.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`
    res.json({ result: await askGroq(prompt) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`AI server running on http://localhost:${PORT}`))
