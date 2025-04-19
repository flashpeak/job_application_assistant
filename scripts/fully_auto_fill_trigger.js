//FullyAutoFillTrigger: this class manages the behavior when the application form is automatically filled without user
//selecting "Fill Fields" from the menu. This is only supported for selected sites.
class FullyAutoFillTrigger {
  constructor(storageManager,fullyAutoFillCallback) {
    this.storageManager=storageManager;
    this.fullyAutoFillCallback=fullyAutoFillCallback;

    //Automatically fill fields when a button is clicked.
    document.addEventListener('click', (event)=>{
      if (window!==window.top) return;
      let element = event.target;
      
      // Check if clicked element is a button
      if (Utils.isButton(element) || Utils.isButton(element.parentElement)) {
        this.autoFillUponTrigger("button_click");
      }
    }, true); 
    
    this.lastUrl = location.href; 
    new MutationObserver(() => {
      const url = location.href;
      if (url !== this.lastUrl) {
        this.lastUrl = url;
        this.autoFillUponTrigger("url_change");
      }
    }).observe(document, {subtree: true, childList: true});    
  }

  //autoFillUponTrigger: Automatically fill the application form when a trigger event occurs.
  //@param {string} trigger - The trigger event.
  autoFillUponTrigger(trigger) {
    this.storageManager.loadAutoFillSettings().then(()=>{
      if (!this.storageManager.autoFill) return;
      let autoApplyData=this.getAutoFillData();
      for (let i=0;i<autoApplyData.length;i++) {
        let data=autoApplyData[i];
        let pattern=data.url_pattern;
        if (typeof pattern=="string") {
          pattern=[pattern];
        }
        if (pattern.some(p=>Utils.matchWildcard(window.location.href, p))) {
          if (trigger==data.trigger) {
            setTimeout(this.fullyAutoFillCallback, data.delay || 0);
          }
        }
      }
    });
  }  

  //url_pattern is a wildcard pattern for the url. 
  //trigger is the event that triggers the auto apply.
  //type of trigger:
  //  button_click: when a button is clicked.
  //  url_change: when the url changes.
  //  page_load: when the page is loaded.
  //delay is the delay in milliseconds before auto filling the application form.
  getAutoFillData() {
    return [
      {
        url_pattern: "//www.linkedin.com/jobs",
        trigger: "button_click",
        delay: 1000
      },
      {
        url_pattern: "//smartapply.indeed.com/*/indeedapply/form",
        trigger: "url_change",
        delay: 1000
      },
      {
        url_pattern: "//job-boards.greenhouse.io",
        trigger: "page_load"
      },
    ]
  }  
}
