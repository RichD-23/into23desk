import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

/**
 * Simple keyword-based relevance scoring to find KB articles
 * relevant to the customer's message without requiring pgvector.
 */
function scoreArticle(article: { title: string; content: string }, query: string): number {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (queryWords.length === 0) return 0;

  const haystack = `${article.title} ${article.content}`.toLowerCase();
  let score = 0;

  for (const word of queryWords) {
    // Title matches score higher
    if (article.title.toLowerCase().includes(word)) score += 3;
    if (haystack.includes(word)) score += 1;
  }

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerMessages, conversationLanguage } = body;

    if (!customerMessages || !Array.isArray(customerMessages) || customerMessages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: customerMessages' },
        { status: 400 }
      );
    }

    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityKey) {
      return NextResponse.json(
        { error: 'PERPLEXITY API key is not configured' },
        { status: 400 }
      );
    }

    // Combine recent customer messages into a single query string
    const queryText = customerMessages.join(' ');

    // Fetch published KB articles from Supabase
    const { data: articles, error: dbError } = await supabaseAdmin
      .from('kb_articles')
      .select('id, title, content, category')
      .eq('status', 'published')
      .limit(50);

    if (dbError) {
      console.error('KB fetch error:', dbError.message);
      // Proceed without KB context rather than failing completely
    }

    // Score and rank articles by relevance to the customer query
    const scoredArticles = (articles || [])
      .map((article) => ({ ...article, score: scoreArticle(article, queryText) }))
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 most relevant articles

    // Build KB context block for the prompt
    let kbContext = '';
    if (scoredArticles.length > 0) {
      kbContext = scoredArticles
        .map(
          (a, i) =>
            `--- KB Article ${i + 1}: ${a.title} (${a.category}) ---\n${a.content?.slice(0, 600) || ''}`
        )
        .join('\n\n');
    }

    const hasKbContext = kbContext.trim().length > 0;

    const langNames: Record<string, string> = {
      id: 'Bahasa Indonesia',
      th: 'Thai',
      vi: 'Vietnamese',
      ta: 'Tamil',
      hi: 'Hindi',
      en: 'English',
    };
    const replyLanguage = langNames[conversationLanguage] || 'English';

    const systemPrompt = hasKbContext
      ? `You are a customer support AI assistant for an e-commerce business. You have access to the company's Knowledge Base articles below. Use ONLY the information from these KB articles to draft reply suggestions. Do not invent policies, prices, or procedures not mentioned in the KB.

KNOWLEDGE BASE CONTEXT:
${kbContext}

Instructions:
- Generate exactly 2 concise, professional reply suggestions for the agent to send to the customer.
- Base your replies on the KB content above.
- Write replies in ${replyLanguage}.
- Each reply must be empathetic, accurate, and under 80 words.
- Return a JSON array of exactly 2 strings. No extra text, no markdown, no explanation — just the JSON array.`
      : `You are a customer support AI assistant for an e-commerce business. Generate exactly 2 concise, professional reply suggestions for the agent to send to the customer. Write replies in ${replyLanguage}. Each reply must be empathetic, accurate, and under 80 words. Return a JSON array of exactly 2 strings. No extra text, no markdown, no explanation — just the JSON array.`;

    const userPrompt = `Customer messages:\n${customerMessages.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}\n\nGenerate 2 reply suggestions as a JSON array.`;

    const response = await completion({
      model: 'perplexity/sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      api_key: perplexityKey,
      temperature: 0.4,
      max_tokens: 400,
    });

    const rawContent: string = (response as any)?.choices?.[0]?.message?.content || '';

    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          suggestions = parsed.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, 2);
        }
      }
    } catch {
      // Fallback: split by numbered lines
    }

    if (suggestions.length === 0) {
      const lines = rawContent
        .split(/\n+/)
        .map((l) => l.replace(/^[\d\.\-\*"]+\s*/, '').replace(/[",]+$/, '').trim())
        .filter((l) => l.length > 20);
      suggestions = lines.slice(0, 2);
    }

    if (suggestions.length === 0) {
      suggestions = [rawContent.trim()];
    }

    return NextResponse.json({
      suggestions,
      kbArticlesUsed: scoredArticles.map((a) => ({ id: a.id, title: a.title, category: a.category })),
      hasKbContext,
    });
  } catch (error) {
    console.error('KB suggest error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate KB-grounded suggestions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
