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
import { createUserModel } from "./lib/ai";
import { getUserDecryptedAiKey } from "./lib/ai-key";
import {
  createChat,
  getChatById,
  getChatsByUserId,
  userHasAiKey,
} from "./lib/db";
import { getAuthPolicies } from "./lib/policy";
import {
  generateRandomUUID,
  getUserIdFromRequest,
  processChatsData,
} from "./lib/utils";
import { aiKeyStatusRoute, saveAiKeyRoute } from "./routes/ai-key";
import {
  checkAuthenticatedUserRoute,
  loginUserRoute,
  logoutUserRoute,
  registerUserRoute,
} from "./routes/auth";

export const agentContext = new AsyncLocalStorage<Chat>();

export type AgentRequestContext = {
  userId: string;
  chatId: string;
};

export const agentRequestContext = new AsyncLocalStorage<AgentRequestContext>();

export class Chat extends AIChatAgent<Env> {
  private sessionUserId: string | null = null;

  private resolveChatId(request: Request): string {
    return (
      request.headers.get("chatId") ??
      new URL(request.url).searchParams.get("_pk") ??
      this.ctx.id.name ??
      ""
    );
  }

  async fetch(request: Request): Promise<Response> {
    const userId = getUserIdFromRequest(request);
    if (userId) {
      this.sessionUserId = userId;
    }

    const chatId = this.resolveChatId(request);

    return agentRequestContext.run({ chatId, userId: userId ?? "" }, () =>
      super.fetch(request),
    );
  }

  async onChatMessage(
    onFinish?: GenerateTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ) {
    return agentContext.run(this, async () => {
      const chatId =
        this.ctx.id.name ?? agentRequestContext.getStore()?.chatId ?? "";

      let userId = this.sessionUserId ?? "";
      if (chatId) {
        const chat = await getChatById(this.env, chatId);
        if (chat?.userId) {
          userId = chat.userId;
        } else if (userId) {
          await createChat(this.env, userId, chatId, "New Chat");
        }
      }

      if (!userId) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
      }

      const apiKey = await getUserDecryptedAiKey(this.env, userId);
      if (!apiKey) {
        return Response.json({ error: "AI key required" }, { status: 403 });
      }

      const result = streamText({
        model: createUserModel(apiKey),
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

    if (url.pathname === "/auth/me") {
      return await checkAuthenticatedUserRoute(request, env);
    }

    if (url.pathname === "/auth/logout") {
      return logoutUserRoute(request, env);
    }

    if (url.pathname === "/auth/signup") {
      return await registerUserRoute(request, env);
    }

    if (url.pathname === "/auth/login") {
      return await loginUserRoute(request, env);
    }

    if (url.pathname === "/auth/ai-key/status") {
      return aiKeyStatusRoute(request, env);
    }

    if (url.pathname === "/auth/ai-key") {
      return saveAiKeyRoute(request, env);
    }

    if (url.pathname === "/auth/policy") {
      const policies = await getAuthPolicies(env);
      return Response.json(policies);
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      if (url.pathname === "/api/chats") {
        return Response.json([], { status: 401 });
      }
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (url.pathname === "/api/chats") {
      const results = await getChatsByUserId(env, userId);
      const chats = processChatsData(results);
      return Response.json(chats);
    }

    const title = request.headers.get("title") || "title";
    const chatId =
      request.headers.get("chatId") || url.searchParams.get("_pk") || "no_user";

    if (chatId !== "no_user") {
      const existingChat = await getChatById(env, chatId);
      if (existingChat) {
        if (existingChat.userId !== userId) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        await createChat(env, userId, chatId, title);
      }
    }

    if (!(await userHasAiKey(env, userId))) {
      return Response.json({ error: "AI key required" }, { status: 403 });
    }

    const namedAgent = getAgentByName<Env, Chat>(env.Chat, chatId);
    const namedResp = (await namedAgent).fetch(request);
    return namedResp;
  },
} satisfies ExportedHandler<Env>;
