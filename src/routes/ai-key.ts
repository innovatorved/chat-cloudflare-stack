import { validateApiKeyFormat, validateGoogleApiKey } from "../lib/ai-key";
import { encryptSecret } from "../lib/crypto-utils";
import { setUserAiKey, userHasAiKey } from "../lib/db";
import { getUserIdFromRequest } from "../lib/utils";

export async function aiKeyStatusRoute(request: Request, env: Env) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ hasKey: false }, { status: 401 });
  }

  const hasKey = await userHasAiKey(env, userId);
  return Response.json({ hasKey });
}

export async function saveAiKeyRoute(request: Request, env: Env) {
  if (request.method !== "POST" && request.method !== "PUT") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const masterSecret = env.AI_KEY_ENCRYPTION_SECRET;
  if (!masterSecret) {
    return Response.json(
      { success: false, message: "Server encryption not configured" },
      { status: 503 },
    );
  }

  const { apiKey } = (await request.json()) as { apiKey?: string };
  if (!apiKey || !validateApiKeyFormat(apiKey)) {
    return Response.json({
      success: false,
      message: "Invalid API key format",
    });
  }

  const isValid = await validateGoogleApiKey(apiKey);
  if (!isValid) {
    return Response.json({
      success: false,
      message: "API key could not be verified with Google",
    });
  }

  const { ciphertext, iv } = await encryptSecret(
    apiKey.trim(),
    masterSecret,
    userId,
  );
  await setUserAiKey(env, userId, ciphertext, iv);

  return Response.json({ success: true, hasKey: true });
}
