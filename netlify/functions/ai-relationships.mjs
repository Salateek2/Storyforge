import { makeAiHandler } from '../shared/ai-utils.mjs'

// `text` arrives as a compiled roster of characters (name + description),
// optionally prefixed with the novel's genre. We ask the model to infer the
// likely relationships between pairs and return them in a strict, parseable
// one-line-per-pair format the client splits on " | ".
export const handler = makeAiHandler({
  maxTokens: 500,
  buildPrompt: ({ text, genre }) =>
    `You are a story analyst. Below are the characters of a ${genre || 'novel'}.` +
    ` Infer the most likely relationships between pairs of characters based only on their descriptions.\n\n` +
    `Output ONLY relationship lines, one per line, in EXACTLY this format:\n` +
    `Character A | Character B | relationship type | one short sentence explaining it\n\n` +
    `Rules:\n` +
    `- Use the exact character names as given.\n` +
    `- Only include pairs with a plausible relationship; skip unrelated pairs.\n` +
    `- "relationship type" is 1-3 words (e.g. "Father & daughter", "Uneasy allies", "Enemies", "Mentor & student").\n` +
    `- Do not list the same pair twice (in either order).\n` +
    `- At most 8 lines. No headers, no numbering, no extra commentary.\n\n` +
    `Characters:\n${text}`,
})
