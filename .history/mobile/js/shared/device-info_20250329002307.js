/**
 * Device information and detection utilities
 */
export class DeviceInfo {
    constructor() {
        this.userAgent = navigator.userAgent;
        this.platform = navigator.platform;
        this._init();
    }

    /**
     * Initialize device information
     * @private
     */
    _init() {
        // Device type detection
        this.isIOS = /iPad|iPhone|iPod/.test(this.userAgent) && !window.MSStream;
        this.isAndroid = /Android/.test(this.userAgent);
        this.isTablet = this._detectTablet();
        this.isMobile = this.isIOS || this.isAndroid;
        
        // Specific device detection
        this.isIPhone = this.isIOS && !this.isTablet;
        this.isIPad = /iPad/.test(this.userAgent);
        this.isAndroidPhone = this.isAndroid && !this.isTablet;
        this.isAndroidTablet = this.isAndroid && this.isTablet;

        // Browser information
        this.browser = this._detectBrowser();
        
        // Screen information
        this._updateScreenInfo();
        this._setupOrientationListener();
    }

    /**
     * Get detailed device information
     * @returns {Object} Device information object
     */
    getDeviceInfo() {
        return {
            type: this._getDeviceType(),
            os: this._getOS(),
            browser: this.browser,
            screen: {
                width: window.innerWidth,
                height: window.innerHeight,
                orientation: this.orientation,
                pixelRatio: window.devicePixelRatio,
                isNotched: this._hasNotch()
            },
            capabilities: {
                touch: 'ontouchstart' in window,
                wakelock: 'wakeLock' in navigator,
                share: 'share' in navigator,
                camera: 'mediaDevices' in navigator,
                screenShare: this._hasScreenShareSupport(),
                webrtc: 'RTCPeerConnection' in window
            }
        };
    }

    /**
     * Get device description for header tag
     * @returns {string} Device description
     */
    getDeviceTag() {
        if (this.isIPad) return 'iPad';
        if (this.isIPhone) return 'iPhone';
        if (this.isAndroidTablet) return 'Android Tablet';
        if (this.isAndroidPhone) return 'Android';
        return 'Desktop';
    }

    /**
     * Check if device supports specific feature
     * @param {string} feature - Feature to check
     * @returns {boolean} Whether feature is supported
     */
    hasFeature(feature) {
        const info = this.getDeviceInfo();
        return info.capabilities[feature] || false;
    }

    /**
     * Get current orientation
     * @returns {string} Current orientation (portrait/landscape)
     */
    getOrientation() {
        return this.orientation;
    }

    /**
     * @private
     */
    _detectTablet() {
        // iPad detection
        if (/iPad/.test(this.userAgent)) return true;
        
        // Android tablet detection
        if (/Android/.test(this.userAgent)) {
            return !/Mobile/.test(this.userAgent);
        }
        
        // Generic tablet detection
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        return Math.min(screenWidth, screenHeight) >= 600;
    }

    /**
     * @private
     */
    _detectBrowser() {
        const ua = this.userAgent;
        
        if (/CriOS/.test(ua)) return 'Chrome iOS';
        if (/FxiOS/.test(ua)) return 'Firefox iOS';
        if (/EdgiOS/.test(ua)) return 'Edge iOS';
        if (/SamsungBrowser/.test(ua)) return 'Samsung Browser';
        if (/Chrome/.test(ua)) return 'Chrome';
        if (/Firefox/.test(ua)) return 'Firefox';
        if (/Safari/.test(ua)) return 'Safari';
        if (/Edge/.test(ua)) return 'Edge';
        
        return 'Unknown';
    }

    /**
     * @private
     */
    _getDeviceType() {
        if (this.isTablet) return 'tablet';
        if (this.isMobile) return 'mobile';
        return 'desktop';
    }

    /**
     * @private
     */
    _getOS() {
        if (this.isIOS) return `iOS ${this._getIOSVersion()}`;
        if (this.isAndroid) return `Android ${this._getAndroidVersion()}`;
        return 'Unknown';
    }

    /**
     * @private
     */
    _getIOSVersion() {
        const v = (this.userAgent).match(/OS (\d+)_(\d+)_?(\d+)?/);
        return v ? `${v[1]}.${v[2]}${v[3] ? `.${v[3]}` : ''}` : '';
    }

    /**
     * @private
     */
    _getAndroidVersion() {
        const match = this.userAgent.match(/Android\s([0-9.]*)/);
        return match ? match[1] : '';
    }

    /**
     * @private
     */
    _hasNotch() {
        // iOS detection
        if (this.isIOS) {
            return /iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15/.test(this.userAgent);
        }
        
        // Android detection (approximate)
        return CSS.supports('padding-top: env(safe-area-inset-top)');
    }

    /**
     * @private
     */
    _hasScreenShareSupport() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getDisplayMedia);
    }

    /**
     * @private
     */
    _updateScreenInfo() {
        const landscape = window.innerWidth > window.innerHeight;
        this.orientation = landscape ? 'landscape' : 'portrait';
    }

    /**
     * @private
     */
    _setupOrientationListener() {
        window.addEventListener('resize', () => {
            this._updateScreenInfo();
            // Dispatch orientation change event
            window.dispatchEvent(new CustomEvent('device-orientation-change', {
                detail: { orientation: this.orientation }
            }));
        });
    }
}

// Create singleton instance
const deviceInfo = new DeviceInfo();
export default deviceInfo;
