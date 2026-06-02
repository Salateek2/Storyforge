import { makeAiHandler } from '../shared/ai-utils.mjs'

export const handler = makeAiHandler({
  maxTokens: 300,
  buildPrompt: ({ text, genre }) =>
    `You are a fiction writing assistant. Based on the story so far, suggest 3 distinct, compelling possibilities for what could happen next. Make them specific to the characters and situation, not generic. Each suggestion should be one sentence. Output as a numbered list (1., 2., 3.) only, no preamble or commentary.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`,
})
