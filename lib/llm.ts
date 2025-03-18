import { Mistral } from "@mistralai/mistralai";
import { encodeText, getMostRelevantUserHistory } from "./embeddings";
import supabaseClient from "./supabaseClient";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

export async function generatePersonalizedResponse(
  userId: string,
  input: string
) {
  console.log("Fetching user history for:", userId);
  const userHistories = await fetch(
    `http://localhost:3001/api/history?userId=${userId}`
  ).then((res) => res.json());

  console.log("User Histories:", userHistories);

  // Fetch user profile
  const { data: userProfile, error } = await supabaseClient
    .from("profile")
    .select("*")
    .eq("id", userId).single();

  if (error) {
    console.error("Error fetching user profile: in llms", error);
    return "Error fetching user profile";
  }

  console.log("User Profile:", userProfile, userId);

  // Encode user history into embeddings
  const embeddings = await Promise.all(
    userHistories.data.map((h) => encodeText(h.content))
  );
  console.log("Embeddings:", embeddings);

  const inputEmbedding = await encodeText(input);
  console.log("Input Embedding:", inputEmbedding);

  // Get most relevant history
  const relevantHistory = getMostRelevantUserHistory(
    embeddings,
    inputEmbedding,
    userHistories.data.map((h) => h.content)
  );

  console.log("Most Relevant User History:", relevantHistory);

  // Generate a response using Mistral AI
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful, personalized AI tutor that adapts to each student's specific needs and background.",
      },
      {
        role: "user",
        content: `You are a personalized AI tutor for ${
          userProfile.username
        }. Tailor your responses based on the following student information:
  
  AGE: ${userProfile.age} years old
  GRADE/LEVEL: ${userProfile.standard}
  FAVORITE SUBJECTS: ${userProfile.favourite_subjects.join(", ")}
  LEARNING GOALS: ${userProfile.learning_goals}
  
  Adapt your explanations to be age-appropriate while considering their academic level and interests. If they show understanding of specific topics, you can provide more advanced information in those areas.
  
  Their question is: ${input}
  
  Most relevant user history:
  ${relevantHistory}
  
  Response:`,
      },
    ],
  });

  console.log(response.choices[0].message.content);
  return response.choices[0].message.content;
}
