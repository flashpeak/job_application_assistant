class Utils {
  //send message to specified tab, if fails, inject the content script and retry
  //it fails when the extension has been reloaded after the tab has been created.
  static sendMessageToTab(tabId, message, options={}, callback=null) {
    this.browserAPI().tabs.sendMessage(tabId, message, options)
      .then(response => {
        if (callback) callback(response);
      })
      .catch(error => {
        // If message fails, try injecting content script and retry
        this.#injectContentScript(tabId, () => {
          // Retry sending the message after injection
          this.browserAPI().tabs.sendMessage(tabId, message, options)
            .then(response => {
              if (callback) callback(response);
            })
            .catch(error => {
              console.error('Failed to send message after content script injection:', error);
              if (callback) callback(null);
            });
        });
      });  
  }

  //inject the content script into specified tab
  static #injectContentScript(tabId,callback) {
    //list of content scripts. used to inject the content scripts into the specified tab when the extension context is invalidated due to reloading.
    const contentScripts = [
      "scripts/utils.js",
      "scripts/ai_busy_state_man.js",
      "scripts/label_locator.js",
      "scripts/field_extractor.js",
      "scripts/local_field_parser.js",
      "scripts/form_filler.js",
      "scripts/job_description_extractor.js",
      "scripts/cover_letter.js",
      "scripts/job_assessment.js",
      "scripts/fully_auto_fill_trigger.js",
      "scripts/storage_man.js",
      "scripts/content.js"  
    ]; 

    this.browserAPI().scripting.executeScript({
      target: { tabId: tabId },
      files: contentScripts
    }, () => {
      if (this.browserAPI().runtime.lastError) {
        console.error(this.browserAPI().runtime.lastError);
      } else {
        if (callback) callback();
      }
    });
  }

  static isFirefox() {
    const agent=navigator.userAgent.toLowerCase();
    return agent.indexOf("firefox") > -1;
  }

  static browserAPI() {
    return this.isFirefox() ? browser : chrome;
  }  

  static getExtensionVersion() {
    return this.browserAPI().runtime.getManifest().version;
  }  
}

export default Utils;