import { Mistral } from "@mistralai/mistralai";
import { encodeText, getMostRelevantUserHistory } from "./embeddings";
import supabaseClient from "./supabaseClient";

const client = new Mistral({
  apiKey: "WaqqHNtuthNSd64Td3LjnjHXChxeVsld",
});

export async function generatePersonalizedResponse(
  userId: string,
  input: string
) {
  console.log("Fetching user history for:", userId);

  // Fetch conversation history (last 5 messages)
  const { data: conversationHistory, error: historyError } =
    await supabaseClient
      .from("conversations")
      .select("role, message")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

  if (historyError) {
    console.error("Error fetching conversation history:", historyError);
    return "Error retrieving previous messages.";
  }

  console.log("Conversation History:", conversationHistory);

  // Fetch user profile
  const { data: userProfile, error } = await supabaseClient
    .from("profile")
    .select(
      "username, age, standard, favourite_subjects, learning_goals, give_hints"
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return "Error fetching user profile.";
  }

  console.log("User Profile:", userProfile, userId);

  // Fetch relevant history from `user_histories`
  const userHistories = await fetch(
    `http://localhost:3000/api/history?userId=${userId}`
  ).then((res) => res.json());

  const embeddings = await Promise.all(
    userHistories.data.map((h) => encodeText(h.content))
  );
  const inputEmbedding = await encodeText(input);
  const relevantHistories = getMostRelevantUserHistory(
    embeddings,
    inputEmbedding,
    userHistories.data.map((h) => h.content),
    3
  );

  console.log("Most Relevant User Histories:", relevantHistories);

  // Decide the response format based on `give_hints`
  const hintMode = userProfile.give_hints
    ? `- **Step 1:** Ask a guiding question before revealing the full answer.
       - **Step 2:** Adjust the difficulty based on their previous knowledge.
       - **Step 3:** Encourage interaction by breaking down complex topics.`
    : `- Directly provide the answer without guiding questions.
       - Keep the response clear, concise, and to the point.`;

  // Include conversation history in the prompt
  let conversationContext = conversationHistory
    .reverse()
    .map((msg) => `${msg.role}: ${msg.message}`)
    .join("\n");

  // Construct the prompt
  let guidedPrompt = `You are an AI tutor for ${userProfile.username}.
  
  **User Information:**
  - AGE: ${userProfile.age}
  - GRADE: ${userProfile.standard}
  - FAVORITE SUBJECTS: ${userProfile.favourite_subjects.join(", ")}
  - LEARNING GOALS: ${userProfile.learning_goals}

  **Previous Conversation:**
  ${conversationContext || "No prior conversation found."}

  **Related Topics User Has Studied Before:**
  ${
    relevantHistories.length > 0
      ? relevantHistories.join("\n")
      : "No relevant history found."
  }

  **User Question:** ${input}

  **Your Task:**
  ${hintMode}
  
  Return your response as a JSON object with these fields:
  - "mainResponse": The main educational content
  - "followUpQuestions": Array of 2-3 follow-up questions to encourage learning
  - "difficultyLevel": Your assessment of content difficulty (beginner/intermediate/advanced)
  - "relatedTopics": Array of 2-3 related topics for further exploration`;

  // Generate AI response
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content:
          "You are an interactive AI tutor. Guide the user step by step.",
      },
      { role: "user", content: guidedPrompt },
    ],
    responseFormat: { type: "json_object" },
  });

  const aiResponse = response.choices[0].message.content;

  console.log("AI Response:", aiResponse);

  // Store user message and AI response in `conversations`
  await supabaseClient.from("conversations").insert([
    { user_id: userId, role: "user", message: input },
    { user_id: userId, role: "assistant", message: aiResponse },
  ]);

  return aiResponse;
}
