import { kvDel, kvGet, kvSet } from "./cache";

export async function checkUserExists(env: Env, email: string) {
  const cacheKey = `user-exists:${email}`;
  let exists = await kvGet<boolean>(env, cacheKey);
  if (exists !== null) return exists;

  const row = await env.DB.prepare("SELECT 1 FROM Users WHERE email = ?")
    .bind(email)
    .first();
  exists = !!row;
  await kvSet(env, cacheKey, exists);
  return exists;
}

export async function createUser(
  env: Env,
  userId: string,
  email: string,
  hash: string,
  salt: string,
) {
  await env.DB.prepare(
    "INSERT INTO Users (userId, email, passwordHash, passwordSalt) VALUES (?, ?, ?, ?)",
  )
    .bind(userId, email, hash, salt)
    .run();

  // Invalidate cache for this user
  await kvDel(env, `user-exists:${email}`);
  await kvDel(env, `user-by-email:${email}`);
}

export async function getUserByEmail(env: Env, email: string) {
  const cacheKey = `user-by-email:${email}`;
  const cached = await kvGet<{
    userId: string;
    passwordHash: string;
    passwordSalt: string;
  }>(env, cacheKey);
  if (cached) return cached;

  const row = await env.DB.prepare(
    "SELECT userId, passwordHash, passwordSalt FROM Users WHERE email = ?",
  )
    .bind(email)
    .first<{ userId: string; passwordHash: string; passwordSalt: string }>();

  if (row) {
    await kvSet(env, cacheKey, row);
  }
  return row;
}

export async function getChatsByUserId(env: Env, userId: string) {
  const cacheKey = `chats-by-user:${userId}`;
  const cached = await kvGet<
    Array<{ chatId: string; title: string; createdTime: string }>
  >(env, cacheKey);
  if (cached) return cached;

  const query = await env.DB.prepare(
    "SELECT chatId, title, createdTime FROM Chats WHERE userId = ? ORDER BY createdTime DESC",
  )
    .bind(userId)
    .all<{ chatId: string; title: string; createdTime: string }>();

  const results = query.results;
  await kvSet(env, cacheKey, results);
  return results;
}

export async function getChatById(env: Env, chatId: string) {
  const cacheKey = `chat:${chatId}`;
  const chat = await kvGet<{ chatId: string; userId: string } | null>(
    env,
    cacheKey,
  );
  if (chat) return chat;

  const row = await env.DB.prepare(
    "SELECT chatId, userId FROM Chats WHERE chatId = ?",
  )
    .bind(chatId)
    .first<{ chatId: string; userId: string }>();

  if (row) await kvSet(env, cacheKey, row);
  return row ?? null;
}

export async function getUserAiKeyRecord(env: Env, userId: string) {
  const row = await env.DB.prepare(
    "SELECT aiKeyCiphertext, aiKeyIv FROM Users WHERE userId = ?",
  )
    .bind(userId)
    .first<{ aiKeyCiphertext: string | null; aiKeyIv: string | null }>();

  if (!row) return null;
  return row;
}

export async function userHasAiKey(env: Env, userId: string): Promise<boolean> {
  const record = await getUserAiKeyRecord(env, userId);
  return !!(record?.aiKeyCiphertext && record?.aiKeyIv);
}

export async function setUserAiKey(
  env: Env,
  userId: string,
  ciphertext: string,
  iv: string,
) {
  await env.DB.prepare(
    "UPDATE Users SET aiKeyCiphertext = ?, aiKeyIv = ? WHERE userId = ?",
  )
    .bind(ciphertext, iv, userId)
    .run();

  await kvDel(env, `user-ai-key:${userId}`);
}

export async function createChat(
  env: Env,
  userId: string,
  chatId: string,
  title: string,
) {
  await env.DB.prepare(
    "INSERT INTO Chats (chatId, userId, title) VALUES (?, ?, ?)",
  )
    .bind(chatId, userId, title)
    .run();

  // Invalidate the chats-by-user and this chatId's cache
  await kvDel(env, `chats-by-user:${userId}`);
  await kvDel(env, `chat:${chatId}`);
}
