# Calendar Assistant - Frontend

A modern React TypeScript frontend application for the Calendar Assistant project, providing an intuitive interface for managing calendars with AI-powered assistance.

## Overview

This application provides a user-friendly interface to:
- Authenticate with Google Suite (currently mocked)
- View and manage multiple calendars
- Browse calendar events with detailed information
- Interact with an AI calendar assistant via chat
- Review and approve AI-suggested calendar actions (Human-in-the-Loop)

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS 3
- **Package Manager**: pnpm

## Project Structure

```
app/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── Login.tsx              # Authentication component
│   │   ├── Calendar/
│   │   │   ├── CalendarList.tsx       # Calendar overview page
│   │   │   └── CalendarDetail.tsx     # Individual calendar view
│   │   ├── Chat/
│   │   │   └── ChatInterface.tsx      # AI assistant chat UI
│   │   ├── Approval/
│   │   │   └── ApprovalModal.tsx      # Human-in-the-Loop approval modal
│   │   └── Layout/
│   │       └── Layout.tsx             # Main application layout
│   ├── services/
│   │   ├── authService.ts             # Mock authentication service
│   │   ├── calendarService.ts         # Mock calendar data service
│   │   └── chatService.ts             # Mock chat/AI assistant service
│   ├── types/
│   │   └── index.ts                   # TypeScript type definitions
│   ├── App.tsx                        # Main application component
│   ├── main.tsx                       # Application entry point
│   └── index.css                      # Global styles
├── public/                            # Static assets
├── dist/                              # Production build output
└── package.json                       # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (recommended)
- pnpm (installed automatically via npx)

### Installation

1. Navigate to the app directory:
   ```bash
   cd frontend/app
   ```

2. Install dependencies:
   ```bash
   npx -y pnpm@latest install
   ```

### Development

Run the development server:
```bash
npx -y pnpm@latest run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Create a production build:
```bash
npx -y pnpm@latest run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npx -y pnpm@latest run preview
```

## Features

### 1. Authentication
- Mock Google Suite authentication
- Session persistence using localStorage
- Protected routes requiring authentication

### 2. Calendar Management
- **Calendar List View**: Displays all accessible calendars with:
  - Calendar name, description, and timezone
  - Color-coded calendar identification
  - Access role badges (owner/writer/reader)
  - Primary calendar indicator

- **Calendar Detail View**: Shows individual calendar with events including:
  - Event title, description, and status
  - Start/end times with duration calculation
  - Location and attendee information
  - Organized chronologically

### 3. AI Assistant Chat
- Natural language conversation interface
- Persistent message history
- Real-time typing indicators
- Context-aware responses for:
  - Scheduling meetings
  - Viewing calendar information
  - Updating events
  - Deleting/canceling events

### 4. Human-in-the-Loop Approval
- Review AI-suggested actions before execution
- Detailed action information display
- Approve or reject proposed changes
- Action types supported:
  - Create event
  - Update event
  - Delete event
  - Add/remove attendees

## Mock Services

The application currently uses mock services to simulate backend functionality. These will be replaced with actual API integrations:

### Authentication Service
- Simulates Google OAuth flow
- Returns mock user data
- Manages session state

### Calendar Service
- Provides mock calendar data (3 sample calendars)
- Mock events with realistic data
- Simulates API delays for realistic UX

### Chat Service
- Keyword-based response generation
- Simulates AI processing delays
- Generates pending actions based on user input
- Tracks conversation context

## Type Definitions

All TypeScript interfaces are defined in `src/types/index.ts`:

- `User`: User account information
- `Calendar`: Calendar metadata
- `CalendarEvent`: Event details
- `ChatMessage`: Chat conversation messages
- `PendingAction`: Actions awaiting approval
- `ConversationContext`: Chat session state

## Responsive Design

The application is fully responsive and works across:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## Future Integration

This frontend is designed to integrate with a backend service. The mock services (`authService`, `calendarService`, `chatService`) have interfaces that can be easily replaced with actual API calls once the backend is ready.

### Integration Points:

1. **Authentication**: Replace mock OAuth with Google OAuth 2.0
2. **Calendar Data**: Connect to Google Calendar API or backend proxy
3. **AI Assistant**: Integrate with LLM-powered calendar agent
4. **Action Execution**: Implement real calendar modifications via API

## Development Notes

### Code Style
- TypeScript strict mode enabled
- Type-only imports for better tree-shaking
- Functional components with hooks
- Tailwind CSS for styling

### State Management
- React hooks for local state
- localStorage for session persistence
- Service layer for data operations

### Performance Considerations
- Lazy loading for routes (can be implemented)
- Optimized re-renders with proper dependencies
- Production build includes code splitting

## Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Create production build
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

## License

This project is part of the Calendar Assistant system.

## Contributing

This frontend was built based on the requirements specified in `requirements.md`. When the backend is ready, update the service layer to connect to real endpoints while maintaining the same interface contracts.
