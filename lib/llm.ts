import { Mistral } from "@mistralai/mistralai";
import { encodeText, getMostRelevantUserHistory } from "./embeddings";
import supabaseClient from "./supabaseClient";

const client = new Mistral({ apiKey: "WaqqHNtuthNSd64Td3LjnjHXChxeVsld" });

interface TutorResponse {
  answer: string;
  steps: string[];
  followup_questions: string[];
  confidence_score: number;
  key_concepts: string[];
  is_final_answer: boolean;
}

function validateStructure(output: string): TutorResponse {
  try {
    const result = JSON.parse(output);
    if (!result.answer) throw new Error("Missing answer field");
    if (!Array.isArray(result.steps)) throw new Error("Steps must be an array");
    if (!Array.isArray(result.followup_questions))
      throw new Error("Followup questions must be an array");
    if (typeof result.confidence_score !== "number")
      throw new Error("Confidence score must be a number");
    if (!Array.isArray(result.key_concepts))
      throw new Error("Key concepts must be an array");
    if (typeof result.is_final_answer !== "boolean")
      throw new Error("is_final_answer must be a boolean");
    return result;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return {
      answer: "Error formatting response. Please try again.",
      steps: [],
      followup_questions: [],
      confidence_score: 0,
      key_concepts: [],
      is_final_answer: true, // Default to final answer on error
    };
  }
}

export async function generatePersonalizedResponse(
  userId: string,
  input: string
): Promise<TutorResponse> {
  try {
    // Fetch conversation history
    const { data: conversationHistory, error: historyError1 } =
      await supabaseClient
        .from("conversations")
        .select("role, message, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

    if (historyError1)
      throw new Error(`Conversation history error: ${historyError1.message}`);

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from("profile")
      .select(
        "username, age, standard, favourite_subjects, learning_goals, give_hints"
      )
      .eq("id", userId)
      .single();

    if (profileError)
      throw new Error(`Profile fetch error: ${profileError.message}`);

    // Fetch relevant user histories
    const { data: userHistories, error: historyError } = await supabaseClient
      .from("user_histories")
      .select("content")
      .eq("user_id", userId);

    if (historyError)
      throw new Error(`User history error: ${historyError.message}`);

    // Get relevant history embeddings
    const embeddings = await Promise.all(
      userHistories.map((h) => encodeText(h.content))
    );
    const relevantHistories = getMostRelevantUserHistory(
      embeddings,
      await encodeText(input),
      userHistories.map((h) => h.content),
      3
    );

    // Build conversation context
    const conversationContext =
      conversationHistory
        ?.map((msg) => {
          if (msg.role === "assistant" && msg.metadata) {
            return `${msg.role}: ${msg.metadata.answer}`;
          }
          return `${msg.role}: ${msg.message}`;
        })
        .join("\n") || "No prior conversation found.";

    // Construct the AI prompt
    const guidedPrompt = `You are an AI tutor for ${userProfile.username}, a ${
      userProfile.age
    }-year-old in grade ${userProfile.standard}.
    
    **User Information:**
    - Age: ${userProfile.age}
    - Grade: ${userProfile.standard}
    - Favorite Subjects: ${userProfile.favourite_subjects.join(", ")}
    - Learning Goals: ${userProfile.learning_goals}
    - Hint Mode: ${userProfile.give_hints ? "Enabled" : "Disabled"}

    **Previous Conversation:**
    ${conversationContext}

    **Related Topics Studied Before:**
    ${relevantHistories.length ? relevantHistories.join("\n") : "None"}

    **User Question:** ${input}

    **Response Requirements:**
    1. ${
      userProfile.give_hints
        ? "Guide the user to the answer through Socratic questioning (3-5 steps)"
        : "Provide a direct, comprehensive answer"
    }
    2. Include follow-up questions to encourage deeper exploration
    3. Format response as JSON with:
       - answer: string
       - steps: string[]
       - followup_questions: string[]
       - confidence_score: number
       - key_concepts: string[]
       - is_final_answer: boolean`;

    // Generate AI response
    const response = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: `You are an interactive tutor. Respond in valid JSON.${
            userProfile.give_hints
              ? " Ask probing questions before revealing the final answer."
              : " Provide direct answers immediately."
          }`,
        },
        { role: "user", content: guidedPrompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const rawResponse = response.choices[0].message.content;
    const aiResponse = validateStructure(rawResponse);

    // Store conversation with metadata
    await supabaseClient.from("conversations").insert([
      {
        user_id: userId,
        role: "user",
        message: input,
        metadata: { question: input },
      },
      {
        user_id: userId,
        role: "assistant",
        message: aiResponse.answer,
        metadata: aiResponse,
      },
    ]);

    return aiResponse;
  } catch (error) {
    console.error("Error in generatePersonalizedResponse:", error);
    return {
      answer: "I'm having trouble generating a response. Please try again.",
      steps: [],
      followup_questions: [],
      confidence_score: 0,
      key_concepts: [],
      is_final_answer: true,
    };
  }
}

// Helper function for interactive sessions
export async function handleTutorSession(userId: string, input: string) {
  let response = await generatePersonalizedResponse(userId, input);
  const responses = [response];

  // Continue conversation if in hint mode and not final answer
  while (response.is_final_answer === false) {
    const nextQuestion = response.followup_questions[0] || input;
    response = await generatePersonalizedResponse(userId, nextQuestion);
    responses.push(response);

    // Safety break
    if (responses.length > 5) break;
  }

  return {
    final_answer: responses[responses.length - 1].answer,
    conversation_steps: responses,
  };
}
