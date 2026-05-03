/**
 * Counts the number of words in a string.
 * Returns 0 for empty or whitespace-only input.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Estimates reading time in minutes based on word count.
 * Assumes an average reading speed of 200 words per minute.
 * @param {number} wordCount
 * @returns {number}
 */
export function estimateReadingTime(wordCount) {
  if (wordCount <= 0) return 0
  return Math.ceil(wordCount / 200)
}
