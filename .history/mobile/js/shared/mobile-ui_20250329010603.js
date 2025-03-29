import deviceInfo from './device-info.js';

/**
 * Manages mobile-specific UI components and interactions
 */
class MobileUI {
    constructor() {
        this.activePreview = null;
        this.isSettingsOpen = false;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this._init();
    }

    /**
     * Initialize mobile UI components and event listeners
     * @private
     */
    _init() {
        this._setupTouchHandlers();
        this._setupOrientationHandler();
        this._setupInputHandling();
        this._setupBackButtonHandling();
        this._updateSafeAreas();
        this._initializeDeviceTag();
    }

    /**
     * Set up touch event handlers
     * @private
     */
    _setupTouchHandlers() {
        // Add touch feedback to all buttons with touch-feedback class
        document.querySelectorAll('.touch-feedback').forEach(element => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.95)';
            }, { passive: true }); // Make touchstart passive

            element.addEventListener('touchend', () => {
                element.style.transform = 'scale(1)';
            });
        });

        // Swipe handling for chat history
        const chatHistory = document.querySelector('.mobile-chat-history');
        if (chatHistory) {
            chatHistory.addEventListener('touchstart', (e) => {
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });

            chatHistory.addEventListener('touchmove', (e) => {
                const currentY = e.touches[0].clientY;
                const isScrolledToTop = chatHistory.scrollTop === 0;
                const isScrolledToBottom = chatHistory.scrollHeight - chatHistory.scrollTop === chatHistory.clientHeight;

                // Prevent pull-to-refresh only if at the edges
                if ((isScrolledToTop && currentY > this.touchStartY) || 
                    (isScrolledToBottom && currentY < this.touchStartY)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    /**
     * Set up orientation change handling
     * @private
     */
    _setupOrientationHandler() {
        window.addEventListener('device-orientation-change', ({ detail }) => {
            this._handleOrientationChange(detail.orientation);
        });

        // Initial orientation setup
        this._handleOrientationChange(deviceInfo.getOrientation());
    }

    /**
     * Handle orientation changes
     * @param {string} orientation - New orientation
     * @private
     */
    _handleOrientationChange(orientation) {
        const container = document.querySelector('.mobile-container');
        const controls = document.querySelector('.mobile-controls');
        const chatContainer = document.querySelector('.mobile-chat-container');
        
        if (orientation === 'landscape') {
            container.classList.add('landscape');
            controls.classList.add('landscape');
            chatContainer.classList.add('landscape');
        } else {
            container.classList.remove('landscape');
            controls.classList.remove('landscape');
            chatContainer.classList.remove('landscape');
        }

        // Trigger layout adjustment
        this._updateLayout();
    }

    /**
     * Set up mobile keyboard handling
     * @private
     */
    _setupInputHandling() {
        const input = document.querySelector('.mobile-text-input');
        if (!input) return;

        // Adjust layout when keyboard shows/hides
        const originalHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            const heightDiff = originalHeight - window.innerHeight;
            if (heightDiff > 150) { // Keyboard is likely visible
                document.body.classList.add('keyboard-open');
                this._adjustForKeyboard(heightDiff);
            } else {
                document.body.classList.remove('keyboard-open');
                this._resetKeyboardAdjustment();
            }
        });

        // Prevent zoom on focus (iOS)
        input.style.fontSize = '16px';
    }

    /**
     * Handle back button behavior
     * @private
     */
    _setupBackButtonHandling() {
        window.addEventListener('popstate', (e) => {
            if (this.isSettingsOpen) {
                this.closeSettings();
                e.preventDefault();
                return;
            }

            if (this.activePreview) {
                this.closeActivePreview();
                e.preventDefault();
                return;
            }
        });
    }

    /**
     * Update safe areas for notched devices
     * @private
     */
    _updateSafeAreas() {
        if (deviceInfo.getDeviceInfo().screen.isNotched) {
            document.body.classList.add('has-notch');
        }
    }

    /**
     * Initialize device tag in header
     * @private
     */
    _initializeDeviceTag() {
        const deviceTag = document.querySelector('.device-tag');
        if (deviceTag) {
            deviceTag.textContent = deviceInfo.getDeviceTag();
        }
    }

    /**
     * Update layout based on current state
     * @private
     */
    _updateLayout() {
        const isLandscape = deviceInfo.getOrientation() === 'landscape';
        const container = document.querySelector('.mobile-container');
        
        if (isLandscape) {
            // Adjust layout for landscape mode
            this._handleLandscapeLayout();
        } else {
            // Reset to portrait layout
            this._handlePortraitLayout();
        }

        // Update safe areas
        this._updateSafeAreas();
    }

    /**
     * Adjust UI for landscape mode
     * @private
     */
    _handleLandscapeLayout() {
        const chatContainer = document.querySelector('.mobile-chat-container');
        const previews = document.querySelectorAll('.mobile-camera-preview, .mobile-screen-preview');
        
        if (chatContainer) {
            chatContainer.style.width = '50%';
        }

        previews.forEach(preview => {
            preview.style.width = '45%';
            preview.style.right = '20px';
        });
    }

    /**
     * Reset UI to portrait mode
     * @private
     */
    _handlePortraitLayout() {
        const chatContainer = document.querySelector('.mobile-chat-container');
        const previews = document.querySelectorAll('.mobile-camera-preview, .mobile-screen-preview');
        
        if (chatContainer) {
            chatContainer.style.width = '100%';
        }

        previews.forEach(preview => {
            preview.style.width = '100%';
            preview.style.right = '0';
        });
    }

    /**
     * Adjust layout for keyboard
     * @param {number} keyboardHeight - Height of keyboard
     * @private
     */
    _adjustForKeyboard(keyboardHeight) {
        const chatContainer = document.querySelector('.mobile-chat-container');
        const inputContainer = document.querySelector('.mobile-input-container');
        
        if (chatContainer && inputContainer) {
            chatContainer.style.bottom = `${keyboardHeight + 60}px`;
            inputContainer.style.transform = `translateY(-${keyboardHeight}px)`;
        }
    }

    /**
     * Reset keyboard adjustments
     * @private
     */
    _resetKeyboardAdjustment() {
        const chatContainer = document.querySelector('.mobile-chat-container');
        const inputContainer = document.querySelector('.mobile-input-container');
        
        if (chatContainer && inputContainer) {
            chatContainer.style.bottom = '';
            inputContainer.style.transform = '';
        }
    }

    /**
     * Open settings dialog
     */
    openSettings() {
        const dialog = document.querySelector('.mobile-settings-dialog');
        if (dialog) {
            dialog.style.display = 'block';
            this.isSettingsOpen = true;
            history.pushState({ type: 'settings' }, '');
        }
    }

    /**
     * Close settings dialog
     */
    closeSettings() {
        const dialog = document.querySelector('.mobile-settings-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            this.isSettingsOpen = false;
        }
    }

    /**
     * Set active preview
     * @param {string} type - Type of preview ('camera' or 'screen')
     */
    setActivePreview(type) {
        this.activePreview = type;
        history.pushState({ type: 'preview', preview: type }, '');
    }

    /**
     * Close active preview
     */
    closeActivePreview() {
        if (this.activePreview) {
            const preview = document.querySelector(
                this.activePreview === 'camera' ? '.mobile-camera-preview' : '.mobile-screen-preview'
            );
            if (preview) {
                preview.style.display = 'none';
            }
            this.activePreview = null;
        }
    }
}

// Create singleton instance
const mobileUI = new MobileUI();
export default mobileUI;
