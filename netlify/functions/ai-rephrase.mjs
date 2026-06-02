import { makeAiHandler } from '../shared/ai-utils.mjs'

export const handler = makeAiHandler({
  maxTokens: 400,
  buildPrompt: ({ text, genre }) =>
    `You are a fiction editor. Rewrite the following passage to improve its flow, clarity, and prose while preserving the original meaning, point of view, and the author's voice. Do not add new plot events. Output only the rewritten passage, no commentary or quotation marks.${genre ? ` Genre: ${genre}.` : ''}\n\n${text}`,
})
