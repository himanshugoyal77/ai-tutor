import * as tf from "@tensorflow/tfjs";
import { pipeline } from "@xenova/transformers";

let embedder: any = null;

// Load the model dynamically to avoid blocking the main thread
async function loadModel() {
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

export async function encodeText(text: string): Promise<number[]> {
  if (!embedder) await loadModel();
  console.log("Loading model...");
  const embedding = await embedder(text, { pooling: "mean", normalize: true });
  return embedding.data;
}

// Find the most relevant user history based on cosine similarity
export function getMostRelevantUserHistory(
  embeddings: number[][],
  inputEmbedding: number[],
  userHistories: string[],
  topN: number = 3
): string[] {
  if (embeddings.length === 0)
    return ["I don't have enough data to determine your favorite database."];

  const inputTensor = tf.tensor1d(inputEmbedding);
  const similarities: { index: number; similarity: number }[] = [];

  // Compute cosine similarity for all user histories
  for (let i = 0; i < embeddings.length; i++) {
    const embTensor = tf.tensor1d(embeddings[i]);

    const dotProduct = inputTensor.dot(embTensor).dataSync()[0];
    const normInput = inputTensor.norm().dataSync()[0];
    const normEmb = embTensor.norm().dataSync()[0];

    const similarity = dotProduct / (normInput * normEmb + 1e-8); // Avoid division by zero
    similarities.push({ index: i, similarity });
  }

  // Sort by highest similarity and select the top `topN` results
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topIndices = similarities.slice(0, topN).map((s) => s.index);

  // Return top `topN` most relevant user histories
  return topIndices.map((index) => userHistories[index]);
}
