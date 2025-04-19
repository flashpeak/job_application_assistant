class AIBusyStateManager {
  #queryTimerId = null;
  #busyState = false;

  constructor() {
    this.#queryTimerId = null;
    this.#busyState = false;
  }

  setAIBusyMessage(message = "") {
    this.#busyState = message !== "";

    // If the current window is not the top window, send a message to the top window to show the busy message
    // Otherwise, the busy message location might be limited by the iframe viewport instead of bottom right corner of the tab window.
    if (window !== window.top) {
      window.top.postMessage({
        action: "show_busy_message_in_main",
        message: message
      }, "*");
      return;    
    }    
    
    // Clear existing timer if any
    if (this.#queryTimerId) {
      clearTimeout(this.#queryTimerId);
      this.#queryTimerId = null;
    }

    // Start timeout timer if message is not empty
    if (message !== "") {
      this.#queryTimerId = setTimeout(() => {
        this.setAIBusyMessage("");
        Utils.showNotification("AI query error due to unhandled background script exception.", true);
      }, 80000);
    }

    // Handle UI updates
    this.#updateBusyMessageUI(message);
  }

  getBusyState() {
    return this.#busyState;
  }

  #updateBusyMessageUI(message) {
    let messageDiv = document.getElementById('ai-busy-message');
    
    if (!messageDiv && message !== "") {
      // Create the message div only if it doesn't exist
      messageDiv = document.createElement('div');
      messageDiv.id = 'ai-busy-message';
      messageDiv.innerHTML = `
        <div class="spinner"></div>
        <span id="ai-busy-message-text">${message}</span>
      `;
      messageDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
      `;

      // Add spinner styles
      const style = document.createElement('style');
      style.textContent = `
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(messageDiv);
    }

    if (message !== "" && document.getElementById('ai-busy-message-text')) {
      document.getElementById('ai-busy-message-text').textContent = message;
    }

    if (messageDiv) {
      messageDiv.style.display = message ? 'flex' : 'none';
    }
  }
}