import { AsyncLocalStorage } from "node:async_hooks";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { getAgentByName, type Schedule } from "agents";

import { getSchedulePrompt } from "agents/schedule";
import {
  convertToModelMessages,
  type GenerateTextOnFinishCallback,
  isStepCount,
  streamText,
  type ToolSet,
} from "ai";
import { tools } from "@/tools";
import { model } from "./lib/ai";
import { createChat, getChatById, getChatsByUserId } from "./lib/db";
import { getAuthPolicies } from "./lib/policy";
import {
  generateRandomUUID,
  getSessionCookie,
  processChatsData,
} from "./lib/utils";
import {
  checkAuthenticatedUserRoute,
  loginUserRoute,
  logoutUserRoute,
  registerUserRoute,
} from "./routes/auth";

export const agentContext = new AsyncLocalStorage<Chat>();

export class Chat extends AIChatAgent<Env> {
  async onChatMessage(
    onFinish?: GenerateTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ) {
    return agentContext.run(this, async () => {
      const result = streamText({
        model: model,
        system: `You are a helpful assistant...
${getSchedulePrompt({ date: new Date() })}
If the user asks to schedule a task, use the schedule tool to schedule the task.`,
        messages: await convertToModelMessages(this.messages),
        tools,
        onFinish,
        onError: (error) => console.error("Error while streaming:", error),
        stopWhen: isStepCount(10),
      });

      return result.toUIMessageStreamResponse();
    });
  }

  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages((messages) => [
      ...messages,
      {
        id: generateRandomUUID(),
        role: "user",
        parts: [
          { type: "text", text: `Running scheduled task: ${description}` },
        ],
      },
    ]);
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    // 1. Healthcheck for API key
    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      return Response.json({ success: hasOpenAIKey });
    }

    // 2. Auth - Me
    if (url.pathname === "/auth/me") {
      return await checkAuthenticatedUserRoute(request, env);
    }

    // 3. Auth - Logout
    if (url.pathname === "/auth/logout") {
      return logoutUserRoute(request, env);
    }

    // 4. Auth - Signup
    if (url.pathname === "/auth/signup") {
      return await registerUserRoute(request, env);
    }

    // 5. Auth - Login
    if (url.pathname === "/auth/login") {
      return await loginUserRoute(request, env);
    }

    if (url.pathname === "/auth/policy") {
      const policies = await getAuthPolicies(env);
      return Response.json(policies);
    }

    // 6. -- "Authenticated" part of the app --
    let userId = "no_user";
    const sess = getSessionCookie(request);
    if (sess) {
      try {
        const session = JSON.parse(atob(sess));
        if (session.userId) userId = session.userId;
      } catch {}
    }

    // 7. Chats: only show for logged-in users
    if (url.pathname === "/api/chats") {
      if (userId === "no_user") return Response.json([], { status: 401 });

      const results = await getChatsByUserId(env, userId);
      const chats = processChatsData(results);

      return Response.json(chats);
    }

    // 8. Create chat if not present (auto)
    const title = request.headers.get("title") || "title";
    const chatId =
      request.headers.get("chatId") || url.searchParams.get("_pk") || "no_user";
    if (userId !== "no_user" && chatId !== "no_user") {
      // create chat if missing
      const result = await getChatById(env, chatId);
      if (!result) {
        await createChat(env, userId, chatId, title);
      }
    }

    // 9. Chat agent handoff
    if (userId === "no_user")
      return Response.json({ error: "Not authenticated" }, { status: 401 });

    const namedAgent = getAgentByName<Env, Chat>(env.Chat, chatId);
    const namedResp = (await namedAgent).fetch(request);
    return namedResp;
  },
} satisfies ExportedHandler<Env>;
