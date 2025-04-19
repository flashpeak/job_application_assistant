class CoverLetter {
  static #styles = `
    .dialog {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 400px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0px;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 5px;
    }

    .textarea {
      width: 100%;
      height: 300px;
      margin: 10px 0;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
    }

    .button-group {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #0066cc;
      color: white;
    }

    .button:hover {
      background: #0052a3;
    }

    .error {
      color: #dc2626;
    }
  `;

  static #createDialogContent(content, isError) {
    return `
      <div class="dialog-header">
        <h3>Cover Letter</h3>
        <button class="close-button">×</button>
      </div>
      <textarea class="textarea" ${isError ? 'disabled' : ''}>${content}</textarea>
      <div class="button-group">
        ${!isError ? `
          <button class="button" id="copy">Copy to Clipboard</button>
          <button class="button" id="download">Download</button>
        ` : ''}
      </div>
    `;
  }

  static showCoverLetterDialog(content, isError = false) {
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
    `;

    // Create shadow root for style isolation
    const shadow = wrapper.attachShadow({ mode: 'closed' });

    // Add styles within shadow DOM
    const styles = document.createElement('style');
    styles.textContent = this.#styles;

    // Create dialog content
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = this.#createDialogContent(content, isError);

    // Add event listeners
    shadow.appendChild(styles);
    shadow.appendChild(dialog);

    // Event handlers
    shadow.querySelector('.close-button').onclick = () => wrapper.remove();
    
    if (!isError) {
      shadow.querySelector('#copy').onclick = () => {
        const text = shadow.querySelector('.textarea').value;
        navigator.clipboard.writeText(text);
        Utils.showNotification('Copied to clipboard');
      };

      shadow.querySelector('#download').onclick = () => {
        const text = shadow.querySelector('.textarea').value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover_letter.txt';
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    document.body.appendChild(wrapper);
  }
}

