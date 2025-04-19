//this file keeps obsolete code that is not used anymore but kept in case of future use.

function clickSubmitButton() {
  if (!clickButton("^submit,^apply,^continue$,^finish$,^next$,^review$")) {
    return clickAnchor("apply,apply now,apply this job,submit application,apply job");
  }
  return true;
}

function clickButton(patterns) {
  let pattern_list=patterns.split(",");
  // Find all button elements
  const buttons = document.querySelectorAll('button,input[type="submit"],input[type="button"]');
  
  // Iterate through buttons and click the one with text "Submit"
  buttons.forEach(button => {
    for (let pattern of pattern_list) {
      let label;
      if (button.tagName=="INPUT")
        label=button.value.trim();
      else
        label=button.textContent.trim();
      if (button.textContent.trim().match(new RegExp(pattern,"i"))) {
        button.click();
        return true; // Exit once the button is clicked
      }
    }
  });
  return false;
}

function clickAnchor(labels) {
  let label_list=labels.split(",");
  const anchors = document.querySelectorAll('a');
  anchors.forEach(anchor => {
    for (let label of label_list) {
      if (anchor.innerText.trim().toLowerCase()==label.toLowerCase()) {
        anchor.click();
        return true;
      }
    }
  });
}

//attach a file to the specified tab
function attachFile(tab, fileInput) {
  // First attach debugger
  gBrowserAPI.debugger.attach({tabId: tab.id}, "1.2", () => {
    if (gBrowserAPI.runtime.lastError) {
      console.error(gBrowserAPI.runtime.lastError);
      return;
    }

    // Get document root
    gBrowserAPI.debugger.sendCommand({tabId: tab.id}, "DOM.getDocument", {}, (root) => {
      // Query for the file input element
      gBrowserAPI.debugger.sendCommand({tabId: tab.id}, "DOM.querySelector", {
        nodeId: root.root.nodeId,
        selector: 'input[type="file"]'  // CSS selector to find file input
      }, (result) => {
        if (result && result.nodeId) {
          // Now we can set the file
          gBrowserAPI.debugger.sendCommand({tabId: tab.id}, "DOM.setFileInputFiles", {
            nodeId: result.nodeId,  // Use the found nodeId
            files: ["e:/downloads/johndoe.yaml"]
          }, () => {
            gBrowserAPI.debugger.detach({tabId: tab.id});
          });
        }
      });
    });
  });
}