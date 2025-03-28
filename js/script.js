import { GeminiAgent } from './main/agent.js';
import { getConfig, getWebsocketUrl, getDeepgramApiKey, MODEL_SAMPLE_RATE } from './config/config.js';

import { GoogleSearchTool } from './tools/google-search.js';
import { ToolManager } from './tools/tool-manager.js';
import { ChatManager } from './chat/chat-manager.js';

import { setupEventListeners } from './dom/events.js';

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

// Initialize audio visualization
const visualizerContainer = document.getElementById('visualizerContainer');
const visualizerCanvas = document.getElementById('visualizer');

// Store visualization style preference
let currentVisualizationStyle = localStorage.getItem('visualizationStyle') || 'waveform';
visualizerContainer.dataset.style = currentVisualizationStyle;

// Handle microphone button
const micBtn = document.querySelector('.mic-btn');
if (micBtn) {
    let isFirstActivation = true;

    micBtn.addEventListener('click', async () => {
        if (!micBtn.classList.contains('active')) {
            try {
                await geminiAgent.startRecording();
                micBtn.classList.add('active');
                
                // Initialize visualizer on first activation
                if (isFirstActivation) {
                    geminiAgent.recorder.initVisualizer(visualizerCanvas, {
                        style: currentVisualizationStyle,
                        foregroundColor: getComputedStyle(document.documentElement)
                            .getPropertyValue('--accent-color').trim()
                    });
                    isFirstActivation = false;
                }
                
                visualizerContainer.classList.add('active');
            } catch (error) {
                console.error('Failed to start recording:', error);
            }
        } else {
            await geminiAgent.stopRecording();
            micBtn.classList.remove('active');
            visualizerContainer.classList.remove('active');
        }
    });

    // Double click to cycle visualization styles
    micBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        
        const styles = ['waveform', 'bars', 'circle'];
        const currentIndex = styles.indexOf(currentVisualizationStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        
        currentVisualizationStyle = nextStyle;
        localStorage.setItem('visualizationStyle', nextStyle);
        visualizerContainer.dataset.style = nextStyle;
        
        if (geminiAgent.recorder?.visualizer) {
            geminiAgent.recorder.visualizer.setStyle(nextStyle);
        }
    });
}

// Handle camera toggle
const cameraBtn = document.querySelector('.camera-btn');
let cameraInChat = true; // Default to inline preview mode

if (cameraBtn) {
    cameraBtn.addEventListener('click', async () => {
        if (!cameraBtn.classList.contains('active')) {
            try {
                await geminiAgent.startCameraCapture(cameraInChat);
                cameraBtn.classList.add('active');
            } catch (error) {
                console.error('Failed to start camera:', error);
            }
        } else {
            await geminiAgent.stopCameraCapture();
            cameraBtn.classList.remove('active');
        }
    });

    // Double click to toggle between floating and inline preview
    cameraBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        cameraInChat = !cameraInChat;
        
        // If camera is active, restart it in new mode
        if (cameraBtn.classList.contains('active')) {
            geminiAgent.stopCameraCapture();
            geminiAgent.startCameraCapture(cameraInChat);
        }
        
        // Update button appearance to indicate mode
        cameraBtn.setAttribute('title', cameraInChat ? 'Camera (Inline Mode)' : 'Camera (Float Mode)');
        cameraBtn.style.opacity = cameraInChat ? '1' : '0.7';
    });
}

geminiAgent.connect();

setupEventListeners(geminiAgent);