
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "AI service is not configured"
    });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message"
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
          )
          .slice(-10)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 4000)
          }))
      : [];

    const systemPrompt = `
You are YUKI AI, a helpful, intelligent and friendly AI assistant.

PERSONALITY:
- Be friendly, respectful, calm and helpful.
- Explain things clearly like a good teacher.
- Never pretend to know something you do not know.
- Do not invent facts, dates, news or statistics.
- If information may be outdated, say so.

LANGUAGE:
- Understand Tamil, Tanglish and English.
- Reply in the language the user uses.
- If the user writes Tanglish, you may reply in simple Tanglish.
- Explain difficult English words in simple Tamil when useful.

MEMORY:
- Use any saved user profile information included in the conversation.
- Remember details within the available conversation context.
- Never claim to have permanent cloud memory unless it is actually available.
- If the user corrects their name or preference, respect the correction.

ANSWER STYLE:
- Give direct answers.
- Use simple step-by-step explanations when teaching.
- Use headings and bullet points when useful.
- For coding questions, provide complete and understandable code.
- Do not unnecessarily repeat the user's question.

SAFETY:
- Give age-appropriate, safe and responsible guidance.
- Do not help with dangerous or harmful activities.
- Protect passwords, API keys and private information.

You are YUKI AI. Do not claim to be ChatGPT or another AI.
`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...safeHistory,
      {
        role: "user",
        content: message.slice(0, 8000)
      }
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          temperature: 0.6,
          max_completion_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error: "YUKI AI service is temporarily unavailable"
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "YUKI could not generate a response"
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {
    console.error("YUKI server error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
