# Cloudflare Chat App

Real-time AI chat on Cloudflare Workers — Durable Objects, D1, KV, and custom auth.

**Live:** [chat.vedgupta.in](https://chat.vedgupta.in)

**Stack:** React, Vite, Workers, Durable Objects, D1, KV, AI SDK, [@cloudflare/ai-chat](https://www.npmjs.com/package/@cloudflare/ai-chat). Tooling: [Bun](https://bun.sh), TypeScript, [Biome](https://biomejs.dev).

---

## Setup

```bash
git clone https://github.com/innovatorved/chat-cloudflare-stack.git
cd chat-cloudflare-stack
bun install
```

1. Configure bindings in `wrangler.jsonc` (D1, KV, Durable Objects).
2. Copy `.dev.vars.example` → `.dev.vars` for local secrets.
3. Set the Google AI key (production):

```bash
bunx wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
```

4. Apply the D1 schema:

```bash
bunx wrangler d1 execute chat-user-id-db --local --file=./schema.sql   # local
bunx wrangler d1 execute chat-user-id-db --remote --file=./schema.sql  # production
```

5. Upload auth policies from `auth-policies.json`:

```bash
bunx wrangler kv key put --binding=CACHE_CHAT auth-policies "$(cat auth-policies.json)" --local
bunx wrangler kv key put --binding=CACHE_CHAT auth-policies "$(cat auth-policies.json)"
```

6. Run locally:

```bash
bun run start
```

---

## Deploy

```bash
bun run deploy
```

Production is served on the custom domain only (`workers_dev` and preview URLs are disabled in `wrangler.jsonc`).

---

Built on [cloudflare/agents-starter](https://github.com/cloudflare/agents-starter).  
_Ved Gupta — [vedgupta.in](https://vedgupta.in)_
