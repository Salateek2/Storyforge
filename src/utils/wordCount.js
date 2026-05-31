/**
 * Counts the number of words in a string.
 * Returns 0 for empty or whitespace-only input.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  // Strip HTML tags so editor content stored as rich-text HTML counts as plain words.
  const plain = text.replace(/<[^>]*>/g, ' ')
  // A token counts as a word only if it contains at least one letter or digit
  // (Unicode-aware, so non-English letters work). This excludes lone punctuation
  // like "-", "—", "...", "?" from being counted as words.
  return plain.trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
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

/**
 * Formats a word count as a human-readable string.
 * Examples: 0 -> "0 words", 1 -> "1 word", 1500 -> "1,500 words"
 * @param {number} wordCount
 * @returns {string}
 */
export function formatWordCount(wordCount) {
  if (typeof wordCount !== 'number' || wordCount < 0) return '0 words'
  const label = wordCount === 1 ? 'word' : 'words'
  return `${wordCount.toLocaleString()} ${label}`
}
