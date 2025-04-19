import Utils from "./utils.js";

class StorageMan {
  constructor() {
    this.appData=null;
    // Use arrow function to preserve this context
    Utils.browserAPI().storage.onChanged.addListener((changes, namespace) => this.#storageChangeListener(changes, namespace));      
  }  

  //get values for specified keys from syncstorage
  getStorageSync(keys) {
    const browserAPI=Utils.browserAPI();
    return new Promise((resolve, reject) => {
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
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }

  setStorageSync(value) {
    const browserAPI=Utils.browserAPI();
    browserAPI.storage.sync.set(value);
  }

  //load the applicant data from the sync storage
  loadApplicantData(reload=false) {
    if (this.appData && !reload) {
      return Promise.resolve();
    }
    console.log(reload?"reloading":"loading","applicant data");
    return this.getStorageSync(['applicant_info', 'applicant_info_extra']).then(async (result) => {
      this.appData = result;
      
      // Check if resume was saved in chunks
      if (result.applicant_info_extra?.resume_chunks_count) {
        const chunkKeys = Array.from(
          { length: result.applicant_info_extra.resume_chunks_count },
          (_, i) => 'resume_chunk_' + i
        );
        
        const chunksResult = await this.getStorageSync(chunkKeys);
        const resumeText = chunkKeys
          .map(key => chunksResult[key] || '')
          .join('');
        
        this.appData.applicant_info_extra.resume_text = resumeText;
        if (resumeText.length>0) {
          console.log("resume text loaded");
        }
        else {
          console.log("resume text loading failed");
        }
      }
    });
  }  

  //storage change listener
  #storageChangeListener(changes, namespace) {
    //if data is not loaded, do nothing
    if (!this.appData) return;
    if (namespace === 'sync') {
      for (let field of Object.keys(changes)) {
        //reload all the chunks if any chunk is changed
        if (field.startsWith('resume_chunk_')) {
          loadApplicantData(true);
          break;
        }
        this.appData[field]=changes[field].newValue;
      }
    }
  }
}

export default StorageMan;