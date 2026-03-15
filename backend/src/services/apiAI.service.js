/**
 * API AI MODULE
 * Hybrid: OpenAI Mini -> Local fallback
 * Cost-optimized with caching
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { getLocalQuote } = require('./localAI.service');

const quoteCache = new NodeCache({ stdTTL: parseInt(process.env.QUOTE_CACHE_TTL) || 3600 });

/**
 * Resolve which API key + provider to use
 * Priority: user key > dev key > local fallback
 */
function resolveAIConfig(userSettings = {}) {
  const mode = userSettings.aiMode || process.env.DEFAULT_AI_MODE || 'auto';

  if (mode === 'local') return { provider: 'local' };

  // Check multiple possible key locations
  const key = userSettings.userOpenAIKey || 
              process.env.OPENAI_API_KEY || 
              process.env.DEV_OPENAI_API_KEY;

  if (key) return { provider: 'openai', key };

  return { provider: 'local' };
}

/**
 * Generate motivation quote via OpenAI gpt-4o-mini (cheapest GPT)
 */
async function openaiQuote(prompt, key) {
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.85,
      },
      { headers: { Authorization: `Bearer ${key}` }, timeout: 8000 }
    );
    return res.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('OpenAI Quota/Rate Limit Exceeded (429). Please check your billing/credits.');
    }
    throw err;
  }
}

/**
 * Build prompt for motivation quote
 */
function buildQuotePrompt({ taskName, priority, goal, minutesToDeadline }) {
  return `Generate a single powerful motivational sentence (max 20 words) for someone who needs to complete a task.
Task: "${taskName}"
Priority: ${priority}
User's main goal: ${goal || 'general productivity'}
Time to deadline: ${minutesToDeadline ? minutesToDeadline + ' minutes' : 'flexible'}
Be direct, intense, and action-oriented. No fluff. No quotes marks. Just the sentence.`;
}

/**
 * Main quote generator — tries API then falls back to local
 */
async function generateMotivationQuote(taskInfo, userSettings = {}) {
  const { taskName, priority, goal, minutesToDeadline } = taskInfo;
  const cacheKey = `quote_${priority}_${goal}_${Math.floor(Date.now() / 300000)}`; // 5-min buckets

  const cached = quoteCache.get(cacheKey);
  if (cached) return cached;

  const config = resolveAIConfig(userSettings);

  if (config.provider === 'openai') {
    try {
      const prompt = buildQuotePrompt(taskInfo);
      const quote = await openaiQuote(prompt, config.key);
      if (quote) {
        quoteCache.set(cacheKey, quote);
        return quote;
      }
    } catch (err) {
      console.warn(`[AI Service] OpenAI failed:`, err.message);
    }
  }

  // Fallback to local logic
  const localQuote = getLocalQuote(priority, goal);
  quoteCache.set(cacheKey, localQuote);
  return localQuote;
}

/**
 * Analyze goal and generate insights via API (called less frequently)
 */
async function generateGoalInsights(tasks, userGoal, userSettings = {}) {
  const config = resolveAIConfig(userSettings);
  if (config.provider === 'local') return null;

  const taskSummary = tasks.slice(0, 20).map(t => `${t.name} (${t.priority}, ${t.category})`).join(', ');
  const prompt = `Analyze these tasks and give 2-3 short insights about the user's productivity patterns and weak areas.
User's goal: ${userGoal || 'not set'}
Tasks: ${taskSummary}
Format: bullet points, max 15 words each. Be specific and actionable.`;

  try {
    if (config.provider === 'openai') return await openaiQuote(prompt, config.key);
  } catch (err) {
    console.warn('Goal insights API failed:', err.message);
  }
  return null;
}

module.exports = { generateMotivationQuote, generateGoalInsights, resolveAIConfig };
