import { makeAiHandler } from '../shared/ai-utils.mjs'

export const handler = makeAiHandler({
  maxTokens: 150,
  buildPrompt: ({ text }) =>
    `Summarize the following chapter in 2-3 concise sentences. Focus on plot events and character actions. Output the summary only.\n\n${text.slice(0, 4000)}`,
})
