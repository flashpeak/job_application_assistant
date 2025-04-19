class FormFiller {
  static async fillFieldLocal(field, applicantInfo) {
    let value = LocalFieldParser.getFieldValue(field, applicantInfo);
    if (value) {
      await this.fillField(field, value);
      return true;
    }   
    return false;
  }

  //Fill field with specified value
  static async fillField(field, value) {
    if (field.checkboxes) {
      let values = value.split(";");
      for (let checkbox of field.checkboxes) {
        if (values.includes(checkbox.label)) {
          if (!checkbox.element.checked) {
            checkbox.element.click();
          }
        }
      }
    }
    else if (field.radios) {
      for (let radio of field.radios) {
        if (radio.label == value) {
          radio.element.click();
          break;
        }
      }
    }
    else if (field.element.tagName == "SELECT") {
      for (let option of field.element.options) {
        if (option.text.trim() == value) {
          option.selected = true;
          break;
        }
      }
    }
    else if (field.element.tagName == "DIV" && field.element.getAttribute("role") == "checkbox") {
      if (value.toLowerCase() == "yes") {
        field.element.click();
      }
    }
    else if (FieldExtractor.isTextElement(field.element)) {
      if (FieldExtractor.isWorkdayjobsSite()) {
        field.element.focus();
      }
      field.element.value = value;
    }
    else if (field.element.tagName == "INPUT" && field.element.type == "checkbox") {
      if (field.element.checked != (value.toLowerCase() == "yes")) {
        field.element.click();
      }
    }
    else if (field.type == "select_workday") {
      field.element.click();
      await Utils.sleep(500);
      document.querySelectorAll('li[role="option"]').forEach(li => {
        if (li.textContent.trim().toLowerCase() == value.toLowerCase()) {
          li.click();
        }
      });
    }
    else if (field.type == "select_greenhouse") {
      let selectControl = field.element.querySelector('div.select__control');
      if (selectControl) {
        Utils.elementMouseUp(selectControl);
        await Utils.sleep(100);
        field.element.querySelectorAll('div.select__option').forEach(div => {
          if (div.textContent.trim().toLowerCase() == value.toLowerCase()) div.click();
        });
      }
      else {
        let dropdownButton = field.element.querySelector("span.select2-arrow");
        Utils.elementMouseDown(dropdownButton);
        await Utils.sleep(100);
        document.querySelectorAll('li.select2-result').forEach(li => {
          if (li.textContent.trim().toLowerCase() == value.toLowerCase()) Utils.elementMouseUp(li);
        });
      }
    }
    else if (field.type == "select_microsoft") {
      field.element.click();
      await Utils.sleep(500);
      document.querySelectorAll('button[role="option"]').forEach(li => {
        if (li.textContent.trim().toLowerCase() == value.toLowerCase()) {
          li.click();
        }
      });
    }
    else if (field.type == "select_amazon") {
      let selectSpan = field.element.querySelector('span.select2-selection__rendered');
      if (selectSpan) {
        Utils.elementMouseDown(selectSpan);
        await Utils.sleep(500);
        let options = document.querySelectorAll('li.select2-results__option');
        for (let option of options) {
          if (option.textContent.trim().toLowerCase() == value.toLowerCase()) {
            Utils.elementMouseUp(option);
            await Utils.sleep(500);
            break;
          }
        }
      }
    }
    if (field.element) {
      field.element.dispatchEvent(new Event('change', { bubbles: true }));
      if (field.element.tagName == "INPUT" && field.element.type != "checkbox" && field.element.type != "radio" 
        || field.element.tagName == "SELECT") {
        field.element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  //Fill self identification date field on Workday jobs site
  static async #autoFillSelfIdentificationDate() {
    let ids = ["formField-todaysDate", "formField-dateSignedOn"];
    for (let id of ids) {
      let divElem = document.querySelector(`div[data-automation-id='${id}']`);
      if (!divElem) continue;
      let dateSelectElem = document.querySelector("div[data-automation-id='dateIcon']");
      if (dateSelectElem) {
        dateSelectElem.click();
        await Utils.sleep(500);
        let todayButton = document.querySelector("button[data-automation-id='datePickerSelectedToday']");
        if (todayButton) todayButton.click();
      }
    }
  }

  //Fill Workday-specific fields
  static async #autoFillWorkDayJobsFields() {
    if (FieldExtractor.isWorkdayjobsSite()) {
      await this.#autoFillSelfIdentificationDate();
      let agreementCheckbox = document.querySelector("input[data-automation-id='agreementCheckbox']");
      if (agreementCheckbox && !agreementCheckbox.checked) {
        agreementCheckbox.click();
      }
    }
  }

  //Extract all fields, try to fill them locally, return the fields that couldn't be filled
  static async fillAllFields(applicantInfo) {
    let unfilledFields = [];
    await this.#autoFillWorkDayJobsFields();
    const fields = await FieldExtractor.findAllFields(applicantInfo);
    for (let field of fields) {
      if (!(await this.fillFieldLocal(field, applicantInfo))) {
        unfilledFields.push(field);
      }
    }
    return unfilledFields;
  }
}