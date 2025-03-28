/**
 * Core application class that orchestrates the interaction between various components
 * of the Gemini 2 Live API. Manages audio streaming, WebSocket communication, audio transcription,
 * and coordinates the overall application functionality.
 */
import { GeminiWebsocketClient } from '../ws/client.js';
import {
    CAPTURE_FPS,
    CAPTURE_RESIZE_WIDTH,
    CAPTURE_QUALITY,
    CAMERA_FACING_MODE,
    DEEPGRAM_KEEP_ALIVE_INTERVAL,
    DEEPGRAM_KEEPALIVE_MESSAGE
} from '../config/config.js';

import { AudioRecorder } from '../audio/recorder.js';
import { AudioStreamer } from '../audio/streamer.js';
import { AudioVisualizer } from '../audio/visualizer.js';

import { DeepgramTranscriber } from '../transcribe/deepgram.js';

import { CameraManager } from '../camera/camera.js';
import { ScreenManager } from '../screen/screen.js';

export class GeminiAgent{
    constructor({
        name = 'GeminiAgent',
        url,
        config,
        deepgramApiKey = null,
        transcribeModelsSpeech = true,
        transcribeUsersSpeech = false,
        modelSampleRate = 24000,
        toolManager = null
    } = {}) {
        if (!url) throw new Error('WebSocket URL is required');
        if (!config) throw new Error('Config is required');

        this.initialized = false;
        this.connected = false;

        // For audio components
        this.audioContext = null;
        this.audioRecorder = null;
        this.audioStreamer = null;
        
        // For transcribers
        this.transcribeModelsSpeech = transcribeModelsSpeech;
        this.transcribeUsersSpeech = transcribeUsersSpeech;
        this.deepgramApiKey = deepgramApiKey;
        this.modelSampleRate = modelSampleRate;

        // Initialize screen & camera settings using imported constants
        this.captureInterval = 1000 / CAPTURE_FPS;

        // Initialize camera
        this.cameraManager = new CameraManager({
            width: CAPTURE_RESIZE_WIDTH,
            quality: CAPTURE_QUALITY,
            facingMode: CAMERA_FACING_MODE
        });
        this.cameraInterval = null;

        // Initialize screen sharing
        this.screenManager = new ScreenManager({
            width: CAPTURE_RESIZE_WIDTH,
            quality: CAPTURE_QUALITY,
            onStop: () => {
                // Clean up interval and emit event when screen sharing stops
                if (this.screenInterval) {
                    clearInterval(this.screenInterval);
                    this.screenInterval = null;
                }
                // Emit screen share stopped event
                this.emit('screenshare_stopped');
            }
        });
        this.screenInterval = null;
        
        // Add function declarations to config
        this.toolManager = toolManager;
        config.tools.functionDeclarations = toolManager.getToolDeclarations() || [];
        this.config = config;

        this.name = name;
        this.url = url;
        this.client = null;
    }

