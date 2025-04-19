class LocalFieldParser {
  /**
   * Compares a form field label against an applicant info value to check for matches.
   * Handles special cases for certain fields like country, gender, race, and sexual orientation
   * where multiple label variations should match the same value.
   * 
   * @param {string} label - The form field label to check
   * @param {Object} applicantInfo - Object containing applicant information
   * @param {string} key - The key in applicantInfo to compare against
   * @returns {boolean} True if the label matches the applicant info value, false otherwise
   */
  static #compareOption(label, applicantInfo, key) {
    let value = applicantInfo[key].toLowerCase();
    let label_low = label.toLowerCase();
    if (label_low == value) return true;
    if (value == "yes" && label.substring(0,4) == "yes,") return true; 
    if (value == "no" && label.substring(0,3) == "no,") return true;
    if (key == "country") {
      if (value == "us" && ["United States","USA","US","United states","United States of America"].includes(label)) 
        return true;
    }
    else if (key == "gender") {
      if (value == "male" && ["male","man","men"].includes(label))
        return true;
      if (value == "female" && ["female","woman","women"].includes(label))
        return true;
    }
    else if (key == "race") {
      if (value == "white" && ["white","caucasian","european"].includes(label))
        return true;
      if (value == "black" && ["black","african american","african-american"].includes(label))
        return true;
      if (value.indexOf("asian") != -1 && label_low == "asian")
        return true;
    }
    else if (key == "sexual_orientation") {
      if (value == "straight" && label_low == "heterosexual")
        return true;
    }

    return false;
  }

  /**
   * Analyzes a form field and determines the appropriate value to fill based on applicant information.
   * Uses pattern matching against field labels to identify the type of information needed.
   * Handles various field types including text inputs, checkboxes, radio buttons, and dropdowns.
   * 
   * @param {Object} field - The form field object to analyze
   * @param {Object} applicantInfo - Object containing the applicant's information
   * @returns {string} The value to fill in the form field, or empty string if no match found
   */  
  static getFieldValue(field, applicantInfo) {
    if (!applicantInfo) return "";
    //patterns starting with ~ are negative patterns. if a negative pattern is matched, it won't match the key.
    //negative patterns should always be placed before positive patterns.
    let all_patterns = {
      "first_name": "first name,given name",
      "last_name": "last name,surname,family name",
      "name": "^name$,^full name$",
      "street_address": "^address$,street address,^street$",
      "email": "~source email,email",
      "phone": "~source phone,phone,telephone,mobile",
      "city": "city",
      "state": "state",
      "zip_code": "zip,zipcode,postal code",
      "linkedin_profile": "linkedin",
      "github_profile": "github",
      "gender": "gender,sex",
      "location": "residence,location",
      "country": "country",
      "us_work_authorization": "~sponsor,work authorization,authorized to work",
      "us_sponsorship_required": "sponsorship,sponsor,sponsoring",
      "disabled": "disabled,disability",
      "veteran": "veteran,military,army",
      "sexual_orientation": "sexual orientation",
      "current_job_title": "current job title,current position,previous position,previous job title",
      "race": "race,ethnicity,racial,ethnic",
      "willing_to_relocate": "relocation,relocate",
      "expected_salary": "expected salary,salary expectation,salary expectations",
      "signature": "signature"
    };
    let checkbox_keys = ["us_work_authorization","us_sponsorship_required","signature","willing_to_relocate"];
    
    if (!applicantInfo["location"]) {
      applicantInfo["location"] = applicantInfo["city"] + ", " + applicantInfo["state"];
      applicantInfo["name"] = applicantInfo["first_name"] + " " + applicantInfo["last_name"];
      applicantInfo["signature"] = applicantInfo["first_name"] + " " + applicantInfo["last_name"];
    }
    
    for (const [key, value] of Object.entries(all_patterns)) {
      let pattern_list = value.split(",");
      for (let pattern of pattern_list) {
        pattern = pattern.trim();
        let negative = false;
        if (pattern[0] == "~") {
          negative = true;
          pattern = pattern.substring(1);
        }
        if (pattern[0] != '^') pattern = '\\b' + pattern;
        if (pattern[pattern.length-1] != '$') pattern = pattern + '\\b';
        if (negative && field.label.match(new RegExp(pattern))) {
          break;
        }
        if (field.label.match(new RegExp(pattern))) {
          if (field.type == "checkbox") {
            if (checkbox_keys.includes(key)) return "yes";
            return "";
          } 
          if (!applicantInfo[key]) return "";
          if (field.options) {
            for (let option of field.options) {
              if (this.#compareOption(option, applicantInfo, key)) return option;
            }
          }
          else if (field.checkboxes) {
            let matched_values = [];
            for (let checkbox of field.checkboxes) {
              if (this.#compareOption(checkbox.label, applicantInfo, key)) {
                matched_values.push(checkbox.label);
              }
            }
            return matched_values.join("|");
          }
          else if (field.radios) {
            for (let radio of field.radios) {
              if (this.#compareOption(radio.label, applicantInfo, key)) {
                return radio.label;
              }
            }
          }
          else return applicantInfo[key];
        } 
      }
    }
    return "";
  }
}