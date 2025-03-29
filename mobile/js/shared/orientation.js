import deviceInfo from './device-info.js';

/**
 * Manages device orientation and responsive layout adjustments
 */
class OrientationManager {
    constructor() {
        this.currentOrientation = null;
        this.handlers = new Set();
        this._init();
    }

    /**
     * Initialize orientation handling
     * @private
     */
    _init() {
        // Listen for orientation changes from device-info
        window.addEventListener('device-orientation-change', ({ detail }) => {
            this._handleOrientationChange(detail.orientation);
        });

        // Listen for resize events to handle split-screen changes
        window.addEventListener('resize', this._handleResize.bind(this));

        // Initial orientation setup
        this.currentOrientation = deviceInfo.getOrientation();
        this._applyOrientationStyles();
    }

    /**
     * Register an orientation change handler
     * @param {Function} handler - Function to call on orientation change
     */
    addOrientationChangeHandler(handler) {
        this.handlers.add(handler);
    }

    /**
     * Remove an orientation change handler
     * @param {Function} handler - Handler to remove
     */
    removeOrientationChangeHandler(handler) {
        this.handlers.delete(handler);
    }

    /**
     * Get current orientation
     * @returns {string} Current orientation ('portrait' or 'landscape')
     */
    getOrientation() {
        return this.currentOrientation;
    }

    /**
     * Check if device is in portrait mode
     * @returns {boolean} True if in portrait mode
     */
    isPortrait() {
        return this.currentOrientation === 'portrait';
    }

    /**
     * Check if device is in landscape mode
     * @returns {boolean} True if in landscape mode
     */
    isLandscape() {
        return this.currentOrientation === 'landscape';
    }

    /**
     * Handle orientation changes
     * @param {string} newOrientation - New orientation
     * @private
     */
    _handleOrientationChange(newOrientation) {
        if (this.currentOrientation === newOrientation) return;

        this.currentOrientation = newOrientation;
        this._applyOrientationStyles();
        this._notifyHandlers();
    }

    /**
     * Handle window resize events
     * @private
     */
    _handleResize() {
        const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        this._handleOrientationChange(newOrientation);
    }

    /**
     * Apply orientation-specific CSS classes
     * @private
     */
    _applyOrientationStyles() {
        document.documentElement.classList.remove('portrait', 'landscape');
        document.documentElement.classList.add(this.currentOrientation);

        // Update viewport height for mobile browsers
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        // Apply orientation-specific styles
        this._updateLayout();
    }

    /**
     * Update layout based on current orientation
     * @private
     */
    _updateLayout() {
        const isLandscape = this.isLandscape();
        
        // Get elements that need adjustment
        const elements = {
            chatContainer: document.querySelector('.mobile-chat-container'),
            controls: document.querySelector('.mobile-controls'),
            previews: document.querySelectorAll('.mobile-camera-preview, .mobile-screen-preview'),
            visualizer: document.querySelector('.visualizer-container')
        };

        if (isLandscape) {
            this._applyLandscapeLayout(elements);
        } else {
            this._applyPortraitLayout(elements);
        }

        // Handle notch areas
        this._updateSafeAreas(isLandscape);
    }

    /**
     * Apply landscape-specific layout
     * @param {Object} elements - DOM elements to adjust
     * @private
     */
    _applyLandscapeLayout(elements) {
        const { chatContainer, controls, previews, visualizer } = elements;

        if (chatContainer) {
            chatContainer.style.width = '50%';
            chatContainer.style.left = '10px';
        }

        if (controls) {
            controls.style.right = '10px';
            controls.style.bottom = '50%';
            controls.style.transform = 'translateY(50%)';
            controls.style.flexDirection = 'column';
        }

        if (previews) {
            previews.forEach(preview => {
                preview.style.width = '45%';
                preview.style.right = '10px';
                preview.style.maxHeight = '40vh';
            });
        }

        if (visualizer) {
            visualizer.style.width = '45%';
            visualizer.style.right = '10px';
        }
    }

    /**
     * Apply portrait-specific layout
     * @param {Object} elements - DOM elements to adjust
     * @private
     */
    _applyPortraitLayout(elements) {
        const { chatContainer, controls, previews, visualizer } = elements;

        if (chatContainer) {
            chatContainer.style.width = '100%';
            chatContainer.style.left = '0';
        }

        if (controls) {
            controls.style.right = '15px';
            controls.style.bottom = '80px';
            controls.style.transform = 'none';
            controls.style.flexDirection = 'column';
        }

        if (previews) {
            previews.forEach(preview => {
                preview.style.width = '100%';
                preview.style.right = '0';
                preview.style.maxHeight = '30vh';
            });
        }

        if (visualizer) {
            visualizer.style.width = '100%';
            visualizer.style.right = '0';
        }
    }

    /**
     * Update safe areas for notched devices
     * @param {boolean} isLandscape - Whether device is in landscape mode
     * @private
     */
    _updateSafeAreas(isLandscape) {
        const safeAreaTop = getComputedStyle(document.documentElement)
            .getPropertyValue('--safe-area-inset-top');
        const safeAreaBottom = getComputedStyle(document.documentElement)
            .getPropertyValue('--safe-area-inset-bottom');

        document.body.style.paddingTop = safeAreaTop;
        document.body.style.paddingBottom = safeAreaBottom;

        if (isLandscape) {
            const safeAreaLeft = getComputedStyle(document.documentElement)
                .getPropertyValue('--safe-area-inset-left');
            const safeAreaRight = getComputedStyle(document.documentElement)
                .getPropertyValue('--safe-area-inset-right');

            document.body.style.paddingLeft = safeAreaLeft;
            document.body.style.paddingRight = safeAreaRight;
        } else {
            document.body.style.paddingLeft = '0';
            document.body.style.paddingRight = '0';
        }
    }

    /**
     * Notify registered handlers of orientation change
     * @private
     */
    _notifyHandlers() {
        this.handlers.forEach(handler => {
            try {
                handler(this.currentOrientation);
            } catch (error) {
                console.error('Error in orientation change handler:', error);
            }
        });
    }

    /**
     * Lock orientation
     * @param {string} orientation - Orientation to lock to ('portrait' or 'landscape')
     * @returns {Promise<void>}
     */
    async lockOrientation(orientation) {
        try {
            if ('screen' in window && 'orientation' in window.screen) {
                await screen.orientation.lock(
                    orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary'
                );
            }
        } catch (error) {
            console.warn('Failed to lock orientation:', error);
        }
    }

    /**
     * Unlock orientation
     * @returns {Promise<void>}
     */
    async unlockOrientation() {
        try {
            if ('screen' in window && 'orientation' in window.screen) {
                await screen.orientation.unlock();
            }
        } catch (error) {
            console.warn('Failed to unlock orientation:', error);
        }
    }
}

// Create singleton instance
const orientationManager = new OrientationManager();
export default orientationManager;
