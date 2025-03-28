# Real-time Communication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Browser UI
    participant A as GeminiAgent
    participant WS as WebSocket Client
    participant G as Gemini API
    participant D as Deepgram API

    Note over U,G: Audio Communication Flow
    U->>UI: Start Speaking
    UI->>A: Mic Input
    A->>A: Process Audio
    A->>WS: Send Audio Chunks
    WS->>G: Stream Audio Data
    A->>D: Stream to Transcriber
    D-->>A: Real-time Transcript
    G-->>WS: Model Audio Response
    WS-->>A: Process Audio
    A-->>UI: Play Audio & Show Transcript
    UI-->>U: Hear Response

    Note over U,G: Video/Screen Communication Flow
    U->>UI: Enable Camera/Screen
    UI->>A: Media Stream
    loop Every frame interval
        A->>A: Capture & Process Frame
        A->>WS: Send Image Data
        WS->>G: Stream Image
    end
    G-->>WS: Process Visual Context
    WS-->>A: Model Response
    A-->>UI: Display Response
    UI-->>U: See Response

    Note over U,G: Text Communication Flow
    U->>UI: Type Message
    UI->>A: Send Text
    A->>WS: Format Message
    WS->>G: Send Request
    G-->>WS: Stream Response
    WS-->>A: Process Text
    A-->>UI: Display Message
    UI-->>U: See Response

    Note over U,G: Tool Execution Flow
    G->>WS: Tool Call Request
    WS->>A: Process Tool Call
    A->>A: Execute Tool
    A->>WS: Tool Response
    WS->>G: Send Result
    G-->>WS: Continue Generation
    WS-->>A: Process Response
    A-->>UI: Update Display
    UI-->>U: See Result
```

## Real-time Communication Flows

### Audio Communication
1. User audio is captured and processed in real-time
2. Processed audio is streamed to both Gemini API and Deepgram
3. Transcripts and model responses are received and displayed simultaneously
4. Model's audio response is played back in real-time

### Visual Communication
1. Camera/Screen content is captured at configured intervals
2. Each frame is processed and sent to Gemini API
3. Model processes visual context in its responses
4. Responses are displayed in real-time

### Text Communication
1. User text input is immediately processed
2. Messages are formatted and sent to Gemini API
3. Responses are streamed back in chunks
4. Text is displayed progressively as it's received

### Tool Execution
1. Model may request tool execution during response
2. Tool calls are processed and executed locally
3. Results are sent back to continue the conversation
4. Entire process happens seamlessly in the conversation flow