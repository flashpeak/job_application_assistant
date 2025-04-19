import Utils from "./utils.js";

class AiManager {
  constructor(storageMan) {
    this.storageMan=storageMan;
  }

  //query the AI server with the specified fields
  //1. sensitive fields are stripped out from the query
  //2.generate the query questions for the specified fields
  queryFieldsToAI(fields, sender, options) {
    let applicant_info = { ...this.storageMan.appData.applicant_info };
    //strip out the sensitive fields
    let sensitive_fields = ["last_name", "first_name", "email", "phone", "street_address", "city", "state", "zip_code", "country"];
    sensitive_fields.forEach(field => delete applicant_info[field]);

    let questions = "";
    for (let i = 0; i < fields.length; i++) {
      let label = fields[i].label.replaceAll("\n", " ");
      if (fields[i].type == "checkbox") {
        label += " (Yes/No)";
      }
      questions += (i + 1) + ". " + label + ":\n";
      if (fields[i].options) {
        for (let j = 0; j < fields[i].options.length; j++) {
          questions += "(" + (j + 1) + ") " + fields[i].options[j] + "\n";
        }
      }
      else if (fields[i].checkboxes) {
        for (let j = 0; j < fields[i].checkboxes.length; j++) {
          questions += "(" + (j + 1) + ") " + fields[i].checkboxes[j].label + "\n";
        }
      }
      else if (fields[i].radios) {
        for (let j = 0; j < fields[i].radios.length; j++) {
          questions += "(" + (j + 1) + ") " + fields[i].radios[j].label + "\n";
        }
      }
    }
    console.log(questions);

    this.queryAI({
      applicant_info: applicant_info,
      fields: questions,
      custom_instructions: this.storageMan.appData.applicant_info_extra.custom_instructions,
      resume: this.storageMan.appData.applicant_info_extra.resume_text,
      action: "fill_fields"
    }).then(data => {
      this.#processAIResponse(data, fields, sender, options);
    });
  }  

