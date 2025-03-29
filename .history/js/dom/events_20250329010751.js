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

    // Camera toggle handler
    elements.cameraBtn.addEventListener('click', async () => {
        const isActive = elements.cameraBtn.classList.contains('active');
        try {
            await ensureAgentReady(agent);
            if (!isActive) {
                // Start camera and show preview
                await agent.startCameraCapture(true); // Always show preview now
                elements.cameraBtn.classList.add('active');
                // CameraManager's showPreview will handle showing the container
            } else {
                // Stop camera and hide preview
                await agent.stopCameraCapture();
                elements.cameraBtn.classList.remove('active');
                // CameraManager's dispose should hide the container
            }
        } catch (error) {
            console.error('Error toggling camera:', error);
            elements.cameraBtn.classList.remove('active');
            if (agent.cameraManager) agent.cameraManager.hidePreview(); // Ensure preview is hidden on error
        }
    });

    // Screen sharing handler
    agent.on('screenshare_stopped', () => {
        elements.screenBtn.classList.remove('active');
        if (agent.screenManager) agent.screenManager.hidePreview(); // Hide preview on stop
        console.info('Screen share stopped');
    });

    elements.screenBtn.addEventListener('click', async () => {
        const isActive = elements.screenBtn.classList.contains('active');
        try {
            await ensureAgentReady(agent);
            if (!isActive) {
                await agent.startScreenShare();
                elements.screenBtn.classList.add('active');
                if (agent.screenManager) agent.screenManager.showPreview(); // Show preview on start
            } else {
                await agent.stopScreenShare(); // This will trigger the 'screenshare_stopped' event
                elements.screenBtn.classList.remove('active'); // Ensure removal if stop fails silently
            }
        } catch (error) {
            console.error('Error toggling screen share:', error);
            elements.screenBtn.classList.remove('active');
            if (agent.screenManager) agent.screenManager.hidePreview(); // Ensure preview is hidden on error
        }
    });

    // Visualization style cycling
    let currentVisualizationStyle = localStorage.getItem('visualizationStyle') || 'waveform'; // Keep track of the style
    elements.micBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        
        const styles = ['waveform', 'bars', 'circle'];
        const currentIndex = styles.indexOf(currentVisualizationStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        
        // Update the style
        currentVisualizationStyle = nextStyle; 
        localStorage.setItem('visualizationStyle', nextStyle); // Save preference
        
        // Update UI immediately
        if (elements.visualizerContainer) {
            elements.visualizerContainer.dataset.style = nextStyle;
        }
        
        // Update active visualizer if it exists
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
