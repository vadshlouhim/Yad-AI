import OpenAI from "openai";
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "YOUR_KEY",
});
async function main() {
  try {
    const res = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      stream: true,
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "", tool_calls: [
            { id: "call_123", type: "function", function: { name: "update_community_settings", arguments: "{}" } }
        ] },
        { role: "tool", tool_call_id: "call_123", content: "Action exécutée" }
      ]
      // No tools array here!
    });
    for await (const chunk of res) {
        process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }
  } catch (e) {
    console.error("ERROR:", e.response?.data || e.message);
  }
}
main();
