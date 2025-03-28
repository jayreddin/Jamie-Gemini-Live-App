import { GeminiAgent } from '../../js/main/agent.js';
import { getConfig, getWebsocketUrl, getDeepgramApiKey, MODEL_SAMPLE_RATE } from '../../js/config/config.js';
import { ChatManager } from '../../js/chat/chat-manager.js';
import { ToolManager } from '../../js/tools/tool-manager.js';

class MobileApp {
    constructor() {
        this.platform = this.detectPlatform();
        this.initializePlatform();
    }

    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
            return 'ios';
        }
        return 'android';
    }

    initializePlatform() {
        // Redirect to platform-specific page if needed
        if (window.location.pathname.endsWith('index.html')) {
            const targetPage = this.platform === 'ios' ? 'mobile/apple.html' : 'mobile/android.html';
            window.location.replace(targetPage);
            return;
        }

        // Set up platform-specific handlers
        this.setupPlatformHandlers();
        this.initializeApp();
    }

    setupPlatformHandlers() {
        if (this.platform === 'ios') {
            // iOS-specific event handlers
            document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
            document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
            
            // Handle iOS keyboard
            const controls = document.querySelector('.mobile-controls');
        } else {
            // Android-specific event handlers
            document.addEventListener('touchstart', this.handleAndroidTouch.bind(this), { passive: true });
        }

        // Common mobile handlers
        this.setupCommonHandlers();
    }

    setupCommonHandlers() {
        // Prevent double-tap zoom
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            const target = e.target;
            if (target.classList.contains('icon-btn')) {
                target.click();
            }
        }, { passive: false });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
        });

        // Prevent overscroll
        document.body.addEventListener('touchmove', (e) => {
            if (e.target.closest('.chat-history')) return;
            e.preventDefault();
        }, { passive: false });
    }

    handleAndroidTouch(e) {
        const target = e.target;
        if (target.classList.contains('icon-btn')) {
            target.style.transform = 'scale(0.95)';
            const cleanup = () => {
                target.style.transform = '';
                document.removeEventListener('touchend', cleanup);
                document.removeEventListener('touchcancel', cleanup);
            };
            document.addEventListener('touchend', cleanup);
            document.addEventListener('touchcancel', cleanup);
        }
    }

    async initializeApp() {
        const url = getWebsocketUrl();
        const config = getConfig();
        const deepgramApiKey = getDeepgramApiKey();

        const toolManager = new ToolManager();
        const chatManager = new ChatManager();

        this.agent = new GeminiAgent({
            url,
            config,
            deepgramApiKey,
            modelSampleRate: MODEL_SAMPLE_RATE,
            toolManager,
            platform: this.platform
        });

        // Initialize event listeners
        this.setupEventListeners(chatManager);

        // Connect to server
        await this.agent.connect();
    }

    setupEventListeners(chatManager) {
        // Chat events
        this.agent.on('transcription', (transcript) => {
            chatManager.updateStreamingMessage(transcript);
        });

        this.agent.on('text_sent', (text) => {
            chatManager.finalizeStreamingMessage();
            chatManager.addUserMessage(text);
        });

        this.agent.on('text', (text) => {
            chatManager.updateStreamingMessage(text);
        });

        // UI Controls
        const elements = {
            micBtn: document.getElementById('micBtnControl'),
            cameraBtn: document.getElementById('cameraBtnControl'),
            screenBtn: document.getElementById('screenBtnControl'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn')
        };

        // Initialize controls
        this.initializeControls(elements, chatManager);
    }

    initializeControls(elements, chatManager) {
        // Microphone
        elements.micBtn?.addEventListener('click', async () => {
            try {
                if (!elements.micBtn.classList.contains('active')) {
                    await this.agent.startRecording();
                    elements.micBtn.classList.add('active');
                } else {
                    await this.agent.stopRecording();
                    elements.micBtn.classList.remove('active');
                }
            } catch (error) {
                console.error('Microphone error:', error);
                elements.micBtn.classList.remove('active');
            }
        });

        // Camera
        elements.cameraBtn?.addEventListener('click', async () => {
            try {
                if (!elements.cameraBtn.classList.contains('active')) {
                    await this.agent.startCameraCapture(true);
                    elements.cameraBtn.classList.add('active');
                } else {
                    await this.agent.stopCameraCapture();
                    elements.cameraBtn.classList.remove('active');
                }
            } catch (error) {
                console.error('Camera error:', error);
                elements.cameraBtn.classList.remove('active');
            }
        });

        // Screen sharing
        if (this.platform === 'ios') {
            elements.screenBtn.style.display = 'none';
        } else {
            elements.screenBtn?.addEventListener('click', async () => {
                try {
                    if (!elements.screenBtn.classList.contains('active')) {
                        await this.agent.startScreenShare();
                        elements.screenBtn.classList.add('active');
                    } else {
                        await this.agent.stopScreenShare();
                        elements.screenBtn.classList.remove('active');
                    }
                } catch (error) {
                    console.error('Screen share error:', error);
                    elements.screenBtn.classList.remove('active');
                }
            });
        }

        // Text input
        const sendMessage = async () => {
            const text = elements.messageInput.value.trim();
            if (text) {
                await this.agent.sendText(text);
                elements.messageInput.value = '';
            }
        };

        elements.sendBtn?.addEventListener('click', sendMessage);
        elements.messageInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await sendMessage();
            }
        });
    }
}

// Initialize mobile app
window.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileApp();
});