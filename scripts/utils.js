
class Utils {


  static isFirefox() {
    const agent=navigator.userAgent.toLowerCase();
    return agent.indexOf("firefox") > -1;
  }

  static browserAPI() {
    return this.isFirefox() ? browser : chrome;
  }

  static elementMouseDown(element) {
    element.dispatchEvent(this.getMouseEvent("mousedown"));
  }

  static elementMouseUp(element) {
    element.dispatchEvent(this.getMouseEvent("mouseup"));
  }

  static getMouseEvent(type) {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
    });
  }  

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper function to show notifications
  static showNotification(message) {
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
    styles.textContent = `
      .notification {
        padding: 12px 24px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-out 4.7s;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
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

      @keyframes fadeOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }
    `;

    // Create notification content
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    // Add everything to shadow DOM
    shadow.appendChild(styles);
    shadow.appendChild(notification);

    // Add to page
    document.body.appendChild(wrapper);

    // Remove after animation completes (5 seconds)
    setTimeout(() => {
      wrapper.remove();
    }, 5000);

    return wrapper;
  }

  static matchWildcard(str, pattern) {
    // Escape special RegExp characters from the pattern, then replace '*' and '?' with RegEx equivalents
    const regexPattern = pattern
      .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // Escape special RegEx characters
      .replace(/\*/g, '.*') // Convert '*' to '.*' (match zero or more characters)
      .replace(/\?/g, '\\?'); // Convert '?' to '\?' (to match literal '?')
  
    // Create a RegExp object without start (^) and end ($) anchors for partial matching
    const regex = new RegExp(regexPattern); 
  
    // Test if the pattern is found anywhere in the string
    return regex.test(str);
  }  

  static isButton(element) {
    if (!element) return false;
    return element.tagName === 'BUTTON' ||
        (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button'));
  }  
}