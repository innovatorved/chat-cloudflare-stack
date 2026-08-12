# Cloudflare Chat App

Real-time AI chat on Cloudflare Workers. Users sign in, add their own Google AI key, and chat in persistent rooms backed by Durable Objects and D1.

**Live:** [chat.vedgupta.in](https://chat.vedgupta.in)

---

## How it works

- **Auth** — Email/password signup and login. Sessions are cookie-based.
- **Auth policies** — Password rules, allowed email domains, and login lockout live in `auth-policies.json` and are stored in KV.
- **AI keys** — Each user enters their own Google AI key after login. Keys are encrypted in D1 (`AI_KEY_ENCRYPTION_SECRET` on the server). Update anytime from **Settings** (gear icon).
- **Database** — D1 holds users, chats, and encrypted keys. Durable Objects hold live chat/agent state.

---

## Setup

```bash
git clone https://github.com/innovatorved/chat-cloudflare-stack.git
cd chat-cloudflare-stack
bun install
```

### Wrangler & secrets

Configure D1, KV, and Durable Object bindings in `wrangler.jsonc`.

For local dev, copy `.dev.vars.example` to `.dev.vars` and set a random `AI_KEY_ENCRYPTION_SECRET` (32+ characters). This encrypts user API keys at rest — it is **not** a Google AI key.

Production:

```bash
bunx wrangler secret put AI_KEY_ENCRYPTION_SECRET
```

### Database (D1)

New install:

```bash
bunx wrangler d1 execute chat-user-id-db --remote --file=./schema.sql
```

Existing database (adds encrypted key columns):

```bash
bunx wrangler d1 execute chat-user-id-db --remote --file=./schema-migration-ai-key.sql
```

Local dev: add `--local` instead of `--remote`.

### Auth policies (KV)

Edit `auth-policies.json` for password rules, allowed domains, and lockout settings, then upload:

```bash
bunx wrangler kv key put --binding=CACHE_CHAT auth-policies "$(cat auth-policies.json)"
```

Add `--local` for local dev.

### Run

```bash
bun run start
```

After login, add a Google AI key from [Google AI Studio](https://aistudio.google.com/apikey) when prompted.

---

## Deploy

```bash
bun run check   # optional
bun run deploy
```

---

Built on [cloudflare/agents-starter](https://github.com/cloudflare/agents-starter).  
_Ved Gupta — [vedgupta.in](https://vedgupta.in)_
