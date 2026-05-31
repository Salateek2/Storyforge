import { describe, it, expect } from 'vitest'
import { countWords, formatWordCount, estimateReadingTime } from '../utils/wordCount'

describe('countWords', () => {
  describe('basic counting', () => {
    it('counts a single word', () => {
      expect(countWords('hello')).toBe(1)
    })

    it('counts multiple words separated by spaces', () => {
      expect(countWords('hello world')).toBe(2)
    })

    it('counts words across newlines and tabs', () => {
      expect(countWords('hello\nworld\tagain')).toBe(3)
    })

    it('collapses multiple consecutive whitespace characters', () => {
      expect(countWords('hello     world')).toBe(2)
      expect(countWords('hello \n\n\n world')).toBe(2)
    })
  })

  describe('empty / invalid input', () => {
    it('returns 0 for an empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('returns 0 for whitespace-only input', () => {
      expect(countWords('   ')).toBe(0)
      expect(countWords('\n\n\t   ')).toBe(0)
    })

    it('returns 0 for null or undefined', () => {
      expect(countWords(null)).toBe(0)
      expect(countWords(undefined)).toBe(0)
    })

    it('returns 0 for non-string input', () => {
      expect(countWords(42)).toBe(0)
      expect(countWords({})).toBe(0)
      expect(countWords([])).toBe(0)
    })
  })

  describe('HTML stripping (editor stores rich-text HTML)', () => {
    it('strips simple tags', () => {
      expect(countWords('<p>hello world</p>')).toBe(2)
    })

    it('strips nested tags', () => {
      expect(countWords('<p>hello <strong>brave</strong> <em>world</em></p>')).toBe(3)
    })

    it('treats tag boundaries as word separators', () => {
      // No space between words and tags — the regex still splits them apart.
      expect(countWords('<p>hello</p><p>world</p>')).toBe(2)
    })

    it('returns 0 for HTML that contains no actual text', () => {
      expect(countWords('<p></p><br/>')).toBe(0)
    })
  })

  describe('punctuation is not counted as a word', () => {
    it('does not count a lone dash as a word', () => {
      expect(countWords('-')).toBe(0)
    })

    it('does not count standalone punctuation between words', () => {
      // "hello - world" should be 2 words (the dash is a separator, not a word).
      expect(countWords('hello - world')).toBe(2)
    })

    it('does not count em dashes or ellipses as words', () => {
      expect(countWords('hello — world')).toBe(2)
      expect(countWords('hello ... world')).toBe(2)
    })

    it('returns 0 for input that is only punctuation', () => {
      expect(countWords('... ? !')).toBe(0)
      expect(countWords('---')).toBe(0)
    })

    it('counts hyphenated compounds as one word', () => {
      // No whitespace inside "hello-world" — it stays one token.
      expect(countWords('hello-world')).toBe(1)
      expect(countWords('mother-in-law')).toBe(1)
    })

    it('counts contractions as one word', () => {
      expect(countWords("don't stop")).toBe(2)
      expect(countWords("it's fine")).toBe(2)
    })
  })

  describe('numbers and unicode letters', () => {
    it('counts digits-only tokens as words', () => {
      expect(countWords('chapter 5')).toBe(2)
      expect(countWords('1984')).toBe(1)
    })

    it('counts non-English letters as words (Hebrew, accented)', () => {
      expect(countWords('שלום עולם')).toBe(2)
      expect(countWords('café résumé')).toBe(2)
    })
  })
})

describe('formatWordCount', () => {
  it('uses singular "word" for exactly 1', () => {
    expect(formatWordCount(1)).toBe('1 word')
  })

  it('uses plural "words" for 0', () => {
    expect(formatWordCount(0)).toBe('0 words')
  })

  it('uses plural "words" for values greater than 1', () => {
    expect(formatWordCount(2)).toBe('2 words')
    expect(formatWordCount(42)).toBe('42 words')
  })

  it('formats large numbers with locale-appropriate separators', () => {
    expect(formatWordCount(1500)).toBe('1,500 words')
    expect(formatWordCount(80000)).toBe('80,000 words')
  })

  it('returns "0 words" for invalid input', () => {
    expect(formatWordCount(-5)).toBe('0 words')
    expect(formatWordCount('abc')).toBe('0 words')
    expect(formatWordCount(null)).toBe('0 words')
    expect(formatWordCount(undefined)).toBe('0 words')
  })
})

describe('estimateReadingTime', () => {
  it('returns 0 for 0 words', () => {
    expect(estimateReadingTime(0)).toBe(0)
  })

  it('returns 0 for negative input', () => {
    expect(estimateReadingTime(-100)).toBe(0)
  })

  it('rounds up so even 1 word counts as 1 minute (rather than 0)', () => {
    expect(estimateReadingTime(1)).toBe(1)
    expect(estimateReadingTime(50)).toBe(1)
  })

  it('treats 200 words as exactly 1 minute', () => {
    expect(estimateReadingTime(200)).toBe(1)
  })

  it('rounds up partial minutes', () => {
    expect(estimateReadingTime(201)).toBe(2)
    expect(estimateReadingTime(350)).toBe(2)
  })

  it('scales linearly for longer pieces', () => {
    expect(estimateReadingTime(1000)).toBe(5)
    expect(estimateReadingTime(10000)).toBe(50)
  })
})
