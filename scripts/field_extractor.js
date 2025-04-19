class FieldExtractor {
  static getRootElement() {
    let rootElement = document.body;
    if (document.location.href.includes("//www.linkedin.com/jobs/"))
      rootElement = document.querySelector("div[data-test-modal]");
    return rootElement;
  }

  static #isGoogleForm() {
    return document.location.href.includes("//docs.google.com/forms") || document.location.href.includes("//forms.gle/");
  }

  static #isGreenhouseSite() {
    return document.location.hostname.includes("job-boards.greenhouse.io") || document.location.hostname.includes("boards.greenhouse.io");
  }

  static isWorkdayjobsSite() {
    return document.location.hostname.includes("myworkdayjobs.com");
  }

  static #isAmazonJobsSite() {
    return document.location.hostname.includes("amazon.jobs");
  }

  static #isElementVisible(element) {
    if (element.hidden) {
      return false;
    }

    if (element.offsetWidth <= 1 && element.offsetHeight <= 1) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' && !element.type=="checkbox") {
      return false;
    }

    return true;
  }

  static isTextElement(element) {
    return this.isTextInputElement(element) || element.tagName=="TEXTAREA";
  }

  static isTextInputElement(element) {
    return element.tagName=="INPUT" && ["text","email","tel","number","date","url"].includes(element.type);
  }

  static #isEmptySelectLabel(label) {
    label = label.trim().toLowerCase();
    if (label == "") return true;
    if (label=="? undefined:undefined ?") return true;
    if (label.match(/^-+$/)) return true;
    const pattern = /^(please )?(select|choose|pick)\b/;
    return pattern.test(label);
  }

  static async findAllFields(applicantInfo=null) {
    if (!this.getRootElement()) return [];
    let fields = this.#findTextOrSelectFields();
    if (this.#isGoogleForm()) {
      let googleFormFields = this.#findGoogleFormRadioGroups();
      fields = fields.concat(googleFormFields);
    }
    let radioGroups = this.#findRadioGroups();
    fields = fields.concat(radioGroups);
    let checkboxGroups = this.#findCheckboxGroups();
    fields = fields.concat(checkboxGroups);
    if (this.isWorkdayjobsSite()) {
      let workdaySelectFields = await this.#findWorkdaySelectFields(applicantInfo);
      fields = fields.concat(workdaySelectFields);
    }
    if (this.#isGreenhouseSite()) {
      let greenhouseSelectFields = await this.#getGreenHouseSelectFields();
      fields = fields.concat(greenhouseSelectFields);
    }
    if (document.location.hostname.includes("jobs.careers.microsoft.com")) {
      let microsoftSelectFields = await this.#findMicrosoftSelectFields();
      fields = fields.concat(microsoftSelectFields);
    }
    if (this.#isAmazonJobsSite()) {
      let amazonSelectFields = await this.#findAmazonSelectFields();
      fields = fields.concat(amazonSelectFields);
    }

    //add more detailed information to title and company fields for indeed apply site so that AI won't get lost.
    if (document.location.href.includes("indeedapply/form/resume-module/relevant-experience") && fields.length==2) {
      if (fields[0].label=="job title" && fields[1].label=="company") {
        fields[0].label="Your current or latest job title";
        fields[1].label="Your current company or latest company you worked at";
      }
    }
    return fields;
  }

  static #findClassInAncestors(element, className) {
    element = element.parentElement;
    while (element) {
      if (element.classList.contains(className)) return element;
      element = element.parentElement;
    }
    return null;
  }

  static #isIgnoredTextFields(textLabel,element) {
    if (this.isWorkdayjobsSite()) {
      let ignoredLabels=["Employee ID (if applicable)"];
      if (ignoredLabels.some(label => textLabel.toLowerCase()==label.toLowerCase())) return true;
      let automationId=element.getAttribute("data-automation-id");
      if (automationId) {
        let ignoredIds=["dateSectionMonth-input", "dateSectionDay-input", "dateSectionYear-input"];
        if (ignoredIds.some(id => automationId==id)) return true;
      }
    }
    return false;
  }

  static #findGoogleFormRadioGroups() {
    const radioGroups = document.querySelectorAll('div[role="radiogroup"]');
    let radioGroupsInfo = [];
    let noLabelElements = [];

    radioGroups.forEach((group) => {
      const promptId = group.getAttribute('aria-labelledby').split(" ")[0];
      const promptLabel = document.getElementById(promptId);
      
      if (promptLabel) {
        radioGroupsInfo.push({
          label: promptLabel.innerText.trim(),
          radios: []
        });
        const radioOptions = group.querySelectorAll('div[role="radio"]');
        radioOptions.forEach((radio) => {
          radioGroupsInfo[radioGroupsInfo.length-1].radios.push({label: radio.getAttribute('aria-label'), element: radio});
        });
      }
      else
        noLabelElements.push(group);
    });
    if (noLabelElements.length>0) {
      console.log("No label google form radio groups: ", noLabelElements);
    }
    return radioGroupsInfo;
  }

  static #findRadioGroups() {
    let rootElement = this.getRootElement();
    if (!rootElement) return [];
    const radioButtons = rootElement.querySelectorAll('input[type="radio"]');
    let lastName = "";
    let radioGroupLabel = "";
    let radioGroups = [];
    let noLabelElements = [];
    radioButtons.forEach(radio => {
      if (!radio.name) return;
      let sameGroup = radio.name == lastName;
      if (document.location.href=="https://assessments.globalpros.ai/candidate-assessment" && radio.name.includes("-") && lastName.includes("-"))
        sameGroup = sameGroup || radio.name.substring(0,radio.name.indexOf("-"))==lastName.substring(0,lastName.indexOf("-"));
      if (!sameGroup) {
        radioGroupLabel = LabelLocator.findRadioGroupLabel(radio);
        if (!radioGroupLabel) radioGroupLabel = "Select one option:";
        let radioLabel = LabelLocator.getRadioLabel(radio);
        if (!radioLabel) noLabelElements.push(radio);
        else
          radioGroups.push({label: radioGroupLabel, radios: [{label:radioLabel, element: radio}]});
        lastName = radio.name;
      }
      else {
        let radioLabel = LabelLocator.getRadioLabel(radio);
        if (!radioLabel) noLabelElements.push(radio);
        else
          radioGroups[radioGroups.length-1].radios.push({label: radioLabel, element: radio});
      }
    });
    if (document.location.href!="https://assessments.globalpros.ai/candidate-assessment")
      radioGroups = radioGroups.filter(group => group.radios.every(radio => !radio.element.checked));
    if (noLabelElements.length>0) {
      console.log("No label radio elements: ", noLabelElements);
    }
    return radioGroups;
  }

  static #findCheckboxGroups() {
    let checkboxes;
    let rootElement = this.getRootElement();
    if (!rootElement) return [];
    if (this.#isGoogleForm())
      checkboxes = rootElement.querySelectorAll('div[role="checkbox"]');
    else
      checkboxes = rootElement.querySelectorAll('input[type="checkbox"]');
    let checkboxGroupLabel = "";
    let checkboxGroup = null;
    let checkboxGroups = [];
    let noLabelElements = [];
    for (let i=0; i<checkboxes.length; i++) {
      if (!this.#isElementVisible(checkboxes[i])) continue;
      if (i==0 || !this.#isSameGroup(checkboxes[i-1], checkboxes[i]) || checkboxGroupLabel=="") {
        checkboxGroupLabel = LabelLocator.findAssociatedLabel(checkboxes[i]);
        let isGroup = i<checkboxes.length-1 && this.#isSameGroup(checkboxes[i], checkboxes[i+1]) && checkboxGroupLabel!="";
        if (!isGroup) {
          let checkboxLabel = LabelLocator.getCheckboxLabel(checkboxes[i]);
          if (checkboxLabel) {
            if (!this.#isIgnoredCheckbox(checkboxLabel) && !checkboxes[i].checked)
              checkboxGroups.push({label: checkboxLabel, element: checkboxes[i], type: "checkbox"});
          }
          else
            noLabelElements.push(checkboxes[i]);
          continue;
        }
        if (checkboxGroupLabel) {
          let checkboxLabel = LabelLocator.getCheckboxLabel(checkboxes[i]);
          checkboxGroup = {label: checkboxGroupLabel, 
            checkboxes: [{label: checkboxLabel, element: checkboxes[i]}]};
          checkboxGroups.push(checkboxGroup);
        }
        else
          noLabelElements.push(checkboxes[i]);
      }
      else {
        if (checkboxGroupLabel)
          checkboxGroup.checkboxes.push({label: LabelLocator.getCheckboxLabel(checkboxes[i]), element: checkboxes[i]});
        else
          noLabelElements.push(checkboxes[i]);
      }
    }
    checkboxGroups = checkboxGroups.filter(group => 
      !group.checkboxes || group.checkboxes.every(checkbox => !checkbox.element.checked)
    );
    
    if (noLabelElements.length>0) {
      console.log("No label checkbox elements: ", noLabelElements);
    }
    return checkboxGroups;
  }

  static #isSameGroup(checkbox1, checkbox2) {
    let rect1 = checkbox1.getBoundingClientRect();
    let rect2 = checkbox2.getBoundingClientRect();
    if (Math.abs(rect1.left-rect2.left)>=5 || Math.abs(rect2.right-rect1.right)>=5) return false;
    if (rect2.top<rect1.bottom+50) return true;
    if (rect2.top>rect1.bottom+50 && rect2.bottom<rect1.top+100 && !LabelLocator.textBetweenCheckboxes(checkbox1, checkbox2)) return true;
    return false;
  }

  static #isIgnoredCheckbox(checkboxLabel) {
    let ignoredLabels = ["I currently work here","Mark job as a top choice job"];
    return ignoredLabels.some(label => checkboxLabel.toLowerCase()==label.toLowerCase());
  }

  static async #findMicrosoftSelectFields() {
    const fields = [];
    const selects = document.querySelectorAll('div[role="combobox"]');
    for (let select of selects) {
      let label = select.getAttribute("aria-label");
      if (!label) return;
      if (!select.innerText.toLowerCase().includes("select") && select.innerText!="") continue;
      select.click();
      await Utils.sleep(500);
      let options = document.querySelectorAll('button[role="option"]');
      let optionsText = [];
      options.forEach(option => {
        optionsText.push(option.innerText.trim());
      });
      select.click();
      fields.push({label: label, options: optionsText, element: select, type: "select_microsoft"});
    }
    return fields;
  }

  static async #findWorkdaySelectFields(applicantInfo=null) {
    const buttons = document.querySelectorAll('button[aria-haspopup="listbox"]');
    let fields = [];
    
    for (const button of buttons) {
      let buttonText = button.textContent.trim().toLowerCase();
      if (!buttonText.includes("select one") && buttonText!="") continue;
      let label = document.querySelector('label[for="'+button.id+'"]');
      let field = {};
      if (label) {
        field.label = label.textContent;
      }
      else {
        field.label = LabelLocator.findAssociatedLabel(button);
        if (!field.label) continue;
      }   
      field.element = button;
      field.type = "select_workday";
      field.options = [];
      
      button.click();
      await Utils.sleep(500);
      
      document.querySelectorAll('li[role="option"]').forEach(li => {
        field.options.push(li.textContent);
      });
      let filled = false;
      if (applicantInfo) {
        let value = LocalFieldParser.getFieldValue(field,applicantInfo);
        if (value) {
          filled = true;
          document.querySelectorAll('li[role="option"]').forEach(li => {
            if (li.textContent.trim()==value) li.click();
          });
        }
      }
      if (!filled) button.click();
      if (!filled) fields.push(field);
    }
    return fields;
  }

  static async #findAmazonSelectFields() {
    const selectDivs = document.querySelectorAll('div.drop-down-menu-select');
    let fields = [];
    for (let selectDiv of selectDivs) {
      let selectSpan = selectDiv.querySelector('span.select2-selection__rendered');
      if (!selectSpan) continue;
      let selectSpanText = selectSpan.innerText.trim().toLowerCase();
      if (!this.#isEmptySelectLabel(selectSpanText)) continue;
      let label = LabelLocator.findAssociatedLabel(selectDiv);
      if (!label) continue;
      Utils.elementMouseDown(selectSpan);
      await Utils.sleep(500);
      let options = document.querySelectorAll('li.select2-results__option');
      let optionsText = [];
      for (let option of options) {
        optionsText.push(option.innerText.trim().toLowerCase());
      }
      let field = {label: label, element: selectDiv, type: "select_amazon", options: optionsText};
      fields.push(field);
      Utils.elementMouseDown(selectSpan);
      await Utils.sleep(500);
    }
    return fields;
  }

  static async #getGreenHouseSelectFields() {
    let selectDivs = document.querySelectorAll("div.select__container");
    let fields = [];
    for (let selectDiv of selectDivs) {
      let dropdownButton = selectDiv.querySelector("button");
      if (!dropdownButton) continue;
      let selectControl = selectDiv.querySelector("div.select__control");
      if (!selectControl) continue;
      let selectSingleValue = selectControl.querySelector("div.select__single-value");
      if (selectSingleValue) continue;
      let label = selectDiv.querySelector("label").innerText.trim();
      if (label.trim()=="") continue;
      Utils.elementMouseUp(selectControl);
      await Utils.sleep(100);
      let dropdownMenu = selectDiv.querySelector("div.select__menu");
      if (dropdownMenu) {
        let options = [];
        dropdownMenu.querySelectorAll("div.select__option").forEach(option => {
          options.push(option.innerText.trim());
        });
        fields.push({label: label, options: options, type: "select_greenhouse",element: selectDiv});
        Utils.elementMouseUp(selectControl);
      }
    }

    selectDivs = document.querySelectorAll("div.select2-container");
    for (let selectDiv of selectDivs) {
      let dropdownButton = selectDiv.querySelector("span.select2-arrow");
      if (!dropdownButton) continue;
      let selectedValueSpan = selectDiv.querySelector("span.select2-chosen");
      if (!selectedValueSpan) continue;
      if (!this.#isEmptySelectLabel(selectedValueSpan.innerText)) continue;
      let labelElem = selectDiv.parentElement;
      if (labelElem.tagName!="LABEL") continue;
      let label = labelElem.firstChild.nodeValue.trim();
      if (label.trim()=="") continue;
      Utils.elementMouseDown(dropdownButton);
      await Utils.sleep(100);
      let options = [];
      document.querySelectorAll("li.select2-result").forEach(option => {
        options.push(option.innerText.trim());
      });
      fields.push({label: label, options: options, type: "select_greenhouse",element: selectDiv});
      Utils.elementMouseDown(dropdownButton);
    }  
    return fields;
  }

  static #findTextOrSelectFields() {
    const rootElement=this.getRootElement();
    if (!rootElement) return [];
    const elements = rootElement.querySelectorAll('input:not([type="hidden"]),textarea,select');
    let fields = [];
    let noLabelElements = [];
    elements.forEach(element => {
      if (!this.#isElementVisible(element)) return;
      //skip if the text element is already filled
      if (this.isTextElement(element) && element.value.trim()!="") return;
      //ignore the input inside the dropdown on greenhouse site.
      if (this.#isGreenhouseSite())
      {
        let selectControl=this.#findClassInAncestors(element, "select-shell");
        //skip if it's a dropdown select.
        if (selectControl) return;
      }
      if (element.tagName=="INPUT" && !this.isTextInputElement(element)) return;
      let label = LabelLocator.findAssociatedLabel(element);
      if (label) {
        if (this.#isIgnoredTextFields(label,element)) return;
        if (element.type=="date") {
          label=label+"(YYYY-MM-DD)";
        }
        let field={label: label, element: element};
        if (element.tagName=="SELECT") 
        {
          //skip if the select has a valid value.
          if (this.#selectHasValidValue(element)) return;
          field.options=Array.from(element.options).map(option => option.text.trim());
        }
        fields.push(field);
      }
      else noLabelElements.push(element);
    });
    if (noLabelElements.length>0) {
      console.log("No label text or select elements: ", noLabelElements);
    }
    return fields;
  }

  static #selectHasValidValue(selectElem) {
    const value = selectElem.value.trim();
    if (value=="" || value=="?") return false;
    if (selectElem.selectedIndex==-1) return false;
    const label = selectElem.options[selectElem.selectedIndex].text.trim();
    if (this.#isEmptySelectLabel(label)) return false;
    return true;
  }
}