    setupEventListeners() {
        // Handle incoming text from the model
        this.client.on('text', (text) => {
            this.emit('text', text);
        });

        // Handle incoming audio data from the model
        this.client.on('audio', async (data) => {
            try {
                if (!this.audioStreamer.isInitialized) {
                    this.audioStreamer.initialize();
                }
                this.audioStreamer.streamAudio(new Uint8Array(data));

                if (this.modelTranscriber && this.modelTranscriber.isConnected) {
                    this.modelTranscriber.sendAudio(data);
                }

            } catch (error) {
                throw new Error('Audio processing error:' + error);
            }
        });

        // Handle model interruptions by stopping audio playback
        this.client.on('interrupted', () => {
            this.audioStreamer.stop();
            this.audioStreamer.isInitialized = false;
            this.emit('interrupted');
        });

        // Add an event handler when the model finishes speaking if needed
        this.client.on('turn_complete', () => {
            console.info('Model finished speaking');
            this.emit('turn_complete');
        });

        this.client.on('tool_call', async (toolCall) => {
            await this.handleToolCall(toolCall);
        });
    }
    /**
     * Handles incoming tool calls from the model.
     * Iterates through each function call, executes it via the ToolManager,
     * and sends the response back to the model.
     * @param {object} toolCall - The tool call object received from the WebSocket.
     */
    async handleToolCall(toolCall) {
        if (!toolCall || !Array.isArray(toolCall.functionCalls) || toolCall.functionCalls.length === 0) {
            console.warn('Received tool_call event with no function calls:', toolCall);
            return;
        }

        console.info(`Handling ${toolCall.functionCalls.length} function call(s)...`);
        
        // Process each function call sequentially
        for (const functionCall of toolCall.functionCalls) {
            try {
                console.debug('Executing function call:', functionCall);
                const response = await this.toolManager.handleToolCall(functionCall);
                console.debug('Sending tool response:', response);
                await this.client.sendToolResponse(response);
            } catch (error) {
                console.error(`Error handling function call ${functionCall?.name}:`, error);
                // Optionally send an error response back to the model
                // await this.client.sendToolResponse({ toolUseId: functionCall.toolUseId, error: error.message });
            }
        }
        console.info('Finished handling function call(s).');
    }

    /**
     * Connects to the Gemini API using the GeminiWebsocketClient.connect() method.
     */
    async connect() {
        this.client = new GeminiWebsocketClient(this.name, this.url, this.config);
        await this.client.connect();
        this.setupEventListeners();
        this.connected = true;
    }

    /**
     * Sends a text message to the Gemini API.
     * @param {string} text - The text message to send.
     */
    async sendText(text) {
        await this.client.sendText(text);
        this.emit('text_sent', text);
    }

    /**
     * Starts camera capture and sends images at regular intervals
     */
    async startCameraCapture(inChat = true) {
        if (!this.connected) {
            throw new Error('Must be connected to start camera capture');
        }

        try {
            await this.cameraManager.initialize();
            
            // Create preview in the chat if requested
            if (inChat) {
                const previewContainer = this.cameraManager.createPreviewContainer();
                this.emit('camera_preview_ready', previewContainer);
            }
            
            // Show preview (will go to container if in chat, or float if not)
            this.cameraManager.showPreview(inChat ? null : document.getElementById('cameraPreview'));
            
            // Set up interval to capture and send images
            this.cameraInterval = setInterval(async () => {
                const imageBase64 = await this.cameraManager.capture();
                this.client.sendImage(imageBase64);
            }, this.captureInterval);
            
            console.info('Camera capture started');
        } catch (error) {
            await this.disconnect();
            throw new Error('Failed to start camera capture: ' + error);
        }
    }

    /**
     * Stops camera capture and cleans up resources
     */
    async stopCameraCapture() {
        if (this.cameraInterval) {
            clearInterval(this.cameraInterval);
            this.cameraInterval = null;
        }
        
        if (this.cameraManager) {
            this.cameraManager.dispose();
        }
        
        console.info('Camera capture stopped');
    }

    /**
     * Starts screen sharing and sends screenshots at regular intervals
     */
    async startScreenShare() {
        if (!this.connected) {
            throw new Error('Websocket must be connected to start screen sharing');
        }

        try {
            await this.screenManager.initialize();
            
            // Set up interval to capture and send screenshots
            this.screenInterval = setInterval(async () => {
                const imageBase64 = await this.screenManager.capture();
                this.client.sendImage(imageBase64);
            }, this.captureInterval);
            
            console.info('Screen sharing started');
        } catch (error) {
            await this.stopScreenShare();
            throw new Error('Failed to start screen sharing: ' + error);
        }
    }

    /**
     * Stops screen sharing and cleans up resources
     */
    async stopScreenShare() {
        if (this.screenInterval) {
            clearInterval(this.screenInterval);
            this.screenInterval = null;
        }
        
        if (this.screenManager) {
            this.screenManager.dispose();
        }
        
        console.info('Screen sharing stopped');
    }

