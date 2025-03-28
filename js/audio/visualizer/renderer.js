r/**
 * Handles rendering audio visualizations using Canvas API
 */
export class VisualizationRenderer {
    /**
     * Creates a VisualizationRenderer instance
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     * @param {Object} options - Rendering options
     * @param {string} options.backgroundColor - Background color (default: 'transparent')
     * @param {string} options.foregroundColor - Foreground color (default: '#4CAF50')
     * @param {string} options.style - Visualization style ('waveform', 'bars', or 'circle')
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            backgroundColor: options.backgroundColor || 'transparent',
            foregroundColor: options.foregroundColor || '#4CAF50',
            style: options.style || 'waveform'
        };
        
        this.pixelRatio = window.devicePixelRatio || 1;
        this.resize();

        // Bind resize handler
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Updates canvas size based on display size
     */
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * this.pixelRatio;
        this.canvas.height = rect.height * this.pixelRatio;
        
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    /**
     * Clears the canvas
     */
    clear() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Renders a waveform visualization
     * @param {Uint8Array} waveformData - Audio waveform data
     * @param {number} volume - Current volume level (0-1)
     */
    drawWaveform(waveformData, volume) {
        this.clear();
        
        const width = this.canvas.width / this.pixelRatio;
        const height = this.canvas.height / this.pixelRatio;
        const sliceWidth = width / waveformData.length;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.foregroundColor;
        this.ctx.lineWidth = 2 * Math.min(1, volume + 0.2); // Dynamic line width

        let x = 0;
        for (let i = 0; i < waveformData.length; i++) {
            const y = (waveformData[i] / 128.0) * height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }

        this.ctx.stroke();
    }

    /**
     * Renders a bar graph visualization
     * @param {Uint8Array} frequencyData - Audio frequency data
     * @param {number} volume - Current volume level (0-1)
     */
    drawBars(frequencyData, volume) {
        this.clear();
        
        const width = this.canvas.width / this.pixelRatio;
        const height = this.canvas.height / this.pixelRatio;
        const barWidth = width / frequencyData.length;
        
        this.ctx.fillStyle = this.options.foregroundColor;

        for (let i = 0; i < frequencyData.length; i++) {
            const barHeight = (frequencyData[i] / 255) * height;
            
            // Scale bar height by volume for more dynamic visualization
            const scaledHeight = barHeight * (0.2 + volume * 0.8);
            
            this.ctx.fillRect(
                i * barWidth,
                height - scaledHeight,
                barWidth * 0.8, // Leave small gap between bars
                scaledHeight
            );
        }
    }

    /**
     * Renders a circular visualization
     * @param {Uint8Array} frequencyData - Audio frequency data
     * @param {number} volume - Current volume level (0-1)
     */
    drawCircle(frequencyData, volume) {
        this.clear();
        
        const width = this.canvas.width / this.pixelRatio;
        const height = this.canvas.height / this.pixelRatio;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;
        
        const angleStep = (2 * Math.PI) / frequencyData.length;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.foregroundColor;
        this.ctx.lineWidth = 2;

        for (let i = 0; i < frequencyData.length; i++) {
            const amplitude = (frequencyData[i] / 255) * radius * volume;
            const angle = angleStep * i;
            
            const x = centerX + (radius + amplitude) * Math.cos(angle);
            const y = centerY + (radius + amplitude) * Math.sin(angle);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.stroke();
    }

    /**
     * Renders the current frame based on the selected style
     * @param {Uint8Array} waveformData - Audio waveform data
     * @param {Uint8Array} frequencyData - Audio frequency data
     * @param {number} volume - Current volume level (0-1)
     */
    render(waveformData, frequencyData, volume) {
        switch (this.options.style) {
            case 'bars':
                this.drawBars(frequencyData, volume);
                break;
            case 'circle':
                this.drawCircle(frequencyData, volume);
                break;
            case 'waveform':
            default:
                this.drawWaveform(waveformData, volume);
                break;
        }
    }

    /**
     * Cleans up event listeners
     */
    dispose() {
        window.removeEventListener('resize', this.resizeHandler);
    }
}