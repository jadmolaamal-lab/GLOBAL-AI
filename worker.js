export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API ديال المحادثة
    if (url.pathname === "/api/chat" && request.method === "POST") {
      if (!env.GROQ_API_KEY) {
        return Response.json(
          { error: "مفتاح Groq غير مضبوط." },
          { status: 503 }
        );
      }

      try {
        const body = await request.json();
        const incoming = body.messages;

        if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 20) {
          return Response.json(
            { error: "الرسائل غير صالحة." },
            { status: 400 }
          );
        }

        const messages = [
          {
            role: "system",
            content: "You are GLOBAL AI, a helpful multilingual assistant. Reply in the same language as the user. Understand Moroccan Darija, Arabic, French and English. Be friendly and accurate."
          },
          ...incoming.map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "").slice(0, 8000)
          }))
        ];

        const result = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: env.GROQ_MODEL || "qwen/qwen3.8-27b",
              messages,
              temperature: 0.7,
              max_completion_tokens: 1200
            })
          }
        );

        const data = await result.json();

        if (!result.ok) {
          return Response.json(
            { error: result.status === 401
              ? "مفتاح Groq غير صحيح."
              : result.status === 429
                ? "وصلنا للحد المؤقت. عاود من بعد."
                : "Groq ما جاوباتش دابا." },
            { status: result.status === 429 ? 429 : 502 }
          );
        }

        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
          return Response.json({ error: "الجواب فارغ." }, { status: 502 });
        }

        return Response.json({ reply, model: data.model });
      } catch {
        return Response.json(
          { error: "وقع مشكل فمعالجة الطلب." },
          { status: 500 }
        );
      }
    }

    // باقي الملفات: الواجهة ديال التطبيق
    return env.ASSETS.fetch(request);
  }
};