    /**
     * Gracefully terminates all active connections and streams.
     * Ensures proper cleanup of audio, screen sharing, and WebSocket resources.
     */
    async disconnect() {
        console.info('Disconnecting and cleaning up resources...');
        try {
            // Stop camera capture first
            await this.stopCameraCapture(); // stopCameraCapture already handles checks

            // Stop screen sharing
            await this.stopScreenShare(); // stopScreenShare already handles checks

            // Cleanup audio resources in correct order, checking for existence
            if (this.audioRecorder) {
                this.audioRecorder.stop();
                this.audioRecorder = null;
                console.info('Audio recorder stopped.');
            }

            if (this.visualizer) {
                this.visualizer.cleanup();
                this.visualizer = null;
                console.info('Visualizer cleaned up.');
            }

            if (this.audioStreamer) {
                this.audioStreamer.stop();
                this.audioStreamer = null;
                console.info('Audio streamer stopped.');
            }

            // Cleanup model's speech transcriber
            if (this.modelsKeepAliveInterval) {
                clearInterval(this.modelsKeepAliveInterval);
                this.modelsKeepAliveInterval = null;
                console.info('Model transcriber keep-alive interval cleared.');
            }
            if (this.modelTranscriber) {
                this.modelTranscriber.disconnect();
                this.modelTranscriber = null;
                console.info('Model transcriber disconnected.');
            }

            // Cleanup user's speech transcriber
            if (this.userKeepAliveInterval) {
                clearInterval(this.userKeepAliveInterval);
                this.userKeepAliveInterval = null;
                console.info('User transcriber keep-alive interval cleared.');
            }
            if (this.userTranscriber) {
                this.userTranscriber.disconnect();
                this.userTranscriber = null;
                console.info('User transcriber disconnected.');
            }

            // Finally close audio context
            if (this.audioContext && this.audioContext.state !== 'closed') {
                await this.audioContext.close();
                this.audioContext = null;
                console.info('Audio context closed.');
            }

            // Cleanup WebSocket
            if (this.client) {
                this.client.disconnect();
                this.client = null;
                console.info('WebSocket client disconnected.');
            }
            
            this.initialized = false;
            this.connected = false;
            
            console.info('Finished disconnecting and cleaning up all resources.');
        } catch (error) {
            console.error('Disconnect error:', error);
            // Don't re-throw, just log the error during cleanup
        }
    }

    /**
     * Initializes the model's speech transcriber with Deepgram
     */
    async initializeModelSpeechTranscriber() {
        if (!this.modelTranscriber) {
            console.warn('Either no Deepgram API key provided or model speech transcription disabled');
            return;
        }

        console.info('Initializing Deepgram model speech transcriber...');

        // Promise to send keep-alive every 10 seconds once connected
        const connectionPromise = new Promise((resolve) => {
            this.modelTranscriber.on('connected', () => {
                console.info('Model speech transcriber connection established, setting up keep-alive...');
                this.modelsKeepAliveInterval = setInterval(() => {
                    if (this.modelTranscriber && this.modelTranscriber.isConnected) {
                        this.modelTranscriber.ws.send(DEEPGRAM_KEEPALIVE_MESSAGE);
                        // console.info('Sent keep-alive message to model speech transcriber'); // Reduce log noise
                    }
                }, DEEPGRAM_KEEP_ALIVE_INTERVAL);
                resolve();
            });
        });

        // Just log transcription to console for now
        this.modelTranscriber.on('transcription', (transcript) => {
            this.emit('transcription', transcript);
            console.debug('Model speech transcription:', transcript);
        });

        // Connect to Deepgram and execute promise
        await this.modelTranscriber.connect();
        await connectionPromise;
    }

