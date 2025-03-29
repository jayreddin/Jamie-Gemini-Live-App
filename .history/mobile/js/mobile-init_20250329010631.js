import deviceInfo from './shared/device-info.js';
import mobileUI from './shared/mobile-ui.js';
import orientationManager from './shared/orientation.js';

/**
 * Initializes mobile-specific features and UI components
 */
class MobileInitializer {
    constructor() {
        this.setupComplete = false;
    }

    /**
     * Initialize all mobile components
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.setupComplete) return;

        try {
            await this._setupMobileFeatures();
            await this._setupEventHandlers();
            this._setupMediaHandlers();
            this._setupInteractionHandlers();
            
            // Mark initialization as complete
            this.setupComplete = true;
            
            // Dispatch event when mobile setup is complete
            window.dispatchEvent(new CustomEvent('mobile-setup-complete'));
        } catch (error) {
            console.error('Mobile initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up mobile-specific features
     * @private
     */
    async _setupMobileFeatures() {
        // Prevent elastic scrolling on iOS
        document.body.addEventListener('touchmove', (e) => {
            if (!e.target.closest('.mobile-chat-history, .mobile-settings-dialog')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle PWA display mode
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone) {
            document.body.classList.add('pwa-mode');
        }

        // Set initial orientation if supported
        const orientation = deviceInfo.getOrientation();
        if ('lock' in screen.orientation) {
            await orientationManager.lockOrientation(orientation);
        } else {
            console.warn('Screen orientation lock not supported.');
        }

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._handleAppBackground();
            } else {
                this._handleAppForeground();
            }
        });
    }

    /**
     * Set up event handlers for mobile UI
     * @private
     */
    async _setupEventHandlers() {
        // Settings button handler
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                mobileUI.openSettings();
            });
        }

        // Back button handling for Android
        if (deviceInfo.isAndroid) {
            window.addEventListener('popstate', (e) => {
                if (mobileUI.isSettingsOpen) {
                    mobileUI.closeSettings();
                    e.preventDefault();
                    return;
                }

                if (mobileUI.activePreview) {
                    mobileUI.closeActivePreview();
                    e.preventDefault();
                    return;
                }
            });
        }

        // Orientation change handling
        orientationManager.addOrientationChangeHandler((newOrientation) => {
            document.body.setAttribute('data-orientation', newOrientation);
            this._handleOrientationChange(newOrientation);
        });
    }

    /**
     * Set up media-related handlers
     * @private
     */
    _setupMediaHandlers() {
        // Handle camera button
        const cameraBtn = document.getElementById('cameraBtnControl');
        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => {
                const isActive = cameraBtn.classList.contains('active');
                if (isActive) {
                    orientationManager.unlockOrientation();
                } else {
                    orientationManager.lockOrientation('portrait');
                }
                mobileUI.setActivePreview(isActive ? null : 'camera');
            });
        }

        // Handle screen share button
        const screenBtn = document.getElementById('screenBtnControl');
        if (screenBtn) {
            screenBtn.addEventListener('click', () => {
                const isActive = screenBtn.classList.contains('active');
                mobileUI.setActivePreview(isActive ? null : 'screen');
            });
        }
    }

    /**
     * Set up interaction handlers
     * @private
     */
    _setupInteractionHandlers() {
        // Keyboard handling
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            // Prevent zoom on focus (iOS)
            messageInput.style.fontSize = '16px';

            // Handle keyboard show/hide
            let originalHeight = window.innerHeight;
            window.addEventListener('resize', () => {
                const heightDiff = originalHeight - window.innerHeight;
                if (heightDiff > 150) {
                    document.body.classList.add('keyboard-visible');
                    mobileUI._adjustForKeyboard(heightDiff);
                } else {
                    document.body.classList.remove('keyboard-visible');
                    mobileUI._resetKeyboardAdjustment();
                }
            });

            // Reset height on orientation change
            orientationManager.addOrientationChangeHandler(() => {
                originalHeight = window.innerHeight;
            });
        }

        // Double tap prevention
        document.querySelectorAll('button').forEach(button => {
            let lastTap = 0;
            button.addEventListener('touchend', (e) => {
                const currentTap = Date.now();
                if (currentTap - lastTap < 300) {
                    e.preventDefault();
                }
                lastTap = currentTap;
            });
        });
    }

    /**
     * Handle orientation changes
     * @param {string} orientation - New orientation
     * @private
     */
    _handleOrientationChange(orientation) {
        const mediaElements = document.querySelectorAll('video, canvas');
        mediaElements.forEach(element => {
            // Ensure media elements adjust to new orientation
            element.style.transform = orientation === 'landscape' 
                ? 'rotate(0deg)' 
                : 'rotate(0deg)';
        });

        // Update layout
        mobileUI._updateLayout();
    }

    /**
     * Handle app going to background
     * @private
     */
    _handleAppBackground() {
        // Pause media if playing
        document.querySelectorAll('video, audio').forEach(element => {
            if (!element.paused) {
                element.pause();
            }
        });

        // Save any necessary state
        this._saveAppState();
    }

    /**
     * Handle app coming to foreground
     * @private
     */
    _handleAppForeground() {
        // Restore any necessary state
        this._restoreAppState();

        // Check and reacquire media if needed
        this._checkMediaState();
    }

    /**
     * Save app state
     * @private
     */
    _saveAppState() {
        const state = {
            orientation: orientationManager.getOrientation(),
            activePreview: mobileUI.activePreview,
            isSettingsOpen: mobileUI.isSettingsOpen
        };
        sessionStorage.setItem('mobileAppState', JSON.stringify(state));
    }

    /**
     * Restore app state
     * @private
     */
    _restoreAppState() {
        try {
            const stateJson = sessionStorage.getItem('mobileAppState');
            if (stateJson) {
                const state = JSON.parse(stateJson);
                if (state.activePreview) {
                    mobileUI.setActivePreview(state.activePreview);
                }
                if (state.isSettingsOpen) {
                    mobileUI.openSettings();
                }
            }
        } catch (error) {
            console.warn('Failed to restore app state:', error);
        }
    }

    /**
     * Check and restore media state
     * @private
     */
    _checkMediaState() {
        const cameraBtn = document.getElementById('cameraBtnControl');
        const micBtn = document.getElementById('micBtnControl');

        if (cameraBtn?.classList.contains('active')) {
            // Trigger camera reinitialize
            cameraBtn.click();
            cameraBtn.click();
        }

        if (micBtn?.classList.contains('active')) {
            // Trigger microphone reinitialize
            micBtn.click();
            micBtn.click();
        }
    }
}

// Create and export singleton instance
const mobileInit = new MobileInitializer();
export default mobileInit;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mobileInit.initialize());
} else {
    mobileInit.initialize();
}
