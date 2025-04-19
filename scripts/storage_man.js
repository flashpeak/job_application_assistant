class StorageManager {

  constructor() {
    this.appData=null;
    this.autoFill=null;
    // Use arrow function to preserve this context
    Utils.browserAPI().storage.onChanged.addListener((changes, namespace) => this.#storageChangeListener(changes, namespace));      
  }

  // storageChangeListener: Handles changes in browser storage
  // @param {object} changes - Object containing changes in storage
  // @param {string} namespace - Namespace of the storage area
  #storageChangeListener(changes, namespace) {
    if (namespace === 'sync') {
      for (let field of Object.keys(changes)) {
        //auto fill setting is always updated whenever it is changed.
        if (field=="enable_auto_fill") {
          this.autoFill=changes[field].newValue;
        }
        //other fields are only updated when appData is already loaded. this is to avoid loading appData into unrelated websites.
        else if (this.appData) {
          if (field=="resume_chunks_0") {
            this.appData.resume_valid=this.#checkResumeText(changes[field].newValue);
          }
          else {
            this.appData[field]=changes[field].newValue;
          }
        }
      }
    }
  }

  // getStorageSync: Retrieves data from browser sync storage (Chrome or Firefox)
  // @param {string|string[]} keys - Key(s) to retrieve from storage
  // @returns {Promise<object>} - Promise resolving to object containing requested storage data
  // @throws {Error} - If storage access fails or extension context is invalid
  getStorageSync(keys) {
    const browserAPI=Utils.browserAPI();
    return new Promise((resolve, reject) => {
      try {
        if (!Utils.isFirefox()) {
          browserAPI.storage.sync.get(keys, (result) => {
            if (browserAPI.runtime.lastError) {
              reject(browserAPI.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        } else {
          browserAPI.storage.sync.get(keys).then((result) => {
            resolve(result);
          });
        }
      } catch (error) {
        if (error.message=="Extension context invalidated.")
        {
          Utils.showNotification("Extension context invalidated. Please reload the page.",true);
        }
        else {
          Utils.showNotification(error.message,true);
        }
        reject(error);
      }
    });
  }

  // checkResumeText: Validates if the resume text is valid
  // @param {string} resume_text - Resume text to validate
  // @returns {boolean} - Returns true if the resume text is valid, false otherwise
  #checkResumeText(resume_text) {
    if (!resume_text) return false;
    if (resume_text.length<512) return false;
    return true;
  }

  // loadDataOptions: Loads application data and options from storage
  // @returns {Promise<void>} - Resolves when data is loaded
  loadDataOptions() {
    if (this.appData) {
      return Promise.resolve();
    }
    
    const fields=["applicant_info","debug_mode","resume_chunk_0","token_count","token_date"];

    return this.getStorageSync(fields).then((result) => {
      if (!this.appData) this.appData={};
      for (let field of fields) {
        if (!result[field]) continue;
        if (field=="resume_chunk_0") {
          //We only check if the resume is valid in the content script. There is no need to keep it in the memory.
          this.appData.resume_valid=this.#checkResumeText(result[field]);
        }
        else {
          this.appData[field]=result[field];
        }
      }
    });
  }  

  async loadAutoFillSettings()
  {
    if (this.autoFill!==null) return;
    let result=await this.getStorageSync(["enable_auto_fill"]);
    //force converting to boolean
    this.autoFill=!!result.enable_auto_fill;
  }  
}