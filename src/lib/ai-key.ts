import { decryptSecret } from "./crypto-utils";
import { getUserAiKeyRecord } from "./db";

const MIN_API_KEY_LENGTH = 20;

export function validateApiKeyFormat(apiKey: string): boolean {
  const trimmed = apiKey.trim();
  return trimmed.length >= MIN_API_KEY_LENGTH;
}

export async function validateGoogleApiKey(apiKey: string): Promise<boolean> {
  const trimmed = apiKey.trim();
  if (!validateApiKeyFormat(trimmed)) return false;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`,
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function getUserDecryptedAiKey(
  env: Env,
  userId: string,
): Promise<string | null> {
  const masterSecret = env.AI_KEY_ENCRYPTION_SECRET;
  if (!masterSecret) return null;

  const record = await getUserAiKeyRecord(env, userId);
  if (!record?.aiKeyCiphertext || !record.aiKeyIv) return null;

  try {
    return await decryptSecret(
      record.aiKeyCiphertext,
      record.aiKeyIv,
      masterSecret,
      userId,
    );
  } catch {
    return null;
  }
}
