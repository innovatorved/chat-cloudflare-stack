import { createGoogleGenerativeAI } from "@ai-sdk/google";

const modelId = "gemini-2.5-flash-lite";

export function createUserModel(apiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}
