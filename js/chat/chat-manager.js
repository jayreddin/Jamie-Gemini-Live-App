export class ChatManager {
    constructor() {
        this.chatContainer = document.getElementById('chatHistory');
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null; // 'text', 'audio', or 'camera'
        this.currentTranscript = '';
        this.mediaElements = new Map(); // Track media elements in messages
    }

    addUserMessage(text, mediaContainer = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        
        // Add text content if provided
        if (text) {
            const textDiv = document.createElement('div');
            textDiv.textContent = text;
            messageDiv.appendChild(textDiv);
        }

        // Add media container if provided
        if (mediaContainer) {
            messageDiv.appendChild(mediaContainer);
            // Store reference to media element
            this.mediaElements.set(messageDiv, mediaContainer);
        }

        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = mediaContainer ? 'camera' : 'text';
        this.scrollToBottom();
    }

    addUserAudioMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.textContent = 'User sent audio';
        this.chatContainer.appendChild(messageDiv);
        this.lastUserMessageType = 'audio';
        this.scrollToBottom();
    }

    startModelMessage() {
        // If there's already a streaming message, finalize it first
        if (this.currentStreamingMessage) {
            this.finalizeStreamingMessage();
        }

        // If no user message was shown yet, show audio message
        if (!this.lastUserMessageType) {
            this.addUserAudioMessage();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message model-message streaming';
        this.chatContainer.appendChild(messageDiv);
        this.currentStreamingMessage = messageDiv;
        this.currentTranscript = '';
        this.scrollToBottom();
    }

    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) {
            this.startModelMessage();
        }
        this.currentTranscript += ' ' + text;
        this.currentStreamingMessage.textContent = this.currentTranscript;
        this.scrollToBottom();
    }

    finalizeStreamingMessage() {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.classList.remove('streaming');
            this.currentStreamingMessage = null;
            this.lastUserMessageType = null;
            this.currentTranscript = '';
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    clear() {
        // Clean up any media elements before clearing
        this.mediaElements.forEach((mediaContainer, messageDiv) => {
            if (mediaContainer.parentElement === messageDiv) {
                messageDiv.removeChild(mediaContainer);
            }
        });
        this.mediaElements.clear();
        
        this.chatContainer.innerHTML = '';
        this.currentStreamingMessage = null;
        this.lastUserMessageType = null;
        this.currentTranscript = '';
    }

    // Helper method to get the last message
    getLastMessage() {
        return this.chatContainer.lastElementChild;
    }

    // Helper method to check if the last message has media
    hasMediaInLastMessage() {
        const lastMessage = this.getLastMessage();
        return lastMessage ? this.mediaElements.has(lastMessage) : false;
    }
}