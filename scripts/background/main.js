import {DEBUG} from "../config.js"
import Utils from "./utils.js";
import StorageMan from "./storage_man.js";
import AiManager from "./ai_manager.js";
import ContextMenuHandler from "./context_menu_handler.js";

const gStorageMan=new StorageMan();
const gAiManager=new AiManager(gStorageMan);
const gContextMenuHandler=new ContextMenuHandler(gStorageMan);
const gBrowserAPI=Utils.browserAPI();


//process messages sent from the popup or the content script
gBrowserAPI.runtime.onMessage.addListener(async (request, sender) => {
  await gStorageMan.loadApplicantData();
  let action=request.action;
  if (action=="auto_fill_ai_query") {
    if (request.fields.length>0) {
      gAiManager.queryFieldsToAI(request.fields,sender,request.options);
    }
  }
  else if (action=="open_options_page") {
    gBrowserAPI.runtime.openOptionsPage();
  }
  else if (action=="toggle_auto_fill") {
    gStorageMan.getStorageSync("enable_auto_fill").then(result => {
      let enable_auto_fill=result.enable_auto_fill;
      if (enable_auto_fill) {
        gStorageMan.setStorageSync({enable_auto_fill: false});
      }
      else {
        gStorageMan.setStorageSync({enable_auto_fill: true});
      }
    });
  }
  else if (action=="fill" || action=="extract" || action=="fill_local" 
    || action=="generate_job_assessment" || action=="generate_cover_letter") {
    let options={};
    if (action=="generate_job_assessment" || action=="generate_cover_letter") {
      options.frameId=0;
    }
    
    //send message to the active tab
    gBrowserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
      Utils.sendMessageToTab(tabs[0].id, request, options);
    });
  }
  else if (action=="cover_letter_ai_query") {
    gAiManager.generateCoverLetter(request.job_description);
  }
  else if (action=="job_assessment_ai_query") {
    gAiManager.getAIAssessment(request.job_description);
  }
});



// Listen for extension installation
gBrowserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open tutorial page when extension is first installed
    gBrowserAPI.tabs.create({
      url: 'https://www.slimjet.com/job-application-assistant/manual.php?version='+Utils.getExtensionVersion()
    });
  }
  gContextMenuHandler.createContextMenus();
});

