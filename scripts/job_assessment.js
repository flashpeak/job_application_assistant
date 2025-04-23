// Functions for handling job assessment UI and functionality

class JobAssessment {
  static #DIALOG_HTML = `
    <div id="job_assessment_dialog" style="display:none;">
      <div class="dialog-header">
        <h2>AI Assessment for this job</h2>
        <button class="close-button">×</button>
      </div>
      <div class="dialog-content">
        <div class="score-container">
          <div>Match score: <span id="ai_matching_score"></span></div>
          <div id="matching_score_bar"><div id="score_fill"></div></div>
        </div>
        <p>Missing skills and experience:</p>
        <p id="job_assessment"></p>
      </div>
    </div>
  `;

  static #DIALOG_CSS = `
    /* Reset inherited styles */
    #job_assessment_dialog {
      position: fixed;
      bottom: 20px;
      right: 20px;
      transform: none;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
      /* Explicitly set text color to prevent inheritance */
      color: #333;
      /* Reset other inherited properties */
      font-size: 16px;
      line-height: 1.5;
      text-align: left;
    }

    /* Ensure all text elements have explicit colors */
    #job_assessment_dialog h2,
    #job_assessment_dialog p,
    #job_assessment_dialog div,
    #job_assessment_dialog span {
      color: inherit;
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
      margin-bottom: 20px;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0 5px;
      color: #333;
    }

    .score-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    #matching_score_bar {
      flex: 1;
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
    }

    #score_fill {
      height: 100%;
      transition: width 0.5s ease-in-out, background-color 0.5s ease-in-out;
    }
  `;

  static #setMatchingScore(score, shadowRoot) {
    // Convert score from 1-10 to percentage
    const percentage = (score * 10);
    
    // Update score text
    shadowRoot.getElementById('ai_matching_score').textContent = `${score}/10`;
    
    // Update score bar
    const scoreFill = shadowRoot.getElementById('score_fill');
    const hue = (percentage * 1.2); // multiply by 1.2 to get to green (120) at around 8.5/10
    scoreFill.style.backgroundColor = `hsl(${hue}, 80%, 45%)`;
    scoreFill.style.width = `${percentage}%`;
  }

  static showJobAssessment(score, assessment) {
    // Create a container for the shadow DOM if it doesn't exist
    let container = document.getElementById('job_assessment_container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'job_assessment_container';
      document.body.appendChild(container);
    }

    // Create shadow root if it doesn't exist
    let shadowRoot = container.shadowRoot;
    if (!shadowRoot) {
      shadowRoot = container.attachShadow({ mode: 'open' });
      
      // Add styles to shadow DOM
      const style = document.createElement('style');
      style.textContent = this.#DIALOG_CSS;
      shadowRoot.appendChild(style);
      
      // Add dialog HTML to shadow DOM
      const div = document.createElement('div');
      div.innerHTML = this.#DIALOG_HTML;
      const dialog = div.firstElementChild;
      shadowRoot.appendChild(dialog);
      
      // Add close button handler
      dialog.querySelector('.close-button').addEventListener('click', () => {
        dialog.style.display = 'none';
      });
    }

    // Get the dialog from shadow DOM
    const dialog = shadowRoot.getElementById('job_assessment_dialog');
    
    // Update content
    dialog.querySelector('#job_assessment').textContent = assessment;
    this.#setMatchingScore(score, shadowRoot);
    dialog.style.display = 'block';
  }
}
