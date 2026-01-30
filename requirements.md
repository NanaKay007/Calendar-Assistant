# Calendar Assistant

## Functional Requirements
A user should be able to:
* authenticate with a GSuite account
* view high-level details of all calendars they have access to
* click into a specific calendar and view displayed information (like events etc) in a reasonable way
* chat with an agent capable of performing calendar related tasks.
* approve/disapprove LLM actions before they execute via the UI (Human In The Loop)

## Non Functional Requirements
The system should:
* have memory and keep track of multi-turn conversation context
* should cost $0 to deploy to production. supporting infrastructure should be free. (Note: the Gemini free tier satisfies this; the optional Claude provider incurs API costs.)