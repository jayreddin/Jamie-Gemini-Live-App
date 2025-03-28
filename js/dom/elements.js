// DOM elements object
const elements = {
    // Control buttons container
    controlButtons: document.getElementById('controlButtons'),

    // Button elements
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectBtn: document.getElementById('connectBtn'),
    micBtn: document.getElementById('micBtnControl'),
    cameraBtn: document.getElementById('cameraBtnControl'),
    screenBtn: document.getElementById('screenBtnControl'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Preview elements
    cameraPreview: document.getElementById('cameraPreview'),
    screenPreview: document.getElementById('screenPreview'),

    // Text input elements
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),

    // Visualizer elements
    visualizerContainer: document.getElementById('visualizerContainer'),
    visualizerCanvas: document.getElementById('visualizer')
};

export default elements;
