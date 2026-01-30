# System Design — Calendar Assistant

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (SPA)                     │
│         React / Next.js (static export)              │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │ Auth View │ │ Calendar  │ │  Chat Interface     │ │
│  │           │ │ Dashboard │ │  (HITL approval UI) │ │
│  └───────────┘ └───────────┘ └────────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│                 Backend API                          │
│          Node.js (Express / Next.js API)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Auth     │ │ Calendar │ │  Agent / Chat        │ │
│  │ Service  │ │ Service  │ │  Service (LangChain) │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
└───┬──────────────┬──────────────────┬───────────────┘
    │              │                  │
    ▼              ▼                  ▼
Google OAuth   Google Calendar    LangChain TS Agent
  2.0 API        API              + LLM Provider
                                  (e.g. Gemini free tier)
                                      │
                                      ▼
                               SQLite / JSON file
                              (conversation memory)
```

## Data Models

### User

| Field          | Type   | Description                        |
|----------------|--------|------------------------------------|
| id             | string | Primary key (Google subject ID)    |
| email          | string | Google account email               |
| display_name   | string | User's display name                |
| access_token   | string | OAuth access token (encrypted)     |
| refresh_token  | string | OAuth refresh token (encrypted)    |
| token_expiry   | datetime | Token expiration timestamp       |
| created_at     | datetime | Account creation time             |

### Conversation

| Field          | Type   | Description                        |
|----------------|--------|------------------------------------|
| id             | string | UUID primary key                   |
| user_id        | string | FK → User                         |
| created_at     | datetime | Conversation start time           |
| updated_at     | datetime | Last activity time                |

### Message

| Field          | Type   | Description                        |
|----------------|--------|------------------------------------|
| id             | string | UUID primary key                   |
| conversation_id| string | FK → Conversation                 |
| role           | enum   | `user`, `assistant`, `tool`        |
| content        | text   | Message body                       |
| created_at     | datetime | Timestamp                        |

### PendingAction

| Field          | Type   | Description                                 |
|----------------|--------|---------------------------------------------|
| id             | string | UUID primary key                            |
| conversation_id| string | FK → Conversation                          |
| action_type    | string | e.g. `create_event`, `delete_event`, `update_event` |
| action_payload | JSON   | Serialized action parameters                |
| status         | enum   | `pending`, `approved`, `rejected`           |
| created_at     | datetime | Timestamp                                 |
| resolved_at    | datetime | When user approved/rejected               |

## API Services & Endpoints

### 1. Auth Service

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/auth/login`         | Redirects to Google OAuth consent    |
| GET    | `/auth/callback`      | Handles OAuth callback, stores tokens, returns session |
| POST   | `/auth/logout`        | Invalidates session                  |
| GET    | `/auth/me`            | Returns current user info            |

**Flow:** Frontend redirects to `/auth/login` → Google consent screen → callback stores tokens → frontend receives session cookie/JWT.

### 2. Calendar Service

| Method | Endpoint                          | Description                                   |
|--------|-----------------------------------|-----------------------------------------------|
| GET    | `/api/calendars`                  | List all calendars the user has access to      |
| GET    | `/api/calendars/{calendarId}`     | Get details for a specific calendar            |
| GET    | `/api/calendars/{calendarId}/events` | List events (query params: `timeMin`, `timeMax`) |
| GET    | `/api/calendars/{calendarId}/events/{eventId}` | Get single event details        |

All endpoints proxy to the Google Calendar API using the user's stored OAuth token, reshaping responses for the frontend.

### 3. Chat / Agent Service (LangChain TypeScript)

The agent is built using **LangChain.js** with the following components:

- **`ChatGoogleGenerativeAI`** — LLM wrapper for Gemini free tier
- **`AgentExecutor`** / `createToolCallingAgent` — orchestrates tool-calling loop
- **`BufferMemory`** with a custom **Mongo-db backed `ChatMessageHistory`** — persists multi-turn context
- **Custom LangChain Tools** — `CreateEventTool`, `UpdateEventTool`, `DeleteEventTool`, `ListEventsTool`, `ListCalendarsTool`
- **Human-in-the-loop** — when the agent emits a calendar-mutating tool call, the backend intercepts it, saves a `PendingAction`, and returns it to the frontend for approval instead of executing immediately

| Protocol | Endpoint                              | Description                                    |
|----------|---------------------------------------|------------------------------------------------|
| WS       | `/ws`                                 | WebSocket — send/receive chat messages          |
| GET      | `/api/conversations`                  | List user's past conversations                  |
| GET      | `/api/conversations/{id}/messages`    | Get full message history for a conversation     |
| GET      | `/api/actions/pending`                | List pending actions awaiting approval          |
| POST     | `/api/actions/{id}/approve`           | Approve a pending action (executes it)          |
| POST     | `/api/actions/{id}/reject`            | Reject a pending action                         |

