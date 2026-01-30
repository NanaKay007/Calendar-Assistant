# Dev Tasks — Calendar Assistant

## Completed

- [x] **Project setup** — repo init, CI/CD with Claude Code Review workflow (PR #1, #3)
- [x] **System design document** — architecture, data models, API specs, flow diagrams (PR #2)
- [x] **Frontend — Auth UI** — login component with Google OAuth flow (PR #4)
- [x] **Frontend — Calendar list view** — grid layout displaying all user calendars (PR #4)
- [x] **Frontend — Calendar detail view** — Google Calendar-like interface with month/week toggle, event popovers, navigation, current time indicator (PR #4)
- [x] **Frontend — Chat interface UI** — message bubbles, input field, loading indicator, timestamps (PR #4)
- [x] **Frontend — Approval modal component** — displays pending action details for HITL approval (PR #4)
- [x] **Frontend — Layout & navigation** — Calendars and Assistant tabs (PR #4)
- [x] **Backend — Auth service & routes** — Google OAuth 2.0 (authorization URL, token exchange, refresh, revocation), session management, auth middleware (PR #5)
- [x] **Backend — Calendar service & routes** — Google Calendar API proxy (list calendars, get calendar, list/get/create/update/delete events) (PR #5)
- [x] **Backend — Integration tests** — Auth API and Calendar API tests with Jest (PR #6)

## TODO

### Database & Persistence
- [x] Set up database (MongoDB — schema for User, Conversation, Message, PendingAction tables) (PR #7, #8)
- [x] Implement conversation storage and retrieval (PR #7)

### LangChain Agent / Chat Service
- [x] Integrate LangChain.js with ChatGoogleGenerativeAI (Gemini free tier) (PR #8)
- [x] Implement custom LangChain tools: `CreateEventTool`, `UpdateEventTool`, `DeleteEventTool`, `ListEventsTool`, `ListCalendarsTool` (PR #8)
- [x] Implement database-backed `MongoChatMessageHistory` for conversation persistence (PR #12)
- [x] Build ReAct agent with tool-calling via LangGraph `createReactAgent` (PR #8, #12)

### Chat & HITL Backend Endpoints
- [x] `WebSocket /ws` — real-time chat via WebSocket (replaced `POST /api/chat`) (PR #11)
- [x] `GET /api/conversations` — list user conversations (PR #8)
- [x] `GET /api/conversations/{id}/messages` — get conversation message history (PR #8)
- [x] `GET /api/actions/pending` — list pending actions (PR #8)
- [x] `POST /api/actions/{id}/approve` — approve and execute pending action (PR #8)
- [x] `POST /api/actions/{id}/reject` — reject pending action (PR #8)
- [x] Intercept mutating tool calls to create PendingAction instead of executing immediately (PR #8)

### Frontend–Backend Integration
- [ ] Connect frontend chat UI to WebSocket `/ws` endpoint (replace mock service)
- [ ] Wire approval modal to real approve/reject endpoints
- [ ] Connect frontend auth to real backend OAuth flow
- [ ] Connect calendar views to real backend calendar endpoints

### Testing
- [ ] Unit tests for LangChain agent and tools
- [x] Unit tests for WebSocket chat + REST conversation/action endpoints (PR #11)
- [x] Unit tests for HITL action approval/rejection flow (PR #8)
- [ ] End-to-end tests for chat → agent → approval → execution flow
- [ ] **Fix integration test timeouts** — WebSocket integration tests (`chat.integration.test.ts`) time out due to Gemini API throttling; revisit when rate limits are resolved

### Deployment
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway free tier
- [ ] Configure production environment variables (Google OAuth credentials, Gemini API key)
- [ ] Set up SQLite persistence (or Turso free tier) for production
