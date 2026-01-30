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
- [ ] Set up SQLite database (schema for User, Conversation, Message, PendingAction tables)
- [ ] Implement conversation storage and retrieval

### LangChain Agent / Chat Service
- [ ] Integrate LangChain.js with ChatGoogleGenerativeAI (Gemini free tier)
- [ ] Implement custom LangChain tools: `CreateEventTool`, `UpdateEventTool`, `DeleteEventTool`, `ListEventsTool`, `ListCalendarsTool`
- [ ] Implement SQLite-backed `ChatMessageHistory` for BufferMemory
- [ ] Build AgentExecutor with tool-calling agent and memory

### Chat & HITL Backend Endpoints
- [ ] `POST /api/chat` — send message, return assistant reply
- [ ] `GET /api/conversations` — list user conversations
- [ ] `GET /api/conversations/{id}/messages` — get conversation message history
- [ ] `GET /api/actions/pending` — list pending actions
- [ ] `POST /api/actions/{id}/approve` — approve and execute pending action
- [ ] `POST /api/actions/{id}/reject` — reject pending action
- [ ] Intercept mutating tool calls to create PendingAction instead of executing immediately

### Frontend–Backend Integration
- [ ] Connect frontend chat UI to real `POST /api/chat` endpoint (replace mock service)
- [ ] Wire approval modal to real approve/reject endpoints
- [ ] Connect frontend auth to real backend OAuth flow
- [ ] Connect calendar views to real backend calendar endpoints

### Testing
- [ ] Unit tests for LangChain agent and tools
- [ ] Unit tests for chat/conversation endpoints
- [ ] Unit tests for HITL action approval/rejection flow
- [ ] End-to-end tests for chat → agent → approval → execution flow

### Deployment
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway free tier
- [ ] Configure production environment variables (Google OAuth credentials, Gemini API key)
- [ ] Set up SQLite persistence (or Turso free tier) for production
