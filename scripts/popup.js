//flag check is chrome or firefox by useragent
const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
const browserAPI = isFirefox ? browser : chrome;
// helper function for firefox and chrome compatibility
function getStorageSync(keys) {
  return new Promise((resolve, reject) => {
    if (!isFirefox) {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    } else {
      browser.storage.sync.get(keys).then((result) => {
        resolve(result);
      }).catch((error) => {
        reject(error);
      });
    }
  });
}

// Helper function to simplify document.getElementById
function $(id) {
  return document.getElementById(id);
}

document.addEventListener('DOMContentLoaded', function() {
  // disable the "Fill Fields" menu item when the current tab is not http, https or file
  browserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const protocol = url.protocol;

      if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'file:') {
        const itemsToHide = ['fill', 'fill_local', 'generate_job_assessment', 'generate_cover_letter','toggle_auto_fill','extract'];
        itemsToHide.forEach(item => {
          document.querySelector('.menu_item[data-action="' + item + '"]').style.display = 'none';
        });
      }
    }
  });

  $('menu').addEventListener('click', function(e) {
    if (e.target && (e.target.nodeName == "DIV" || e.target.nodeName=="SPAN")) {
      let clickedElement = e.target;
      if (clickedElement.nodeName=="SPAN") {
        clickedElement = clickedElement.parentElement;
      }
      var action = clickedElement.getAttribute('data-action');
      if (!action) {
        return;
      }
      
      // Handle options menu click
      if (action === "options") {
        browserAPI.runtime.openOptionsPage();
        window.close();
        return;
      }
      if (action === "donate") {
        //open the donation page in a new tab
        window.open("https://www.paypal.com/ncp/payment/43NBSZFWAV3PW", "_blank");
        window.close();
        return;
      }
      if (action === "feedback") {
        //open the feedback page in a new tab
        //generate a verification token that is md5 hash of the current date in UTC timezone in YYYYMMDD format
        const date = new Date();
        const verificationToken = CryptoJS.MD5(date.toISOString().split('T')[0].replace(/-/g, '')).toString();
        window.open("https://www.slimjet.com/job-application-assistant/feedback.php?token=" + verificationToken, "_blank");
        window.close();
        return;
      }
      if (action === "help") {
        window.open('https://www.slimjet.com/job-application-assistant/manual.php?version='+getExtensionVersion(), "_blank");
        window.close();
        return;
      }
      browserAPI.runtime.sendMessage({action: action});
      window.close(); 
    }
  });

});

function getExtensionVersion() {
  return browserAPI.runtime.getManifest().version;
}

function updateUI(result) {
  $("auto_fill_checkmark").style.visibility = result.enable_auto_fill ? "visible" : "hidden";
  $("debug_menus").style.display = result.debug_mode ? "block" : "none";
}

getStorageSync(['enable_auto_fill', 'debug_mode']).then((result) => {
  updateUI(result);
}).catch((error) => {
  console.error('Error getting storage:', error);
});
