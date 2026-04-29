exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { text } = JSON.parse(event.body);
    if (!text) return { statusCode: 400, body: 'No text provided' };

    const pillarDesc = 'health (fitness/nutrition/recovery), wealth (personal finance NOT business), creative (music/art/Be Here Now album), goodwolf (Good Wolf Events business: sub-categories are accounting/legal/production/marketing/sales/admin)';

    const prompt = 'Analyze this brain dump and extract discrete actionable items. Pillars: ' + pillarDesc + '. For each item return JSON with: text (concise actionable phrase), pillar (health/wealth/creative/goodwolf), sub (sub-category if goodwolf, else empty string), dueDate (YYYY-MM-DD if urgency implied, else empty string), type (task for action items, goal for weekly goals, note for reference info). Return ONLY a valid JSON array with no other text, preamble or markdown: ' + text;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const raw = data.content && data.content[0] && data.content[0].text || '[]';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
