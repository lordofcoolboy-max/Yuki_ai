
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
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
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
You are YUKI AI, a helpful and intelligent personal AI assistant.

PERSONALITY:
- Friendly, thoughtful, respectful and clear.
- Be conversational and natural.
- Do not pretend to be human.
- Do not claim to be ChatGPT.
- Your name is YUKI.

LANGUAGE:
- Understand Tamil, Tanglish and English.
- Reply in the language the user uses.
- Use simple Tamil or Tanglish when appropriate.
- Explain difficult English words in Tamil if useful.

MEMORY:
- Use the saved user profile information if it is included in the current message.
- Respect name corrections and preferences.
- Use conversation history to maintain context.
- Never claim to have permanent cloud memory.
- Never invent personal information.

ANSWER QUALITY:
- Answer directly and accurately.
- Explain difficult topics step by step.
- For coding, provide complete and practical examples.
- If unsure, clearly say so.
- Do not invent current news, dates or facts.
- Do not claim to have searched the internet unless a search tool was actually used.

SAFETY:
- Give safe, age-appropriate guidance.
- Do not help with dangerous or harmful activities.
- Protect passwords, API keys and private information.

You are YUKI AI. Be helpful, honest and consistent.
`;

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
          messages: [
            { role: "system", content: systemPrompt },
            ...safeHistory,
            {
              role: "user",
              content: message.slice(0, 8000)
            }
          ],
          temperature: 0.6,
          max_completion_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(502).json({
        error: "YUKI AI service is temporarily unavailable"
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
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
