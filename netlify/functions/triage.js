exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    const { text } = body;
    if (!text && !Array.isArray(body.items)) return { statusCode: 400, body: 'No text provided' };

    // Provide today's date and day-of-week so the model can suggest sensible due dates
    // when the brain dump explicitly mentions urgency (e.g., "by Thursday").
    const today = new Date();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayStr = today.toISOString().split('T')[0];
    const todayDay = dayNames[today.getDay()];

    // The creative/goodwolf line is the one that gets mis-drawn: the user runs a live
    // events business whose whole subject matter is music, so a task can mention an
    // artist, an album or a venue and still be sales work. Creative means HIS OWN art.
    const pillarDesc = 'health (fitness/nutrition/recovery), wealth (personal finance NOT business), creative (ONLY his own art: his BWD Artist music, the Be Here Now album, songwriting, Melody\'s Joy), goodwolf (Good Wolf Events business: sub-categories are accounting/legal/production/marketing/sales/admin)';
    const pillarRule = 'IMPORTANT pillar rule: anything about OTHER artists, bands, venues, promoters, bookings, releases or ticketing is goodwolf business, NOT creative — reaching out to an artist or their booking contact about an upcoming release, show or ticketing is goodwolf with sub "sales". Only classify as creative when the task is about the user making or promoting HIS OWN music.';
    const dateContext = 'Today is ' + todayStr + ' (' + todayDay + '). The user works on a Mon-Sat schedule with day themes: Mon=Admin/Accounting/Legal, Tue=Production, Wed=Marketing, Thu=Sales, Fri=Business Catchall, Sat=Personal Catchall.';
    const dueRule = 'For dueDate: ONLY fill in if the brain dump explicitly signals urgency (e.g., "by Friday", "today", "tomorrow", "next week"). If no urgency is signaled, leave dueDate as empty string — the app will assign a default based on category. Resolve relative dates against today\'s date above.';
    // ── CLASSIFY MODE ────────────────────────────────────────────────
    // Week-close carry-forwards are ALREADY discrete tasks with settled wording — they
    // just have no category. Extraction is the wrong tool for them: it merges, splits and
    // rewords, and the caller stamps results back onto specific task IDs by position, so
    // the count and order have to survive exactly. Hence a separate mode that classifies
    // in place and is told, twice, never to change the number of items.
    if (Array.isArray(body.items)) {
      const items = body.items.map(s => String(s == null ? '' : s));
      if (!items.length) {
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
      }
      const numbered = items.map((t, i) => (i + 1) + '. ' + t.replace(/\n/g, ' ')).join('\n');
      const classifyPrompt = 'Classify each numbered task below into one pillar. Pillars: '
        + pillarDesc + '. ' + pillarRule
        + ' Return ONLY a valid JSON array with no other text, preamble or markdown.'
        + ' The array MUST have exactly ' + items.length + ' objects, one per numbered task,'
        + ' in the SAME ORDER as the input. Do NOT merge, split, reword, skip or reorder tasks —'
        + ' classify each line exactly as given, even if two lines look similar or a line is vague.'
        + ' Each object: {"pillar":"health|wealth|creative|goodwolf","sub":"accounting|legal|production|marketing|sales|admin or empty string if pillar is not goodwolf"}.'
        + '\n\n' + numbered;

      const cRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{ role: 'user', content: classifyPrompt }]
        })
      });
      const cData = await cRes.json();
      if (cData.error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API error: ' + (cData.error.message || JSON.stringify(cData.error)) }) };
      }
      const cRaw = cData.content && cData.content[0] && cData.content[0].text || '[]';
      const cParsed = JSON.parse(cRaw.replace(/```json|```/g, '').trim());
      // Fail loudly rather than returning a short array the caller would have to reject
      // anyway — makes a truncated or chatty response obvious in the logs.
      if (!Array.isArray(cParsed) || cParsed.length !== items.length) {
        return { statusCode: 502, body: JSON.stringify({ error: 'Classify returned ' + (Array.isArray(cParsed) ? cParsed.length : 'non-array') + ' for ' + items.length + ' items' }) };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cParsed)
      };
    }

    const prompt = dateContext + ' ' + dueRule + ' Analyze this brain dump and extract discrete actionable items. Pillars: ' + pillarDesc + '. ' + pillarRule + ' For each item return JSON with: text (concise actionable phrase), pillar (health/wealth/creative/goodwolf), sub (sub-category if goodwolf, else empty string), dueDate (YYYY-MM-DD if urgency explicitly signaled in text, else empty string), type (task for action items, goal for weekly goals, note for reference info). Return ONLY a valid JSON array with no other text, preamble or markdown: ' + text;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API error: ' + (data.error.message || JSON.stringify(data.error)) }) };
    }
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
