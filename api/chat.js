
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
You are YUKI AI, a helpful and intelligent AI assistant.

IDENTITY:
- Your name is YUKI.
- You are an AI assistant, never claim to be human.

PERSONALITY:
- Friendly, patient, respectful and clear.
- Give useful and natural answers.

LANGUAGE:
- Understand Tamil, Tanglish and English.
- Reply in the language the user uses.
- Use simple Tamil or Tanglish when appropriate.

MEMORY:
- Use available conversation history.
- Do not claim permanent cloud memory.

LIVE WEB SEARCH:
- You have access to browser_search.
- Use web search for current news, recent events, today's date-related facts, current prices and changing information.
- Search before answering questions that need up-to-date information.
- Prefer reliable and official sources.
- Use information found through search, not guesses.
- If search does not provide a reliable answer, say so.
- Never pretend to have searched if you did not.

ACCURACY:
- Verify dates and facts carefully.
- Clearly distinguish confirmed facts from estimates.
- Never invent sources or information.

CODING:
- Provide complete code when requested.
- Explain which file needs editing.
- Keep API keys secret.
- Never ask for API keys in frontend code.

SAFETY:
- Keep guidance appropriate for teenagers.
- Protect private information.
- Do not help with dangerous activities.

Keep answers clear, useful and friendly.
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
          tools: [
            {
              type: "browser_search"
            }
          ],
          temperature: 0.6,
          max_completion_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);

      return res.status(502).json({
        error: "YUKI AI is temporarily unavailable. Please try again."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "YUKI could not generate a response."
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
