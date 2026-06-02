const AI_BASE = '/.netlify/functions'

/**
 * Sends the last portion of chapter text to the AI and returns a continuation.
 * @param {string} htmlContent - Full chapter HTML content
 * @param {string} [genre] - Optional genre string for better context
 * @returns {Promise<string>} - Plain text continuation
 */
export async function continueWriting(htmlContent, genre) {
  // Strip HTML tags to get plain text
  const div = document.createElement('div')
  div.innerHTML = htmlContent
  const plain = (div.innerText || div.textContent || '').trim()

  // Send last ~800 chars for context
  const excerpt = plain.slice(-800)

  const res = await fetch(`${AI_BASE}/ai-continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: excerpt, genre }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { result } = await res.json()
  return result
}

/**
 * Rephrases a passage of plain text, preserving meaning and voice.
 * @param {string} text - Plain text passage to rewrite (e.g. the selection)
 * @param {string} [genre] - Optional genre string for better context
 * @returns {Promise<string>} - Plain text rewrite
 */
export async function rephraseText(text, genre) {
  const passage = (text || '').trim()
  if (!passage) throw new Error('Select some text in the chapter to rephrase.')

  const res = await fetch(`${AI_BASE}/ai-rephrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: passage.slice(0, 2000), genre }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { result } = await res.json()
  return result
}

/**
 * Suggests what could happen next based on the chapter so far.
 * @param {string} htmlContent - Full chapter HTML content
 * @param {string} [genre] - Optional genre string for better context
 * @returns {Promise<string>} - Numbered list of suggestions (plain text)
 */
export async function suggestNext(htmlContent, genre) {
  const div = document.createElement('div')
  div.innerHTML = htmlContent
  const plain = (div.innerText || div.textContent || '').trim()

  if (!plain) throw new Error('Write something first so the AI has context to work with.')

  // Send last ~1500 chars for context
  const excerpt = plain.slice(-1500)

  const res = await fetch(`${AI_BASE}/ai-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: excerpt, genre }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { result } = await res.json()
  return result
}

/**
 * Analyzes a cast of characters and infers the relationships between them.
 * @param {Array<{name: string, description?: string}>} characters
 * @param {string} [genre] - Optional genre string for better context
 * @returns {Promise<Array<{a: string, b: string, type: string, reason: string}>>}
 */
export async function analyzeRelationships(characters, genre) {
  const cast = (characters || []).filter(c => c?.name?.trim())
  if (cast.length < 2) throw new Error('Add at least two characters first.')

  const roster = cast
    .map(c => `- ${c.name.trim()}: ${(c.description || '').trim() || '(no description)'}`)
    .join('\n')

  const res = await fetch(`${AI_BASE}/ai-relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: roster.slice(0, 6000), genre }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { result } = await res.json()
  // Parse the "A | B | type | reason" lines into structured pairs; keep any
  // unparseable line as a loose note so nothing the model returns is lost.
  return (result || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length >= 4) {
        return { a: parts[0], b: parts[1], type: parts[2], reason: parts.slice(3).join(' | ') }
      }
      return { a: '', b: '', type: '', reason: line.replace(/^[-•\d.\s]+/, '') }
    })
}

/**
 * Summarizes the chapter content in 2-3 sentences.
 * @param {string} htmlContent - Full chapter HTML content
 * @returns {Promise<string>} - Plain text summary
 */
export async function summarizeChapter(htmlContent) {
  const div = document.createElement('div')
  div.innerHTML = htmlContent
  const plain = (div.innerText || div.textContent || '').trim()

  if (!plain) throw new Error('Chapter is empty — nothing to summarize.')

  const res = await fetch(`${AI_BASE}/ai-summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: plain.slice(0, 4000) }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { result } = await res.json()
  return result
}
