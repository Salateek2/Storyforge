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
