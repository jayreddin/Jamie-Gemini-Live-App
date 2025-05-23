export const getWebsocketUrl = () => {
    const apiKey = localStorage.getItem('apiKey');
    return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
};

export const getDeepgramApiKey = () => {
    return localStorage.getItem('deepgramApiKey') || '';
};

// Audio Configurations
export const MODEL_SAMPLE_RATE = parseInt(localStorage.getItem('sampleRate')) || 27000;

// Camera/Screen Configurations
export const CAPTURE_FPS = parseInt(localStorage.getItem('fps')) || 5;
export const CAPTURE_RESIZE_WIDTH = parseInt(localStorage.getItem('resizeWidth')) || 640;
export const CAPTURE_QUALITY = parseFloat(localStorage.getItem('quality')) || 0.4;
export const CAMERA_FACING_MODE = localStorage.getItem('facingMode') || 'environment';

// Deepgram Configuration
export const DEEPGRAM_KEEP_ALIVE_INTERVAL = 10000; // ms
export const DEEPGRAM_KEEPALIVE_MESSAGE = JSON.stringify({ type: 'KeepAlive' });

const thresholds = {
    0: "BLOCK_NONE",
    1: "BLOCK_ONLY_HIGH",
    2: "BLOCK_MEDIUM_AND_ABOVE",
    3: "BLOCK_LOW_AND_ABOVE"
}

export const getConfig = () => {
    // Get response mode from localStorage
    const responseMode = localStorage.getItem('responseMode') || 'text';
    
    // Determine response modalities based on mode
    const responseModalities = responseMode === 'audio' ? 'text,speech' : 'text';
    
    // Base configuration
    const config = {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
            temperature: parseFloat(localStorage.getItem('temperature')) || 1.8,
            top_p: parseFloat(localStorage.getItem('top_p')) || 0.95,
            top_k: parseInt(localStorage.getItem('top_k')) || 65,
            responseModalities
        },
        systemInstruction: {
            parts: [{
                text: localStorage.getItem('systemInstructions') || "You are a helpful assistant"
            }]
        },
        tools: {
            functionDeclarations: [],
        },
        safetySettings: [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": thresholds[localStorage.getItem('harassmentThreshold')] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": thresholds[localStorage.getItem('dangerousContentThreshold')] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": thresholds[localStorage.getItem('sexuallyExplicitThreshold')] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": thresholds[localStorage.getItem('hateSpeechThreshold')] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
            },
            {
                "category": "HARM_CATEGORY_CIVIC_INTEGRITY",
                "threshold": thresholds[localStorage.getItem('civicIntegrityThreshold')] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
            }
        ]
    };

    // Add speech config only if audio responses are enabled
    if (responseMode === 'audio') {
        config.generationConfig.speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: localStorage.getItem('voiceName') || 'Aoede'
                }
            }
        };
    }

    return config;
};
