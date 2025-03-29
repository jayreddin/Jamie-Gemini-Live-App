/**
 * Manages screen sharing capture and image processing with mobile support
 */
export class ScreenManager {
    /**
     * @param {Object} config
     * @param {number} config.width - Target width for resizing captured images
     * @param {number} config.quality - JPEG quality (0-1)
     * @param {Function} [config.onStop] - Callback when screen sharing stops
     */
    constructor(config) {
        this.config = {
            width: config.width || 1280,
            quality: config.quality || 0.8,
            onStop: config.onStop
        };
        
        this.stream = null;
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.aspectRatio = null;
        this.previewContainer = null;
        this.closeButton = null; // Added close button reference
        
        // Device detection
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isAndroid = /Android/.test(navigator.userAgent);
    }

    /**
     * Show the screen preview and add close button
     */
    showPreview() {
        if (!this.previewContainer) {
            // Try to find the preview container in the DOM
            const containerId = this.isIOS || this.isAndroid ? 'screenPreview' : 'screenPreview'; // Use mobile ID if needed
            this.previewContainer = document.getElementById(containerId);
            if (!this.previewContainer) {
                console.error(`Screen preview container #${containerId} not found.`);
                return;
            }
        }

        // Ensure the container is visible
        this.previewContainer.style.display = 'block';
        this.previewContainer.parentElement.style.display = 'block'; // Ensure parent is visible too

        // Add close button if not already present
        this._createCloseButton();
    }

    /**
     * Hide the screen preview and remove close button
     */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
            // Also hide the parent container if it exists
            const parentContainer = document.getElementById(this.isIOS || this.isAndroid ? 'screenPreview' : 'screenPreview');
             if (parentContainer) {
                parentContainer.style.display = 'none';
            }
        }
        this._removeCloseButton();
    }

    /**
     * Create and append the close button to the preview container
     * @private
     */
    _createCloseButton() {
        if (!this.previewContainer || this.closeButton) return;

        this.closeButton = document.createElement('button');
        this.closeButton.className = 'screen-close-btn'; // Add specific class for styling
        this.closeButton.innerHTML = '✕'; // Close icon
        this.closeButton.title = 'Stop Sharing';
        this.closeButton.addEventListener('click', () => {
            // Trigger the stop action - assuming the agent handles the actual stopping
            const screenBtn = document.getElementById('screenBtnControl');
            if (screenBtn) {
                screenBtn.click(); // Simulate clicking the main button to stop
            }
        });
        this.previewContainer.appendChild(this.closeButton);
    }

     /**
     * Remove the close button
     * @private
     */
    _removeCloseButton() {
        if (this.closeButton) {
            this.closeButton.remove();
            this.closeButton = null;
        }
    }

    /**
     * Initialize screen capture stream and canvas based on platform
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            if (this.isIOS) {
                await this.initializeIOS();
            } else if (this.isAndroid) {
                await this.initializeAndroid();
            } else {
                await this.initializeDesktop();
            }

            // Create preview container if not initialized by platform-specific methods
            if (!this.previewContainer) {
                const previewContainer = document.getElementById('screenPreview');
                if (previewContainer) {
                    this.previewContainer = previewContainer;
                    this.showPreview();
                }
            }

            this.isInitialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize screen capture: ${error.message}`);
        }
    }

    /**
     * Initialize screen capture for iOS devices
     * @private
     */
    async initializeIOS() {
        // Create canvas for screenshot
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set up ShareSheet button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'ios-share-btn';
        shareBtn.textContent = 'Share Screen';
        shareBtn.onclick = async () => {
            try {
                // Use native share API
                if (navigator.share) {
                    await navigator.share({
                        title: 'Screen Share',
                        text: 'Share your screen',
                    });
                } else {
                    // Fallback to screenshot mode
                    this.triggerScreenshot();
                }
            } catch (error) {
                console.error('Failed to share:', error);
            }
        };

        // Add to preview container
        const previewContainer = document.getElementById('screenPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.appendChild(shareBtn);
            this.previewContainer = previewContainer;
            this.showPreview();
        }
    }

    /**
     * Initialize screen capture for Android devices
     * @private
     */
    async initializeAndroid() {
        try {
            // Try native screen capture API first
            if (navigator.mediaDevices?.getDisplayMedia) {
                await this.initializeDesktop(); // Android supports standard API
                return;
            }

            // Fallback to Android Intent
            const intentUrl = `intent://capture/#Intent;scheme=capture;package=com.android.systemui;end`;
            const link = document.createElement('a');
            link.href = intentUrl;
            link.click();
        } catch (error) {
            // Fallback to screenshot mode
            this.initializeScreenshotMode();
        }
    }

    /**
     * Initialize standard desktop screen capture
     * @private
     */
    async initializeDesktop() {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: false
        });

        // Create and setup video element
        this.videoElement = document.createElement('video');
        this.videoElement.srcObject = this.stream;
        this.videoElement.playsInline = true;

        // Add video to preview container
        const previewContainer = document.getElementById('screenPreview');
        if (previewContainer) {
            previewContainer.appendChild(this.videoElement);
            this.previewContainer = previewContainer;
        }

        await this.videoElement.play();

        // Set up canvas for captures
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;
        this.aspectRatio = videoHeight / videoWidth;

        const canvasWidth = this.config.width;
        const canvasHeight = Math.round(this.config.width * this.aspectRatio);

        this.canvas = document.createElement('canvas');
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.ctx = this.canvas.getContext('2d');

        // Handle stream end
        this.stream.getVideoTracks()[0].addEventListener('ended', () => {
            this.dispose();
            if (this.config.onStop) {
                this.config.onStop();
            }
        });
    }

    /**
     * Initialize screenshot mode for unsupported devices
     * @private
     */
    initializeScreenshotMode() {
        const message = document.createElement('div');
        message.className = 'screenshot-message';
        message.textContent = 'Take a screenshot and share it';

        const previewContainer = document.getElementById('screenPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.appendChild(message);
            this.previewContainer = previewContainer;
            this.showPreview();
        }
    }

    /**
     * Trigger iOS screenshot UI
     * @private
     */
    triggerScreenshot() {
        const message = document.createElement('div');
        message.className = 'screenshot-instructions';
        message.innerHTML = `
            <p>To share your screen:</p>
            <ol>
                <li>Take a screenshot (Power + Volume Up)</li>
                <li>Tap the screenshot preview</li>
                <li>Choose 'Share'</li>
            </ol>
        `;
        
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
            this.previewContainer.appendChild(message);
        }
    }

    /**
     * Get current canvas dimensions
     * @returns {{width: number, height: number}}
     */
    getDimensions() {
        if (!this.isInitialized) {
            throw new Error('Screen capture not initialized. Call initialize() first.');
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Capture and process a screenshot
     * @returns {Promise<string>} Base64 encoded JPEG image
     */
    async capture() {
        if (!this.isInitialized) {
            throw new Error('Screen capture not initialized. Call initialize() first.');
        }

        if (!this.videoElement) {
            throw new Error('Screen capture not available. Use screenshot mode instead.');
        }

        this.ctx.drawImage(
            this.videoElement,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );

        return this.canvas.toDataURL('image/jpeg', this.config.quality).split(',')[1];
    }

    /**
     * Stop screen capture and cleanup resources
     */
    dispose() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        // Hide preview and remove close button
        this.hidePreview();

        if (this.previewContainer) {
            this.previewContainer.innerHTML = ''; // Clear content
            // Don't nullify previewContainer here, might be needed if restarted
        }

        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.aspectRatio = null;
    }
}
