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
        this.videoWrapper = null; // Wrapper for video and controls
        this.controlsContainer = null; // Container for buttons
        this.switchButton = null;
        this.selectButton = null; // For camera selection dropdown
        this.shrinkButton = null;
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        this.availableCameras = [];
        this.isShrunk = false;
    }

    /**
     * Create a new preview container
     * @param {string} [containerId] - Optional ID for the container
     * @returns {HTMLElement} The created preview container
     */
    _createPreviewContainer(containerId) {
        const container = document.createElement('div');
        // Use mobile class if in mobile context
        container.className = this.isMobile ? 'mobile-camera-preview' : 'camera-preview';
        if (containerId) {
            container.id = containerId;
        }

        // Create wrapper for video and controls
        this.videoWrapper = document.createElement('div');
        this.videoWrapper.className = 'camera-video-wrapper';
        container.appendChild(this.videoWrapper);

        // Create controls container
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'camera-controls';
        container.appendChild(this.controlsContainer);

        return container;
    }

    /**
     * Show the camera preview. It will always be added to the default preview container.
     */
    async showPreview() {
        if (!this.isInitialized) return;

        const defaultContainerId = this.isMobile ? 'cameraPreview' : 'cameraPreview'; // Use appropriate ID if needed
        const defaultContainer = document.getElementById(defaultContainerId);

        if (!defaultContainer) {
            console.error(`Preview container #${defaultContainerId} not found.`);
            return;
        }

        // Create preview container if it doesn't exist
        if (!this.previewContainer) {
            this.previewContainer = this._createPreviewContainer(defaultContainerId);
        }

        // Add video element to wrapper if not already present
        if (this.videoElement && !this.videoWrapper.contains(this.videoElement)) {
            this.videoWrapper.appendChild(this.videoElement);
        }

        // Add controls
        this.controlsContainer.innerHTML = ''; // Clear previous controls
        this._createShrinkButton();
        if (this.isMobile) {
            await this._enumerateCameras(); // Get camera list first
            if (this.availableCameras.length > 1) {
                this._createSwitchButton(); // Show switch if multiple cameras
                this._createSelectButton(); // Show select if multiple cameras
            }
        }

        // Add the preview container to the default DOM element
        if (!defaultContainer.contains(this.previewContainer)) {
            defaultContainer.appendChild(this.previewContainer);
        }

        // Make sure the container is visible
        this.previewContainer.style.display = 'block';
        defaultContainer.style.display = 'block'; // Ensure parent is visible too
    }

    /**
     * Hide the camera preview and its parent container
     */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
            // Also hide the parent container if it exists
            const defaultContainer = document.getElementById(this.isMobile ? 'cameraPreview' : 'cameraPreview');
            if (defaultContainer) {
                defaultContainer.style.display = 'none';
            }
        }
        this.isShrunk = false; // Reset shrunk state
    }

    /**
     * Create and append the camera switch button to the controls container
     * @private
     */
    _createSwitchButton() {
        if (!this.isMobile || !this.controlsContainer) return;
        // Remove existing button if any
        if (this.switchButton) this.switchButton.remove();

        this.switchButton = document.createElement('button');
        this.switchButton.className = 'camera-control-btn camera-switch-btn';
        this.switchButton.innerHTML = '⟲'; // Switch icon
        this.switchButton.title = 'Switch Camera';
        this.switchButton.addEventListener('click', () => this.switchCamera());
        this.controlsContainer.appendChild(this.switchButton);
    }

    /**
     * Create and append the camera select button/dropdown to the controls container
     * @private
     */
    _createSelectButton() {
        if (!this.isMobile || !this.controlsContainer || this.availableCameras.length <= 1) return;
        if (this.selectButton) this.selectButton.remove(); // Remove existing

        this.selectButton = document.createElement('select');
        this.selectButton.className = 'camera-control-btn camera-select-btn';
        this.selectButton.title = 'Select Camera';

        this.availableCameras.forEach(camera => {
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
