import { Mistral } from "@mistralai/mistralai";
import { encodeText, getMostRelevantUserHistory } from "./embeddings";
import supabaseClient from "./supabaseClient";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

export async function generatePersonalizedResponse(userId: string, input: string) {
  console.log("Fetching conversation history for:", userId);

  // Fetch last 5 messages from history
  const { data: conversationHistory, error: historyError } = await supabaseClient
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
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return "Error fetching user profile.";
  }

  // Fetch relevant history
  const userHistories = await fetch(
    `http://localhost:3001/api/history?userId=${userId}`
  ).then((res) => res.json());

  const embeddings = await Promise.all(userHistories.data.map((h) => encodeText(h.content)));
  const inputEmbedding = await encodeText(input);
  const relevantHistories = getMostRelevantUserHistory(
    embeddings,
    inputEmbedding,
    userHistories.data.map((h) => h.content),
    3
  );

  console.log("Most Relevant User Histories:", relevantHistories);

  // Construct context with previous messages
  let conversationContext = conversationHistory
    .reverse()
    .map((msg) => `${msg.role}: ${msg.message}`)
    .join("\n");

  // Construct a guided interactive response
  let guidedPrompt = `You are an AI tutor for ${userProfile.username}.
  
  **User Information:**
  - AGE: ${userProfile.age}
  - GRADE: ${userProfile.standard}
  - FAVORITE SUBJECTS: ${userProfile.favourite_subjects.join(", ")}
  - LEARNING GOALS: ${userProfile.learning_goals}

  **Previous Conversation:**
  ${conversationContext}

  **User Question:** ${input}

  **Related Topics User Has Studied Before:**
  ${relevantHistories.length > 0 ? relevantHistories.join("\n") : "No relevant history found."}

  **Your Task:**
  - **Step 1:** Ask a guiding question before revealing the full answer.
  - **Step 2:** Adjust the difficulty based on their previous knowledge.
  - **Step 3:** Encourage interaction by breaking down complex topics.`;

  // Generate AI response
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      { role: "system", content: "You are an interactive AI tutor. Guide the user step by step." },
      { role: "user", content: guidedPrompt },
    ],
  });

  const aiResponse = response.choices[0].message.content;

  console.log("AI Response:", aiResponse);

  // Store user message in Supabase
  await supabaseClient.from("conversations").insert([
    { user_id: userId, role: "user", message: input },
    { user_id: userId, role: "assistant", message: aiResponse },
  ]);

  return aiResponse;
}

// const client = new Mistral({
//   apiKey: process.env.MISTRAL_API_KEY!,
// });

// export async function generatePersonalizedResponse(
//   userId: string,
//   input: string
// ) {
//   console.log("Fetching user history for:", userId);
//   const userHistories = await fetch(
//     `http://localhost:3001/api/history?userId=${userId}`
//   ).then((res) => res.json());

//   console.log("User Histories:", userHistories);

//   // Fetch user profile
//   const { data: userProfile, error } = await supabaseClient
//     .from("profile")
//     .select("*")
//     .eq("id", userId).single();

//   if (error) {
//     console.error("Error fetching user profile: in llms", error);
//     return "Error fetching user profile";
//   }

//   console.log("User Profile:", userProfile, userId);

//   // Encode user history into embeddings
//   const embeddings = await Promise.all(
//     userHistories.data.map((h) => encodeText(h.content))
//   );
//   console.log("Embeddings:", embeddings);

//   const inputEmbedding = await encodeText(input);
//   console.log("Input Embedding:", inputEmbedding);

//   // Get most relevant history
//   const relevantHistory = getMostRelevantUserHistory(
//     embeddings,
//     inputEmbedding,
//     userHistories.data.map((h) => h.content)
//   );

//   console.log("Most Relevant User History:", relevantHistory);

//   // Generate a response using Mistral AI
//   const response = await client.chat.complete({
//     model: "mistral-large-latest",
//     messages: [
//       {
//         role: "system",
//         content:
//           "You are a helpful, personalized AI tutor that adapts to each student's specific needs and background.",
//       },
//       {
//         role: "user",
//         content: `You are a personalized AI tutor for ${
//           userProfile.username
//         }. Tailor your responses based on the following student information:

//   AGE: ${userProfile.age} years old
//   GRADE/LEVEL: ${userProfile.standard}
//   FAVORITE SUBJECTS: ${userProfile.favourite_subjects.join(", ")}
//   LEARNING GOALS: ${userProfile.learning_goals}

//   Adapt your explanations to be age-appropriate while considering their academic level and interests. If they show understanding of specific topics, you can provide more advanced information in those areas.

//   Their question is: ${input}

//   Most relevant user history:
//   ${relevantHistory}

//   Response:`,
//       },
//     ],
//   });

//   console.log(response.choices[0].message.content);
//   return response.choices[0].message.content;
// }
