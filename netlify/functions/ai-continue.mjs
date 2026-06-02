import { makeAiHandler } from '../shared/ai-utils.mjs'

export const handler = makeAiHandler({
  maxTokens: 400,
  buildPrompt: ({ text, genre }) =>
    `You are a creative fiction writer. Continue the following story naturally and seamlessly. Write 2-3 paragraphs only. Output story text only, no commentary.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`,
})
