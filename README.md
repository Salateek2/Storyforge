# StoryForge

A web-based writing tool designed specifically for fiction authors.

## Features

- 📖 Chapter manager with per-chapter editors
- 🗂️ Draft versioning per chapter
- 🧑‍🤝‍🧑 Character notes side panel
- 💾 Auto-save on every keystroke
- 📊 Live word count with human-readable formatting (e.g. "1,500 words")

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |

## Utilities

### `src/utils/wordCount.js`

| Function | Description |
|----------|-------------|
| `countWords(text)` | Counts words in a string; returns 0 for empty/null input |
| `estimateReadingTime(n)` | Returns estimated reading time in minutes at 200 wpm |
| `formatWordCount(n)` | Returns a localised string e.g. `"1 word"`, `"1,500 words"` |

## Tech Stack

- React 18
- Vite
- ESLint
- Vitest + Testing Library
