import { GeminiAgent } from './main/agent.js';
import { getConfig, getWebsocketUrl, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';

import { GoogleSearchTool } from './tools/google-search.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';

import { setupEventListeners } from './dom/events.js';
import elements from './dom/elements.js';

const url = getWebsocketUrl();
const config = getConfig();
const deepgramApiKey = getDeepgramApiKey();

const toolManager = new ToolManager();
toolManager.registerTool('googleSearch', new GoogleSearchTool());

const chatManager = new ChatManager();

const geminiAgent = new GeminiAgent({
    url,
    config,
    deepgramApiKey,
    modelSampleRate: MODEL_SAMPLE_RATE,
    toolManager
});

// Handle chat-related events
geminiAgent.on('transcription', (transcript) => {
    chatManager.updateStreamingMessage(transcript);
});

geminiAgent.on('text_sent', (text) => {
    chatManager.finalizeStreamingMessage();
    chatManager.addUserMessage(text);
});

geminiAgent.on('interrupted', () => {
    chatManager.finalizeStreamingMessage();
    if (!chatManager.lastUserMessageType) {
        chatManager.addUserAudioMessage();
    }
});

geminiAgent.on('turn_complete', () => {
    chatManager.finalizeStreamingMessage();
});

geminiAgent.on('text', (text) => {
    console.log('text', text);
    chatManager.updateStreamingMessage(text);
});

// Handle camera preview events
geminiAgent.on('camera_preview_ready', (previewContainer) => {
    chatManager.addUserMessage('', previewContainer);
});

// Initialize audio visualization preferences
let currentVisualizationStyle = localStorage.getItem('visualizationStyle') || 'waveform';
if (elements.visualizerContainer) {
    elements.visualizerContainer.dataset.style = currentVisualizationStyle;
}

// Add visualization style change handler
geminiAgent.on('recording_started', () => {
    if (geminiAgent.recorder && elements.visualizerCanvas) {
        geminiAgent.recorder.initVisualizer(elements.visualizerCanvas, {
            style: currentVisualizationStyle,
            foregroundColor: getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-color').trim()
        });
        elements.visualizerContainer?.classList.add('active');
    }
});

geminiAgent.on('recording_stopped', () => {
    elements.visualizerContainer?.classList.remove('active');
});

async function initializeApp() {
    try {
        // Setup all event listeners
        setupEventListeners(geminiAgent);

        // Initialize connection
        await geminiAgent.connect();
        console.log('Gemini Agent connected successfully.');

        // Optionally, trigger initial interaction or UI update here
        // geminiAgent.initialize(); // Assuming initialize handles the first interaction

    } catch (error) {
        console.error('Failed to initialize the application:', error);
        // Display an error message to the user in the UI
        chatManager.addErrorMessage('Failed to connect. Please check your API key and network connection, then refresh the page.');
        // Optionally disable UI elements
        elements.connectBtn.style.display = 'block';
        elements.disconnectBtn.style.display = 'none';
        // Disable control buttons etc.
    }
}

// Start the application
initializeApp();