  //query the AI server with specified json data and automatic timeout.
  queryAI(json_data) {
    const TIMEOUT_MS = 60000; // 60 second timeout
    
    // Create a new AbortController instance
    const controller = new AbortController();
    
    // Set up a timer that will call controller.abort() after TIMEOUT_MS milliseconds
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch("https://www.slimjet.com/ai/jaa_query.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...json_data,
        version: Utils.getExtensionVersion(),
      }),
      // Pass the AbortController's signal to the fetch request
      signal: controller.signal
    })
    .then(response => {
      // Clear the timeout if we get a response
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Validate response structure
      if (!data || typeof data !== 'object') {
        return {
          error_code: -1,
          error_msg: 'Invalid response'
        };
      }

      this.#processError(data);
      if (data?.response) {
        console.log(data.response);
      }
      return data;
    })
    .catch(error => {
      let errorMsg;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Please try again.';
      } else {
        errorMsg = error.message;
        if (!errorMsg) {
          errorMsg = 'AI Query failed due to unknown error';
        }
      }
      console.log(errorMsg);

      return {
        error_code: -1,
        error_msg: errorMsg
      };
    });
  }  

  //process the ai response from the raw response data and send the response to the content script
  #processAIResponse(data, fields, sender, options) {
    let ai_response = data?.response || "";
    let tokenCount=data?.token_count || 0;
    this.updateTokenCount(tokenCount);
    let questions_answered=this.#parse_ai_response(ai_response, fields);
    Utils.sendMessageToTab(sender.tab.id, {action: "auto_fill_ai_response", fields, options,questions_answered,error_msg:data.error_msg,error_code:data.error_code},{frameId: sender.frameId});
  }  

  //parse the ai response and write the response into the value attribute of the fields array.
  //return the number of questions answered
  #parse_ai_response(ai_response, fields) {
    if (!ai_response) return 0;
    let match=ai_response.match(/^1\./m);
    let numbered=false;
    if (match) {
      numbered=true;
      ai_response=ai_response.substring(match.index);
    }

    //find all alias tags
    let alias_tags=ai_response.match(/@[a-zA-Z0-9_]+/g);
    if (alias_tags) {
      for (let tag of alias_tags) {
        let key=tag.substring(1);
        if (this.storageMan.appData.applicant_info[key]!==undefined) {
          ai_response=ai_response.replace(tag, this.storageMan.appData.applicant_info[key]);
        }
      }  
    }
    let lines=ai_response.split("\n");
    //filter out empty lines
    lines=lines.filter(line=>line.trim()!="");
    let questions_answered=0;
    for (let i=0; i<lines.length && i<fields.length; i++) {
      let line=lines[i];
      line=line.replace(/\\n/g,"\n");
      let answer="";
      if (numbered)
      {
        if (line.match(/^\d+\./)) {
          line=line.replace(/\d+\./,"").trim();
          answer=line;
        }
        else break;
      }
      else
      {
        line=line.trim();
        if (line) {
          answer=line;
        }
      }
      fields[i].value="";
      if (fields[i].options) {
        if (answer.match(/^\d+$/)) {
          let index=parseInt(answer)-1;
          if (index>=0 && index<fields[i].options.length) {
            fields[i].value=fields[i].options[index];
          }
        }
        else fields[i].value=answer;
      }
      else if (fields[i].checkboxes) {
        if (answer.match(/^\d+(; ?\d+)*$/)) {
          let indices=answer.split(";").map(x=>parseInt(x)-1);
          let list=[];
          for (let index of indices) {
            if (index>=0 && index<fields[i].checkboxes.length) {
              list.push(fields[i].checkboxes[index].label);
            }
          }
          fields[i].value=list.join(";");
        }
        else fields[i].value=answer;
      }
      else if (fields[i].radios) {
        if (answer.match(/^\d+$/)) {
          let index=parseInt(answer)-1;
          if (index>=0 && index<fields[i].radios.length) {
            fields[i].value=fields[i].radios[index].label;
          }
        }
        else fields[i].value=answer;
      }
      else {
        fields[i].value=answer;
      }
      if (fields[i].value) {
        questions_answered++;
      }
    }
    //console.log(fields);
    return questions_answered;
  }  

  //process the error from the ai response
  #processError(data) {
    if (!data || data.error_code) { 
      let message="AI Query Error";
      if (data?.error_msg) {
        message+=": "+data.error_msg;
      }
      console.log(message);
    }
  }

  //update the token count for the current day.
  //if the token count is not set for the current day, set it to the token count.
  //if the token count is set for the current day, add the token count to the existing count.
  updateTokenCount(tokenCount) {
    this.storageMan.getStorageSync(["token_count", "token_date"]).then(result => {
      let today = new Date().toISOString().split("T")[0];
      let tokenObject = {};
      
      if (result.token_date !== today) {
        // Reset for new day
        tokenObject.token_count = tokenCount;
        tokenObject.token_date = today;
      } else {
        // Add to existing count
        tokenObject.token_count = tokenCount + (result.token_count || 0);
      }
      
      this.storageMan.setStorageSync(tokenObject);
      console.log(`tokens: query-${tokenCount}, today-${tokenObject.token_count}`);
    });
  }  

  //get the AI assessment for the specified job description
  getAIAssessment(job_description) {
    if (job_description.length == "" || job_description.length > 10000) return;

    this.queryAI({
      action: "job_assessment",
      resume: this.storageMan.appData.applicant_info_extra.resume_text,
      job_description: job_description
    }).then(data => {
      let ai_response = data?.response || "";
      let match_score = 0;
      let assessment = "";

      if (ai_response) {
        let pattern = "Match score:";
        let p = ai_response.indexOf(pattern);
        if (p != -1) {
          let p1 = ai_response.indexOf("\n", p);
          if (p1 != -1) {
            match_score = parseInt(ai_response.substring(p + pattern.length, p1).trim());
          }
        }
        pattern = "Missing skills and experiences:";
        p = ai_response.indexOf(pattern);
        if (p != -1) {
          assessment = ai_response.substring(p + pattern.length).trim();
        }
      }
      let tokenCount=data?.token_count || 0;
      this.updateTokenCount(tokenCount);
      Utils.browserAPI().tabs.query({active: true, currentWindow: true}, tabs => {
        Utils.sendMessageToTab(tabs[0].id, {
          action: "job_assessment_ai_response",
          assessment: assessment,
          match_score: match_score,
          error_msg: data.error_msg || ""
        },{frameId:0});
      });
    });
  }

  //generate a cover letter given the specified job description
  generateCoverLetter(job_description) {
    if (job_description.length == "" || job_description.length > 10000) return;

    this.queryAI({
      job_description: job_description,
      resume: this.storageMan.appData.applicant_info_extra.resume_text,
      action: "cover_letter"
    }).then(data => {
      let coverLetter = data?.response || "";
      if (coverLetter) {
        coverLetter = "Dear Hiring Manager,\n\n" + coverLetter + 
                      "\n\nBest regards,\n" + this.storageMan.appData.applicant_info.first_name + " " + this.storageMan.appData.applicant_info.last_name;
      }
      let tokenCount=data?.token_count || 0;
      this.updateTokenCount(tokenCount);
      // Send directly to content script instead of popup
      Utils.browserAPI().tabs.query({active: true, currentWindow: true}, tabs => {
        Utils.sendMessageToTab(tabs[0].id, {
          action: "cover_letter_ai_response",
          content: coverLetter,
          error_msg: data.error_msg || ""
        },{frameId:0});
      });
    });
  }  
}

export default AiManager;