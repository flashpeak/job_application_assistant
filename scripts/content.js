const gBrowserAPI = Utils.browserAPI();
let gUnfilledFields=null;
const gStorageManager=new StorageManager();
const gAIBusyStateManager = new AIBusyStateManager();
const gFullyAutoFillTrigger = new FullyAutoFillTrigger(gStorageManager,fullyAutoFillCallback);

// preAIQueryCheck: Validates if AI query can be made by checking required fields and AI busy state
// @param {boolean} silent - If true, suppresses alert messages
// @returns {Promise<boolean>} - Returns true if AI query can proceed, false otherwise
// Checks:
// 1. Required applicant fields are filled
// 2. AI is not currently busy
// 3. Daily token quota not exceeded
async function preAIQueryCheck(silent) {
  await gStorageManager.loadDataOptions();
  if (!checkRequiredFields()) {
    if (!silent) {
      alert("Please fill in all required fields in the applicant information and options page first.");
      //open options page
      gBrowserAPI.runtime.sendMessage({action: "open_options_page"});
    }
    return false;
  }
  if (gAIBusyStateManager.getBusyState()) {
    if (!silent) {
      alert("Please wait for last AI response to finish.");
    }
    return false;
  }

  const today = new Date().toISOString().split("T")[0];
  
  if (gStorageManager.appData.token_date === today && (gStorageManager.appData.token_count || 0) >= 100000) {
    if (!silent) {
      alert("You have used up your daily quota of tokens. Try again tomorrow.");
    }
    return false;
  }
  
  return true;
}


// Handles messages sent from child frames to the main script to update busy state messages.
// busy state message must be displayed in the main frame so that it can
// positioned in the bottom right corner of the web page.
window.addEventListener('message', function(event) {
  if (event.data?.action === "show_busy_message_in_main") {
    gAIBusyStateManager.setAIBusyMessage(event.data.message);
  }
});

// checkRequiredFields: Validates if all required fields are filled
// @returns {boolean} - Returns true if all required fields are filled, false otherwise
function checkRequiredFields() {
  if (!gStorageManager.appData.applicant_info) return false;
  let requiredFields = ['first_name', 'last_name', 'email', 'phone'];
  for (let field of requiredFields) {
    if (!gStorageManager.appData.applicant_info[field]) {
      return false;
    }
  }
  if (!gStorageManager.appData.resume_valid) {
    return false;
  }
  return true;
}

//Handles messages sent from the background script to the content script.
gBrowserAPI.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  let action=request.action;

  //Handles auto fill AI response.
  if (action === "auto_fill_ai_response") {
    let filled=0;
    gAIBusyStateManager.setAIBusyMessage();
    if (request.error_msg) {
      Utils.showNotification(request.error_msg,true);
      return;
    }
    for (let i=0;i<gUnfilledFields.length;i++) {
      if (request.fields[i].value) {
        await FormFiller.fillField(gUnfilledFields[i],request.fields[i].value);
        filled++;
      }
    }
  }
  //Handles cover letter AI response.
  else if (action === "cover_letter_ai_response") {
    gAIBusyStateManager.setAIBusyMessage();
    if (request.error_msg) {
      CoverLetter.showCoverLetterDialog(request.error_msg, true);
    } else {
      CoverLetter.showCoverLetterDialog(request.content || "Cover letter generation failed.");
    }
  } 
  //Handles job assessment AI response.
  else if (request.action === "job_assessment_ai_response") {
    gAIBusyStateManager.setAIBusyMessage();
    if (request.error_msg || !request.assessment) {
      alert(request.error_msg || "Job assessment generation failed.");
    } else {
      JobAssessment.showJobAssessment(request.match_score, request.assessment);
    }
  }    
  //Handles field extraction.
  else if (action === "extract") {
    let fields = await FieldExtractor.findAllFields();
    if (fields.length>0) {
      console.log("Fields found:", fields);
    }
  }
  //Handles field filling.
  else if (action === "fill" || action === "fill_local") {
    preAIQueryCheck(false).then(async (result)=>{
      if (!result) return;
      gUnfilledFields=await FormFiller.fillAllFields(gStorageManager.appData.applicant_info);
      if (gUnfilledFields.length>0 && action!="fill_local") {
        autoFillAIQuery();
      }
    });
  }
  //Handles cover letter generation.
  else if (action=="generate_cover_letter") {
    preAIQueryCheck(false).then((result)=>{
      if (!result) return;
      let job_description=JobDescriptionExtractor.extractJobDescription();
      if (!job_description) return;
      gAIBusyStateManager.setAIBusyMessage("Generating cover letter...");
      gBrowserAPI.runtime.sendMessage({action: "cover_letter_ai_query", job_description});
    });
  }
  //Handles job assessment generation.
  else if (action=="generate_job_assessment") {
    preAIQueryCheck(false).then((result)=>{
      if (!result) return;
      let job_description=JobDescriptionExtractor.extractJobDescription();
      if (!job_description) return;
      gAIBusyStateManager.setAIBusyMessage("Assesing job against your resume...");
      gBrowserAPI.runtime.sendMessage({action: "job_assessment_ai_query", job_description});
    });
  }
  //Handles filling a field.
  else if (action === "fill_field") {
    preAIQueryCheck(false).then((result)=>{
      if (!result) return;
      autoFillTextElement(document.activeElement,gStorageManager.appData.applicant_info);
    });
  }
});

