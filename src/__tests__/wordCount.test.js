import { describe, it, expect } from 'vitest'
import { countWords, estimateReadingTime, formatWordCount } from '../utils/wordCount'

describe('countWords', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0)
  })

  it('returns 0 for null', () => {
    expect(countWords(null)).toBe(0)
  })

  it('returns 0 for non-string input', () => {
    expect(countWords(42)).toBe(0)
  })

  it('counts a single word', () => {
    expect(countWords('hello')).toBe(1)
  })

  it('counts multiple words', () => {
    expect(countWords('the quick brown fox')).toBe(4)
  })

  it('handles extra whitespace between words', () => {
    expect(countWords('  hello   world  ')).toBe(2)
  })

  it('handles newlines and tabs', () => {
    expect(countWords('hello\nworld\tfoo')).toBe(3)
  })
})

describe('estimateReadingTime', () => {
  it('returns 0 for zero words', () => {
    expect(estimateReadingTime(0)).toBe(0)
  })

  it('returns 0 for negative word count', () => {
    expect(estimateReadingTime(-10)).toBe(0)
  })

  it('returns 1 minute for fewer than 200 words', () => {
    expect(estimateReadingTime(50)).toBe(1)
  })

  it('returns 1 minute for exactly 200 words', () => {
    expect(estimateReadingTime(200)).toBe(1)
  })

  it('returns 2 minutes for 201 words', () => {
    expect(estimateReadingTime(201)).toBe(2)
  })

  it('returns 5 minutes for 1000 words', () => {
    expect(estimateReadingTime(1000)).toBe(5)
  })
})

describe('formatWordCount', () => {
  it('returns "0 words" for zero', () => {
    expect(formatWordCount(0)).toBe('0 words')
  })

  it('returns singular "1 word" for one', () => {
    expect(formatWordCount(1)).toBe('1 word')
  })

  it('returns plural for two or more', () => {
    expect(formatWordCount(2)).toBe('2 words')
  })

  it('formats large numbers with locale separators', () => {
    // toLocaleString in Node uses en-US by default in test env
    expect(formatWordCount(1500)).toMatch(/1.500 words/)
  })

  it('returns "0 words" for negative input', () => {
    expect(formatWordCount(-1)).toBe('0 words')
  })

  it('returns "0 words" for non-number input', () => {
    expect(formatWordCount('bad')).toBe('0 words')
  })
})
