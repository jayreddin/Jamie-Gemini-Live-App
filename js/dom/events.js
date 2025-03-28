import elements from './elements.js';
import settingsManager from '../settings/settings-manager.js';

/**
 * Updates UI to show disconnect button and hide connect button
 */
const showDisconnectButton = () => {
    elements.connectBtn.style.display = 'none';
    elements.disconnectBtn.style.display = 'block';
};

/**
 * Updates UI to show connect button and hide disconnect button
 */
const showConnectButton = () => {
    elements.disconnectBtn.style.display = 'none';
    elements.connectBtn.style.display = 'block';
};

let isCameraActive = false;

/**
 * Ensures the agent is connected and initialized
 * @param {GeminiAgent} agent - The main application agent instance
 * @returns {Promise<void>}
 */
const ensureAgentReady = async (agent) => {
    if (!agent.connected) {
        await agent.connect();
        showDisconnectButton();
    }
    if (!agent.initialized) {
        await agent.initialize();
    }
};

/**
 * Sets up event listeners for the application's UI elements
 * @param {GeminiAgent} agent - The main application agent instance
 */
export function setupEventListeners(agent) {
    // Disconnect handler
    elements.disconnectBtn.addEventListener('click', async () => {
        try {
            await agent.disconnect();
            showConnectButton();
            [elements.cameraBtn, elements.screenBtn, elements.micBtn].forEach(btn => btn.classList.remove('active'));
            isCameraActive = false;
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    });

    // Connect handler
    elements.connectBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
        } catch (error) {
            console.error('Error connecting:', error);
        }
    });

    // Microphone toggle handler
    elements.micBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            await agent.toggleMic();
            elements.micBtn.classList.toggle('active');
        } catch (error) {
            console.error('Error toggling microphone:', error);
            elements.micBtn.classList.remove('active');
        }
    });

    // Get stored visualization style preference
    let currentVisualizationStyle = localStorage.getItem('visualizationStyle') || 'waveform';

    // Camera toggle handler with preview mode support
    let isCameraInChat = true;
    elements.cameraBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            
            if (!isCameraActive) {
                await agent.startCameraCapture(isCameraInChat);
                elements.cameraBtn.classList.add('active');
            } else {
                await agent.stopCameraCapture();
                elements.cameraBtn.classList.remove('active');
            }
            isCameraActive = !isCameraActive;
        } catch (error) {
            console.error('Error toggling camera:', error);
            elements.cameraBtn.classList.remove('active');
            isCameraActive = false;
        }
    });

    // Double click to toggle camera preview mode
    elements.cameraBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        isCameraInChat = !isCameraInChat;
        
        if (isCameraActive) {
            agent.stopCameraCapture();
            agent.startCameraCapture(isCameraInChat);
        }
        
        elements.cameraBtn.setAttribute('title', isCameraInChat ? 'Camera (Inline Mode)' : 'Camera (Float Mode)');
        elements.cameraBtn.style.opacity = isCameraInChat ? '1' : '0.7';
    });

    // Screen sharing handler with mobile support
    let isScreenShareActive = false;
    
    agent.on('screenshare_stopped', () => {
        elements.screenBtn.classList.remove('active');
        isScreenShareActive = false;
        console.info('Screen share stopped');
    });

    elements.screenBtn.addEventListener('click', async () => {
        try {
            await ensureAgentReady(agent);
            
            if (!isScreenShareActive) {
                await agent.startScreenShare();
                elements.screenBtn.classList.add('active');
            } else {
                await agent.stopScreenShare();
                elements.screenBtn.classList.remove('active');
            }
            isScreenShareActive = !isScreenShareActive;
        } catch (error) {
            console.error('Error toggling screen share:', error);
            elements.screenBtn.classList.remove('active');
            isScreenShareActive = false;
        }
    });

    // Visualization style cycling
    elements.micBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        
        const styles = ['waveform', 'bars', 'circle'];
        const currentIndex = styles.indexOf(currentVisualizationStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        
        currentVisualizationStyle = nextStyle;
        localStorage.setItem('visualizationStyle', nextStyle);
        elements.visualizerContainer.dataset.style = nextStyle;
        
        if (agent.recorder?.visualizer) {
            agent.recorder.visualizer.setStyle(nextStyle);
        }
    });

    // Message sending handlers
    const sendMessage = async () => {
        try {
            await ensureAgentReady(agent);
            const text = elements.messageInput.value.trim();
            await agent.sendText(text);
            elements.messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // Settings button click
    elements.settingsBtn.addEventListener('click', () => settingsManager.show());
}

// Initialize settings
settingsManager;
