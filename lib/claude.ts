import Anthropic from '@anthropic-ai/sdk'

// Variabila se numeste CLAUDE_API_KEY (nu ANTHROPIC_API_KEY)
// pentru a evita conflictul cu Claude Code care seteaza ANTHROPIC_API_KEY=""
// in procesul parinte, blocand citirea din .env.local
export function getClaudeClient() {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error('CLAUDE_API_KEY lipsește din .env.local')
  return new Anthropic({ apiKey })
}

export const AI_MODEL = 'claude-sonnet-4-5'

// Limite mesaje per plan (pe luna)
export const AI_LIMITS: Record<string, number> = {
  free: 0,
  solo: 100,
  pro: Infinity,
  team: Infinity,
}
