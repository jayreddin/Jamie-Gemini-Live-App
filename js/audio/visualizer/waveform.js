import { AudioAnalyzer } from './analyzer.js';
import { VisualizationRenderer } from './renderer.js';

/**
 * Manages real-time audio visualization by coordinating analysis and rendering
 */
export class Waveform {
    /**
     * Creates a Waveform instance
     * @param {AudioContext} audioContext - The Web Audio API context
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     * @param {Object} options - Visualization options
     */
    constructor(audioContext, canvas, options = {}) {
        this.analyzer = new AudioAnalyzer(audioContext);
        this.renderer = new VisualizationRenderer(canvas, options);
        this.animationFrame = null;
        this.isActive = false;
        
        // Performance optimization flags
        this.lastVolume = 0;
        this.silenceThreshold = 0.01;
        this.silenceFrames = 0;
        this.maxSilenceFrames = 30; // Reduce updates after silence
    }

    /**
     * Connects an audio source to the visualizer
     * @param {AudioNode} source - The audio source node
     * @returns {Waveform} This visualizer instance for chaining
     */
    connectSource(source) {
        this.analyzer.connectSource(source);
        return this;
    }

    /**
     * Starts the visualization animation loop
     */
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.animate();
    }

    /**
     * Stops the visualization animation loop
     */
    stop() {
        if (!this.isActive) return;
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Main animation loop
     * @private
     */
    animate() {
        if (!this.isActive) return;

        // Get current audio data
        const volume = this.analyzer.getVolume();
        const waveformData = this.analyzer.getWaveformData();
        const frequencyData = this.analyzer.getFrequencyData();

        // Check for silence to optimize rendering
        const volumeDelta = Math.abs(volume - this.lastVolume);
        if (volume < this.silenceThreshold && volumeDelta < this.silenceThreshold) {
            this.silenceFrames++;
            if (this.silenceFrames > this.maxSilenceFrames) {
                // During silence, update less frequently
                this.animationFrame = requestAnimationFrame(() => {
                    setTimeout(() => this.animate(), 100);
                });
                return;
            }
        } else {
            this.silenceFrames = 0;
        }

        // Render the current frame
        this.renderer.render(waveformData, frequencyData, volume);
        this.lastVolume = volume;

        // Schedule next frame
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    /**
     * Changes the visualization style
     * @param {string} style - New style ('waveform', 'bars', or 'circle')
     */
    setStyle(style) {
        this.renderer.options.style = style;
    }

    /**
     * Changes the visualization colors
     * @param {Object} colors - New colors
     * @param {string} [colors.backgroundColor] - Background color
     * @param {string} [colors.foregroundColor] - Foreground color
     */
    setColors(colors) {
        if (colors.backgroundColor) {
            this.renderer.options.backgroundColor = colors.backgroundColor;
        }
        if (colors.foregroundColor) {
            this.renderer.options.foregroundColor = colors.foregroundColor;
        }
    }

    /**
     * Gets the analyzer for direct audio analysis access
     * @returns {AudioAnalyzer} The audio analyzer instance
     */
    getAnalyzer() {
        return this.analyzer;
    }

    /**
     * Gets the renderer for direct rendering control
     * @returns {VisualizationRenderer} The visualization renderer instance
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Cleans up resources
     */
    dispose() {
        this.stop();
        this.renderer.dispose();
    }
}