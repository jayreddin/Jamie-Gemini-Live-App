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
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${this.selectButton.options.length + 1}`;
            if (this.stream && this.stream.getVideoTracks()[0].getSettings().deviceId === camera.deviceId) {
                option.selected = true;
            }
            this.selectButton.appendChild(option);
        });

        this.selectButton.addEventListener('change', (event) => {
            this.switchCamera(event.target.value);
        });
        this.controlsContainer.appendChild(this.selectButton);
    }

    /**
     * Create and append the shrink/expand button to the controls container
     * @private
     */
     _createShrinkButton() {
        if (!this.controlsContainer) return;
        if (this.shrinkButton) this.shrinkButton.remove();

        this.shrinkButton = document.createElement('button');
        this.shrinkButton.className = 'camera-control-btn camera-shrink-btn';
        this.shrinkButton.innerHTML = this.isShrunk ? '➚' : '➘'; // Expand/Shrink icon
        this.shrinkButton.title = this.isShrunk ? 'Expand Preview' : 'Shrink Preview';
        this.shrinkButton.addEventListener('click', () => this._toggleShrink());
        this.controlsContainer.appendChild(this.shrinkButton);
    }

    /**
     * Toggle the shrunk state of the preview
     * @private
     */
    _toggleShrink() {
        this.isShrunk = !this.isShrunk;
        if (this.previewContainer) {
            this.previewContainer.classList.toggle('shrunk', this.isShrunk);
        }
        // Update button icon/title
        if (this.shrinkButton) {
            this.shrinkButton.innerHTML = this.isShrunk ? '➚' : '➘';
            this.shrinkButton.title = this.isShrunk ? 'Expand Preview' : 'Shrink Preview';
        }
    }

    /**
     * Enumerate available camera devices
     * @private
     */
    async _enumerateCameras() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn("enumerateDevices() not supported.");
                this.availableCameras = [];
                return;
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');
        } catch (err) {
            console.error("Error enumerating devices:", err);
            this.availableCameras = [];
        }
    }

    /**
     * Switch camera based on facing mode toggle or specific device ID
     * @param {string} [deviceId] - Optional specific device ID to switch to
     */
    async switchCamera(deviceId) {
        if (!this.isInitialized || this.availableCameras.length <= 1) return;

        // Stop current stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        let constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        if (deviceId) {
            // Switch to specific device ID
            constraints.video.deviceId = { exact: deviceId };
            // Update facingMode based on the selected device if possible (heuristic)
            const selectedCamera = this.availableCameras.find(cam => cam.deviceId === deviceId);
            if (selectedCamera && selectedCamera.label) {
                 if (/front/i.test(selectedCamera.label)) this.config.facingMode = 'user';
                 else if (/back/i.test(selectedCamera.label)) this.config.facingMode = 'environment';
                 // else keep current facingMode
            }
        } else if (this.isMobile) {
            // Toggle facingMode if no deviceId is provided (mobile only)
            this.config.facingMode = this.config.facingMode === 'user' ? 'environment' : 'user';
            constraints.video.facingMode = this.config.facingMode;
        } else {
             // Desktop: Cycle through available devices if no specific ID
             const currentDeviceId = this.videoElement.srcObject?.getVideoTracks()[0]?.getSettings().deviceId;
             const currentIndex = this.availableCameras.findIndex(cam => cam.deviceId === currentDeviceId);
             const nextIndex = (currentIndex + 1) % this.availableCameras.length;
             constraints.video.deviceId = { exact: this.availableCameras[nextIndex].deviceId };
        }

        localStorage.setItem('facingMode', this.config.facingMode || 'user'); // Save preference

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            // Update the select dropdown if it exists
            if (this.selectButton) {
                const currentDeviceId = this.stream.getVideoTracks()[0].getSettings().deviceId;
                this.selectButton.value = currentDeviceId;
            }

        } catch (error) {
            console.error('Failed to switch camera:', error);
            // Attempt to revert to previous settings or a default
            this.config.facingMode = localStorage.getItem('facingMode') || 'user';
            // Maybe try initializing again with default constraints?
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

            // Set initial facingMode on mobile from localStorage or default
            if (this.isMobile) {
                this.config.facingMode = localStorage.getItem('facingMode') || 'user';
                constraints.video.facingMode = this.config.facingMode;
            } else {
                // For desktop, maybe select a preferred device ID if stored?
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

        // Remove controls
        if (this.controlsContainer) {
            this.controlsContainer.innerHTML = ''; // Clear controls
        }
        if (this.switchButton) this.switchButton = null;
        if (this.selectButton) this.selectButton = null;
        if (this.shrinkButton) this.shrinkButton = null;

        // Remove preview container from DOM and hide it
        if (this.previewContainer) {
            this.hidePreview(); // Hides parent container too
            this.previewContainer.remove(); // Remove from DOM
            this.previewContainer = null;
        }
        this.videoWrapper = null;
        this.controlsContainer = null;