    /**
     * Initializes the user's speech transcriber with Deepgram
     */
    async initializeUserSpeechTranscriber() {
        if (!this.userTranscriber) {
            console.warn('Either no Deepgram API key provided or user speech transcription disabled');
            return;
        }

        console.info('Initializing Deepgram user speech transcriber...');

        // Promise to send keep-alive every 10 seconds once connected
        const connectionPromise = new Promise((resolve) => {
            this.userTranscriber.on('connected', () => {
                console.info('User speech transcriber connection established, setting up keep-alive...');
                this.userKeepAliveInterval = setInterval(() => {
                    if (this.userTranscriber && this.userTranscriber.isConnected) {
                        this.userTranscriber.ws.send(DEEPGRAM_KEEPALIVE_MESSAGE);
                        // console.info('Sent keep-alive message to user transcriber'); // Reduce log noise
                    }
                }, DEEPGRAM_KEEP_ALIVE_INTERVAL);
                resolve();
            });
        });

        // Handle user transcription events
        this.userTranscriber.on('transcription', (transcript) => {
            this.emit('user_transcription', transcript);
            console.debug('User speech transcription:', transcript);
        });

        // Connect to Deepgram and execute promise
        await this.userTranscriber.connect();
        await connectionPromise;
    }

    /**
     * Initiates audio recording from the microphone.
     * Streams audio data to the model in real-time, handling interruptions
     */
    async initialize() {
        try {            
            // Initialize audio components
            this.audioContext = new AudioContext();
            this.audioStreamer = new AudioStreamer(this.audioContext);
            this.audioStreamer.initialize();
            this.visualizer = new AudioVisualizer(this.audioContext, 'visualizer');
            this.audioStreamer.gainNode.connect(this.visualizer.analyser);
            this.visualizer.start();
            this.audioRecorder = new AudioRecorder();
            
            // Initialize transcriber if API key is provided
            if (this.deepgramApiKey) {
                if (this.transcribeModelsSpeech) {
                    this.modelTranscriber = new DeepgramTranscriber(this.deepgramApiKey, this.modelSampleRate);
                    await this.initializeModelSpeechTranscriber();
                }
                if (this.transcribeUsersSpeech) {
                    this.userTranscriber = new DeepgramTranscriber(this.deepgramApiKey, 16000);
                    await this.initializeUserSpeechTranscriber();
                }
            } else {
                console.warn('No Deepgram API key provided, transcription disabled');
            }
            
            this.initialized = true;
            console.info(`${this.client.name} initialized successfully`);
            this.client.sendText('.');  // Trigger the model to start speaking first
        } catch (error) {
            console.error('Initialization failed:', error); // Log the original error
            // Optionally re-throw the original error if initialization failure should halt execution
            // throw error; 
            // Or throw a more specific error wrapping the original if needed
            throw new Error(`Initialization failed: ${error.message}`); 
        }
    }

    async startRecording() {
        // Start recording with callback to send audio data to websocket and transcriber
        await this.audioRecorder.start(async (audioData) => {
            try {
                this.client.sendAudio(audioData);
                if (this.userTranscriber && this.userTranscriber.isConnected) {
                    this.userTranscriber.sendAudio(new Uint8Array(audioData));
                }
            } catch (error) {
                console.error('Error sending audio data:', error);
                this.audioRecorder.stop();
            }
        });
    }

    /**
     * Toggles the microphone state between active and suspended
     */
    async toggleMic() {
        if (!this.audioRecorder.stream) {
            await this.startRecording();
            return;
        }
        await this.audioRecorder.toggleMic();
    }           

    // Add event emitter functionality
    on(eventName, callback) {
        if (!this._eventListeners) {
            this._eventListeners = new Map();
        }
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, []);
        }
        this._eventListeners.get(eventName).push(callback);
    }

    emit(eventName, data) {
        if (!this._eventListeners || !this._eventListeners.has(eventName)) {
            return;
        }
        for (const callback of this._eventListeners.get(eventName)) {
            callback(data);
        }
    }
}