**WebSocket `/ws` — client sends:**
```json
{
  "type": "send_message",
  "message": "Schedule a meeting with Alex tomorrow at 2pm",
  "conversationId": "uuid | omit for new conversation"
}
```

**WebSocket — server replies:**
```json
{
  "type": "reply",
  "data": {
    "reply": "I'd like to create the following event. Please approve:",
    "conversationId": "uuid",
    "pendingAction": {
      "id": "uuid",
      "actionType": "create_event",
      "params": {
        "summary": "Meeting with Alex",
        "startDateTime": "2026-01-30T14:00:00",
        "endDateTime": "2026-01-30T15:00:00",
        "calendarId": "primary"
      },
      "status": "pending"
    }
  }
}
```

**WebSocket — server error:**
```json
{
  "type": "error",
  "error": "message is required"
}
```

## Data Flow Diagrams

### Authentication Flow

```
User          Frontend         Backend           Google
 │               │                │                │
 │──click login─▶│                │                │
 │               │──GET /auth/login──▶             │
 │               │◀─redirect URL──│                │
 │◀──redirect────│                │                │
 │──consent──────────────────────────────────────▶│
 │◀─────────────────────auth code─────────────────│
 │──callback─────▶               │                │
 │               │──GET /auth/callback?code=──────▶│
 │               │               │──exchange code─▶│
 │               │               │◀─tokens────────│
 │               │               │ (store tokens)  │
 │               │◀─session/JWT──│                │
 │◀──logged in───│               │                │
```

### Calendar Viewing Flow

```
User          Frontend              Backend          Google Calendar API
 │               │                     │                    │
 │──view cals───▶│                     │                    │
 │               │──GET /api/calendars─▶                    │
 │               │                     │──list calendars───▶│
 │               │                     │◀─calendar list─────│
 │               │◀─calendars JSON─────│                    │
 │◀──render──────│                     │                    │
 │               │                     │                    │
 │──click cal───▶│                     │                    │
 │               │──GET /api/calendars/{id}/events─────────▶│
 │               │                     │──list events──────▶│
 │               │                     │◀─events───────────│
 │               │◀─events JSON────────│                    │
 │◀──render──────│                     │                    │
```

### Chat with Human-In-The-Loop Flow

```
User          Frontend              Backend             LLM           Google Cal API
 │               │                     │                  │                │
 │──"schedule    │                     │                  │                │
 │  meeting"────▶│                     │                  │                │
 │               │──WS send_message───▶                   │                │
 │               │                     │──prompt + ───────▶                │
 │               │                     │  conversation    │                │
 │               │                     │  history         │                │
 │               │                     │◀─tool call───────│                │
 │               │                     │  (create_event)  │                │
 │               │                     │                  │                │
 │               │                     │ (save PendingAction)              │
 │               │◀─reply + pending────│                  │                │
 │◀──show action │  action             │                  │                │
 │   for approval│                     │                  │                │
 │               │                     │                  │                │
 │──approve─────▶│                     │                  │                │
 │               │──POST /api/actions/{id}/approve────────▶                │
 │               │                     │──create event────────────────────▶│
 │               │                     │◀─event created───────────────────│
 │               │◀─confirmation───────│                  │                │
 │◀──"Done!"─────│                     │                  │                │
```

### Conversation Memory Flow (LangChain)

```
POST /api/chat
     │
     ▼
┌──────────────────────────┐
│ Load/create Conversation │
│ record in SQLite         │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Instantiate               │
│ SQLiteChatMessageHistory  │
│ (sessionId = conv.id)     │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Create BufferMemory       │
│ with chatHistory instance │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Build AgentExecutor:      │
│  - ChatGoogleGenerativeAI │
│  - Calendar tools         │
│  - memory                 │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ agent.invoke({            │
│   input: user message     │
│ })                        │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ If tool call is mutating: │
│  → save PendingAction     │
│  → return for approval    │
│ Else:                     │
│  → return agent response  │
│ Memory auto-persisted     │
└──────────────────────────┘
```

## Deployment (Zero-Cost)

| Component       | Host                                      |
|-----------------|-------------------------------------------|
| Frontend        | Vercel                                    |
| Backend API     | Railway free tier                          |
| Database        | SQLite file on disk (or Turso free tier)   |
| LLM             | Google Gemini free tier API                |
| OAuth           | Google Cloud (no cost for OAuth alone)     |
