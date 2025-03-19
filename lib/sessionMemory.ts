import supabaseClient from "./supabaseClient";

// Fetch user session memory
export async function getSessionMemory(userId: string, topic: string) {
  const { data: session, error } = await supabaseClient
    .from("session_memory")
    .select("messages, step_count, current_topic")
    .eq("user_id", userId)
    .eq("current_topic", topic)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !session) return { messages: [], stepCount: 0, topic };

  return {
    messages: session.messages || [],
    stepCount: session.step_count || 0,
    topic: session.current_topic || topic,
  };
}

// Save session memory
export async function saveSessionMemory(
  userId: string,
  userMessage: string,
  aiResponse: string,
  topic: string
) {
  const { data: existingSession } = await supabaseClient
    .from("session_memory")
    .select("session_id, messages, step_count, current_topic")
    .eq("user_id", userId)
    .eq("current_topic", topic)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let sessionId,
    messages = [],
    stepCount = 0;

  if (!existingSession) {
    sessionId = crypto.randomUUID();
    messages = [];
    stepCount = 0;
  } else {
    sessionId = existingSession.session_id;
    messages = existingSession.messages || [];
    stepCount = existingSession.step_count + 1;
  }

  messages.push({ role: "user", content: userMessage });
  messages.push({ role: "assistant", content: aiResponse });
  messages = messages.slice(-10); // Keep last 10 messages

  await supabaseClient.from("session_memory").upsert([
    {
      user_id: userId,
      session_id: sessionId,
      messages,
      step_count: stepCount,
      current_topic: topic,
    },
  ]);
}
