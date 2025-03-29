/**
 * Manages camera access, capture, and image processing
 */
export class CameraManager {
    /**
     * @param {Object} config
     * @param {number} config.width - Target width for resizing captured images
     * @param {number} config.quality - JPEG quality (0-1)
     * @param {string} [config.facingMode] - Camera facing mode (optional, mobile-only)
     */
    constructor(config) {
        this.config = {
            width: config.width || 640,
            quality: config.quality || 0.8,
            facingMode: config.facingMode // undefined by default for desktop compatibility
        };
        
        this.stream = null;
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.aspectRatio = null;
        this.previewContainer = null;
        this.switchButton = null;
        this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
    }

    /**
     * Create a new preview container
     * @param {string} [containerId] - Optional ID for the container
     * @returns {HTMLElement} The created preview container
     */
    createPreviewContainer(containerId) {
        const container = document.createElement('div');
        container.className = 'camera-preview';
        if (containerId) {
            container.id = containerId;
        }
        return container;
    }

    /**
     * Show the camera preview
     * @param {HTMLElement} [parent] - Optional parent element to inject preview into
     */
    showPreview(parent) {
        if (!this.isInitialized) return;

        // Create new preview container if needed
        if (!this.previewContainer) {
            this.previewContainer = this.createPreviewContainer();
        }

        // Add video element if not already present
        if (!this.previewContainer.contains(this.videoElement)) {
            this.previewContainer.appendChild(this.videoElement);
            if (this.isMobile) {
                this._createSwitchButton();
            }
        }

        // If parent provided, inject preview there
        if (parent) {
            parent.appendChild(this.previewContainer);
        } else {
            // Otherwise use floating preview
            const defaultContainer = document.getElementById('cameraPreview');
            if (defaultContainer && !defaultContainer.contains(this.previewContainer)) {
                defaultContainer.appendChild(this.previewContainer);
            }
        }

        this.previewContainer.style.display = 'block';
    }

    /**
     * Hide the camera preview
     */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
        }
    }

    /**
     * Create and append the camera switch button
     * @private
     */
    _createSwitchButton() {
        if (!this.isMobile || this.switchButton) return;

        this.switchButton = document.createElement('button');
        this.switchButton.className = 'camera-switch-btn';
        this.switchButton.innerHTML = '⟲';
        this.switchButton.addEventListener('click', () => this.switchCamera());
        this.previewContainer.appendChild(this.switchButton);
    }

    /**
     * Switch between front and back cameras
     */
    async switchCamera() {
        if (!this.isInitialized) return;
        
        // Toggle facingMode
        this.config.facingMode = this.config.facingMode === 'user' ? 'environment' : 'user';
        localStorage.setItem('facingMode', this.config.facingMode);
        
        // Stop current stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Reinitialize with new facingMode
        try {
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: this.config.facingMode
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
        } catch (error) {
            console.error('Failed to switch camera:', error);
            this.config.facingMode = localStorage.getItem('facingMode') || 'environment';
        }
    }

    /**
     * Initialize camera stream and canvas
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            // Set initial facingMode on mobile
            if (this.isMobile) {
                this.config.facingMode = this.config.facingMode || 'user';
                constraints.video.facingMode = this.config.facingMode;
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create and setup video element
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            this.videoElement.playsInline = true;
            await this.videoElement.play();

            // Get the actual video dimensions
            const videoWidth = this.videoElement.videoWidth;
            const videoHeight = this.videoElement.videoHeight;
            this.aspectRatio = videoHeight / videoWidth;

            // Calculate canvas size maintaining aspect ratio
            const canvasWidth = this.config.width;
            const canvasHeight = Math.round(this.config.width * this.aspectRatio);

            // Create canvas for image processing
            this.canvas = document.createElement('canvas');
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.ctx = this.canvas.getContext('2d');

            this.isInitialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize camera: ${error.message}`);
        }
    }

    /**
     * Get current canvas dimensions
     * @returns {{width: number, height: number}}
     */
    getDimensions() {
        if (!this.isInitialized) {
            throw new Error('Camera not initialized. Call initialize() first.');
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Capture and process an image from the camera
     * @returns {Promise<string>} Base64 encoded JPEG image
     */
    async capture() {
        if (!this.isInitialized) {
            throw new Error('Camera not initialized. Call initialize() first.');
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
     * Stop camera stream and cleanup resources
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

        if (this.switchButton) {
            this.switchButton.remove();
            this.switchButton = null;
        }

        if (this.previewContainer) {
            this.hidePreview();
            this.previewContainer.remove();
            this.previewContainer = null;
        }

        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.aspectRatio = null;
    }
}
