/**
 * Handles real-time audio analysis using Web Audio API's AnalyserNode
 */
export class AudioAnalyzer {
    /**
     * Creates an AudioAnalyzer instance
     * @param {AudioContext} audioContext - The Web Audio API context
     * @param {number} fftSize - Size of FFT for frequency analysis (default: 2048)
     */
    constructor(audioContext, fftSize = 2048) {
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = fftSize;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.maxVolume = 0;
        this.smoothedVolume = 0;
        this.volumeSmoothing = 0.8; // Smoothing factor for volume changes
    }

    /**
     * Connects an audio source to the analyzer
     * @param {AudioNode} source - The audio source node to analyze
     * @returns {AudioAnalyzer} This analyzer instance for chaining
     */
    connectSource(source) {
        source.connect(this.analyser);
        return this;
    }

    /**
     * Gets current waveform data
     * @returns {Uint8Array} Array of waveform data points
     */
    getWaveformData() {
        this.analyser.getByteTimeDomainData(this.dataArray);
        return this.dataArray;
    }

    /**
     * Gets current frequency data
     * @returns {Uint8Array} Array of frequency magnitudes
     */
    getFrequencyData() {
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }

    /**
     * Calculates current audio volume level (0-1)
     * @returns {number} Normalized volume level
     */
    getVolume() {
        const waveform = this.getWaveformData();
        let sum = 0;

        // Calculate RMS (root mean square) volume
        for (let i = 0; i < waveform.length; i++) {
            const amplitude = (waveform[i] - 128) / 128;
            sum += amplitude * amplitude;
        }
        
        const rms = Math.sqrt(sum / waveform.length);
        
        // Update max volume if necessary
        this.maxVolume = Math.max(this.maxVolume, rms);
        
        // Smooth the volume changes
        this.smoothedVolume = this.smoothedVolume * this.volumeSmoothing +
            rms * (1 - this.volumeSmoothing);
            
        // Normalize to 0-1 range
        return this.maxVolume ? this.smoothedVolume / this.maxVolume : 0;
    }

    /**
     * Gets frequency data within a specific range
     * @param {number} startFreq - Start frequency in Hz
     * @param {number} endFreq - End frequency in Hz
     * @returns {Uint8Array} Array of frequency magnitudes in range
     */
    getFrequencyRange(startFreq, endFreq) {
        const sampleRate = this.analyser.context.sampleRate;
        const freqData = this.getFrequencyData();
        const binSize = sampleRate / this.analyser.fftSize;
        
        const startBin = Math.floor(startFreq / binSize);
        const endBin = Math.min(
            Math.floor(endFreq / binSize),
            this.analyser.frequencyBinCount
        );
        
        return freqData.slice(startBin, endBin);
    }

    /**
     * Gets the analyzer node for direct Web Audio API usage
     * @returns {AnalyserNode} The Web Audio API analyzer node
     */
    getAnalyserNode() {
        return this.analyser;
    }
}