//Do every initialization here after the content script is injected.
function initialize() {
  //automatically fill the application form when the page is loaded.
  gFullyAutoFillTrigger.autoFillUponTrigger("page_load");
}

initialize();

//intercept middle click event inside input elements or textareas
document.addEventListener("mousedown", function(event) {
  //intercept middle click event
  if (event.button == 1) {
    let element=document.elementFromPoint(event.clientX, event.clientY);
    //if the element is an input or textarea or ctrl key is pressed
    if (element && (element.tagName=="INPUT" || element.tagName=="TEXTAREA") || event.ctrlKey) {
      //prevent the default action
      event.preventDefault();
      //check if the ai query can be made
      preAIQueryCheck(false).then((result)=>{
        if (!result) return;
        //if ctrl key is pressed, fill all fields
        if (event.ctrlKey) {
          FormFiller.fillAllFields(gStorageManager.appData.applicant_info).then(function(fields) {
            gUnfilledFields=fields;
            if (gUnfilledFields.length>0) {
              autoFillAIQuery();
            }
          });
        }
        //if ctrl key is not pressed, fill the current field
        else {
          autoFillTextElement(element,gStorageManager.appData.applicant_info);
        }
      });
    }
  }
});

//Send request to the background script to fill the fields with AI.
function autoFillAIQuery(options={}) {
  if (gUnfilledFields.length>0) {
    gAIBusyStateManager.setAIBusyMessage("Filling fields...");
    gBrowserAPI.runtime.sendMessage({action: "auto_fill_ai_query", fields: dropElementFromFields(gUnfilledFields), options});
  }
}

function dropElementFromFields(fields) {
  return JSON.parse(JSON.stringify(fields));
}

function autoFillTextElement(element,applicantInfo) {
  let label=LabelLocator.findAssociatedLabel(element);
  if (label) {
    let field={label: label, element: element};
    let value=LocalFieldParser.getFieldValue(field, applicantInfo);
    if (!value) {
      gUnfilledFields=[field];
      autoFillAIQuery();
    }
    else {
      FormFiller.fillField(field,value);
    }
  }
  else {
    alert("No label found");
  }  
}

//This function is called when the application form is automatically filled without user initiation.
//It is passed to the FullyAutoFillTrigger object.
function fullyAutoFillCallback() {
  if (!FieldExtractor.getRootElement()) return;
  preAIQueryCheck(true).then((result)=>{
    if (!result) return;
    FormFiller.fillAllFields(gStorageManager.appData.applicant_info).then(function(fields) {
      gUnfilledFields=fields;
      autoFillAIQuery();
    });
  });
}

