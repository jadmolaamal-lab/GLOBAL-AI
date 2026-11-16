const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(API_KEY), model: MODEL });
});

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({ error: 'مفتاح Groq مازال ما تزادش فإعدادات السيرفر.' });
  }

  const incoming = req.body && Array.isArray(req.body.messages) ? req.body.messages : null;
  if (!incoming || incoming.length === 0 || incoming.length > 20) {
    return res.status(400).json({ error: 'الرسائل غير صالحة. عاود المحاولة.' });
  }

  const messages = [
    {
      role: 'system',
      content: 'You are GLOBAL AI, a helpful, capable multilingual assistant. Reply in the same language and style as the user. Understand Moroccan Darija, Arabic, French, and English. Be clear, accurate, friendly, and admit uncertainty. Do not claim to have abilities or live information you do not have.'
    },
    ...incoming.map(m => ({
      role: m && (m.role === 'assistant' || m.role === 'user') ? m.role : 'user',
      content: String(m && m.content ? m.content : '').slice(0, 8000)
    }))
  ];

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_completion_tokens: 1200
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Groq API error:', upstream.status, data.error || data);
      if (upstream.status === 429) return res.status(429).json({ error: 'وصلنا للحد المجاني مؤقتاً. تسنّى شوية وعاود.' });
      if (upstream.status === 401) return res.status(502).json({ error: 'مفتاح API غير صحيح. راجع إعدادات السيرفر.' });
      return res.status(502).json({ error: 'خدمة الذكاء الاصطناعي ما جاوباتش دابا. جرّب من بعد.' });
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return res.status(502).json({ error: 'وصل رد فارغ من النموذج. عاود جرّب.' });
    res.json({ reply, model: data.model || MODEL });
  } catch (error) {
    console.error('Server request failed:', error.message);
    res.status(500).json({ error: 'وقع مشكل فالسيرفر. عاود المحاولة.' });
  }
});

app.listen(PORT, () => console.log(`GLOBAL AI server running on port ${PORT}`));
