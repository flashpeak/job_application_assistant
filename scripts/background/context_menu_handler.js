import Utils from "./utils.js";

class ContextMenuHandler {
  constructor(storageMan) {
    this.storageMan=storageMan;
    // Handle context menu clicks
    Utils.browserAPI().contextMenus.onClicked.addListener(async (info, tab) => {
      await this.storageMan.loadApplicantData();
      //forward the message to the specified tab
      Utils.sendMessageToTab(tab.id, {
        action: info.menuItemId
      }, {
        frameId: info.frameId
      });
    });    
  }

  //create the context menus
  createContextMenus() {
    Utils.browserAPI().contextMenus.removeAll();
    // Create a parent context menu item
    Utils.browserAPI().contextMenus.create({
      id: "jobAssistantMenu",
      title: "Job Assistant",
      contexts: ["all"],  // Shows in all contexts
      documentUrlPatterns: ["http://*/*", "https://*/*", "file:///*"]
    });

    Utils.browserAPI().contextMenus.create({
      id: "fill_field",
      parentId: "jobAssistantMenu",
      title: "Fill this Field (Middle Click)",
      contexts: ["editable"],
      documentUrlPatterns: ["http://*/*", "https://*/*", "file:///*"]
    });  

    Utils.browserAPI().contextMenus.create({
      id: "fill",
      parentId: "jobAssistantMenu",
      title: "Fill All Fields (Ctrl+Middle Click)",
      contexts: ["all"],
      documentUrlPatterns: ["http://*/*", "https://*/*", "file:///*"]
    });

  }
}  

export default ContextMenuHandler;