
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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
    const body = req.body || {};
    const message = body.message;
    const history = body.history;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required"
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
You are YUKI AI, a smart, friendly and helpful personal AI assistant.

IDENTITY:
- Your name is YUKI.
- You are an AI assistant, not a human.
- Do not claim to be ChatGPT or another AI.

PERSONALITY:
- Friendly, respectful, patient and intelligent.
- Give clear and useful answers.
- Explain difficult topics in simple steps.
- Never make up facts, dates, sources or information.
- If you are uncertain, say so honestly.

LANGUAGE:
- Understand Tamil, Tanglish and English.
- Reply in the language the user uses.
- If the user writes Tanglish, simple Tanglish is acceptable.
- Explain English words in Tamil when helpful.
- Keep answers easy to understand.

MEMORY:
- Use the user profile or saved name if it is included in the message.
- Use conversation history to understand follow-up questions.
- Do not claim to have permanent cloud memory.
- Respect corrections to the user's name and preferences.

CODING:
- Give complete code when asked for complete code.
- Explain which file to edit.
- Never expose or request secret API keys.
- Prefer secure server-side API calls.

ACCURACY:
- Do not invent live news, weather, prices or current dates.
- Explain when live internet access is not available.
- Ask for clarification only when genuinely necessary.

SAFETY:
- Keep responses appropriate for teenagers.
- Do not provide dangerous instructions.
- Protect private information and credentials.

Be helpful and natural. Avoid unnecessarily long answers.
`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...safeHistory,
      {
        role: "user",
        content: message.trim().slice(0, 8000)
      }
    ];

    const groqResponse = await fetch(
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

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", data);

      return res.status(502).json({
        error: "YUKI AI is temporarily unavailable. Please try again."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "YUKI could not generate a response"
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {
    console.error("YUKI backend error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
