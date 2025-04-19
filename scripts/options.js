//flag check is chrome or firefox by useragent
const gIsFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
const gBrowserAPI = gIsFirefox ? browser : chrome;
// helper function for firefox and chrome compatibility
function getStorageSync(keys) {
  return new Promise((resolve, reject) => {
    if (!gIsFirefox) {
      gBrowserAPI.storage.sync.get(keys, (result) => {
        if (gBrowserAPI.runtime.lastError) {
          reject(gBrowserAPI.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    } else {
      gBrowserAPI.storage.sync.get(keys).then((result) => {
        resolve(result);
      }).catch((error) => {
        reject(error);
      });
    }
  });
}

// List of US states with abbreviations
const states = [
  { name: 'Alabama', abbr: 'AL' },
  { name: 'Alaska', abbr: 'AK' },
  { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' },
  { name: 'California', abbr: 'CA' },
  { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' },
  { name: 'Delaware', abbr: 'DE' },
  { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' },
  { name: 'Hawaii', abbr: 'HI' },
  { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' },
  { name: 'Indiana', abbr: 'IN' },
  { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' },
  { name: 'Kentucky', abbr: 'KY' },
  { name: 'Louisiana', abbr: 'LA' },
  { name: 'Maine', abbr: 'ME' },
  { name: 'Maryland', abbr: 'MD' },
  { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Michigan', abbr: 'MI' },
  { name: 'Minnesota', abbr: 'MN' },
  { name: 'Mississippi', abbr: 'MS' },
  { name: 'Missouri', abbr: 'MO' },
  { name: 'Montana', abbr: 'MT' },
  { name: 'Nebraska', abbr: 'NE' },
  { name: 'Nevada', abbr: 'NV' },
  { name: 'New Hampshire', abbr: 'NH' },
  { name: 'New Jersey', abbr: 'NJ' },
  { name: 'New Mexico', abbr: 'NM' },
  { name: 'New York', abbr: 'NY' },
  { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota', abbr: 'ND' },
  { name: 'Ohio', abbr: 'OH' },
  { name: 'Oklahoma', abbr: 'OK' },
  { name: 'Oregon', abbr: 'OR' },
  { name: 'Pennsylvania', abbr: 'PA' },
  { name: 'Rhode Island', abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' },
  { name: 'South Dakota', abbr: 'SD' },
  { name: 'Tennessee', abbr: 'TN' },
  { name: 'Texas', abbr: 'TX' },
  { name: 'Utah', abbr: 'UT' },
  { name: 'Vermont', abbr: 'VT' },
  { name: 'Virginia', abbr: 'VA' },
  { name: 'Washington', abbr: 'WA' },
  { name: 'West Virginia', abbr: 'WV' },
  { name: 'Wisconsin', abbr: 'WI' },
  { name: 'Wyoming', abbr: 'WY' }
];

const countries = [
  { name: 'United States', abbr: 'US' },
  { name: 'Canada', abbr: 'CA' },
  { name: 'United Kingdom', abbr: 'UK' },
  { name: 'Australia', abbr: 'AU' },
  { name: 'New Zealand', abbr: 'NZ' },
  { name: 'Germany', abbr: 'DE' },
  { name: 'France', abbr: 'FR' },
  { name: 'Japan', abbr: 'JP' },
];

// Function to populate state dropdown
function populateStateDropdown() {
    const stateSelect = document.getElementById('state');
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.abbr;
        option.textContent = `${state.name} (${state.abbr})`;
        stateSelect.appendChild(option);
    });
}

function populateCountryDropdown() {
    const countrySelect = document.getElementById('country');
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.abbr;
        option.textContent = `${country.name}`;
        countrySelect.appendChild(option);
    });
}

// Function to validate options
function checkOptions() {
  const requiredFields = ['first_name', 'last_name', 'email', 'phone','resume_text'];
  let firstErrorElement = null;
  for (const field of requiredFields) {
    const element = document.getElementById(field);
    let error = field=='resume_text' && element.value.length<512 || !element.value;
    setErrorStatus(element, error);
    if (!firstErrorElement && error) {
      firstErrorElement = element;
    }
  }
  if (firstErrorElement) {
    firstErrorElement.focus();
  }
}

function setErrorStatus(element,error){
  //set the element to red background if error, otherwise set to normal
  if (error) {
    element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  } else {
    element.style.backgroundColor = '';
  }
}

// Constants for chunking
const CHUNK_SIZE = 8000; // Chrome sync storage has a limit of 8192 bytes per item
const RESUME_CHUNK_PREFIX = 'resume_chunk_';

// Helper function to split text into chunks
function splitIntoChunks(text) {
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }
    //if the text is empty, create a single chunk with an empty string
    if (chunks.length==0) chunks.push("");
    return chunks;
}

// Function to save options
function saveOptions() {
  return new Promise((resolve, reject) => {
    checkOptions();

    // Get resume text and split into chunks
    const resumeText = document.getElementById('resume_text').value;
    const chunks = splitIntoChunks(resumeText);

    // Create chunks object
    const chunksObj = {};
    chunks.forEach((chunk, index) => {
        chunksObj[RESUME_CHUNK_PREFIX + index] = chunk;
    });
        
    const config = {
        applicant_info: {
            first_name: document.getElementById('first_name').value,
            last_name: document.getElementById('last_name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            street_address: document.getElementById('street_address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            country: document.getElementById('country').value,
            zip_code: document.getElementById('zip_code').value,
            us_sponsorship_required: document.getElementById('us_sponsorship_required').value,
            us_work_authorization: document.getElementById('us_work_authorization').value,
            us_work_authorization_type: document.getElementById('us_work_authorization_type').value,
            expected_salary: document.getElementById('expected_salary').value,
            gender: document.getElementById('gender').value,
            disabled: document.getElementById('disabled').value,
            veteran: document.getElementById('veteran').value,
            sexual_orientation: document.getElementById('sexual_orientation').value,
            race: document.getElementById('race').value,
            drug_test: document.getElementById('drug_test').value,
            security_check: document.getElementById('security_check').value,
            willing_to_travel: document.getElementById('willing_to_travel').value,
            willing_to_relocate: document.getElementById('willing_to_relocate').value,
            job_title: document.getElementById('job_title').value,
            linkedin_profile: document.getElementById('linkedin_profile').value,
            github_profile: document.getElementById('github_profile').value,
            current_job_title: document.getElementById('current_job_title').value,
            available_date: document.getElementById('available_date').value,
        },
        applicant_info_extra: {
            resume_chunks_count: chunks.length,
            custom_instructions: document.getElementById('custom_instructions').value,
        },
        debug_mode: document.getElementById('debug_mode').checked,
        ...chunksObj // Spread the chunks into the config
    };

    gBrowserAPI.storage.sync.set(config, function() {
      if (gBrowserAPI.runtime.lastError) {
        const error = 'Error saving options: ' + gBrowserAPI.runtime.lastError.message;
        document.getElementById('status_message').textContent = error;
        reject(new Error(error));
      } else {
        document.getElementById('status_message').textContent = 'Options saved.';
        resolve();
      }
    });
  });
}

// Function to restore options
function restoreOptions() {
    getStorageSync(['applicant_info', 'applicant_info_extra', 'debug_mode']).then(async result => {
        // Applicant info
        document.getElementById('first_name').value = result.applicant_info?.first_name || '';
        document.getElementById('last_name').value = result.applicant_info?.last_name || '';
        document.getElementById('email').value = result.applicant_info?.email || '';
        document.getElementById('phone').value = result.applicant_info?.phone || '';
        document.getElementById('street_address').value = result.applicant_info?.street_address || '';
        document.getElementById('city').value = result.applicant_info?.city || '';
        document.getElementById('state').value = result.applicant_info?.state || '';
        document.getElementById('country').value = result.applicant_info?.country || '';
        document.getElementById('zip_code').value = result.applicant_info?.zip_code || '';
        document.getElementById('us_sponsorship_required').value = result.applicant_info?.us_sponsorship_required || 'No';
        document.getElementById('us_work_authorization').value = result.applicant_info?.us_work_authorization || 'No';
        document.getElementById('us_work_authorization_type').value = result.applicant_info?.us_work_authorization_type || '';
        document.getElementById('expected_salary').value = result.applicant_info?.expected_salary || '';
        document.getElementById('gender').value = result.applicant_info?.gender || '';
        document.getElementById('disabled').value = result.applicant_info?.disabled || '';
        document.getElementById('veteran').value = result.applicant_info?.veteran || '';
        document.getElementById('sexual_orientation').value = result.applicant_info?.sexual_orientation || '';
        document.getElementById('race').value = result.applicant_info?.race || '';
        document.getElementById('drug_test').value = result.applicant_info?.drug_test || '';
        document.getElementById('security_check').value = result.applicant_info?.security_check || '';
        document.getElementById('willing_to_travel').value = result.applicant_info?.willing_to_travel || '';
        document.getElementById('willing_to_relocate').value = result.applicant_info?.willing_to_relocate || '';
        document.getElementById('job_title').value = result.applicant_info?.job_title || '';
        document.getElementById('linkedin_profile').value = result.applicant_info?.linkedin_profile || '';
        document.getElementById('github_profile').value = result.applicant_info?.github_profile || '';
        document.getElementById('current_job_title').value = result.applicant_info?.current_job_title || '';
        document.getElementById('available_date').value = result.applicant_info?.available_date || '';

        document.getElementById('custom_instructions').value = result.applicant_info_extra?.custom_instructions || '';

        if (result.applicant_info_extra?.resume_chunks_count) {
          const chunkKeys = Array.from(
              { length: result.applicant_info_extra.resume_chunks_count },
              (_, i) => RESUME_CHUNK_PREFIX + i
          );
          
          const chunksResult = await getStorageSync(chunkKeys);
          const resumeText = chunkKeys
              .map(key => chunksResult[key] || '')
              .join('');
          
          document.getElementById('resume_text').value = resumeText;
        } else {
            document.getElementById('resume_text').value = '';
        }

        // Debug mode
        document.getElementById('debug_mode').checked = result.debug_mode || false;
        
        // Show debug checkbox if already enabled
        if (result.debug_mode) {
            document.querySelector('#debug_mode').parentElement.parentElement.style.display = 'block';
        }
    });
}

// Function to convert file to text
function fileToText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            
            if (file.name.endsWith('.docx')) {
                // Convert DOCX to text
                mammoth.extractRawText({arrayBuffer: arrayBuffer})
                    .then(result => resolve(result.value))
                    .catch(error => reject(error));
            } else if (file.name.endsWith('.pdf')) {
                // Convert PDF to text
                pdfjsLib.getDocument({data: arrayBuffer}).promise.then(pdf => {
                    let text = '';
                    const numPages = pdf.numPages;
                    const pagePromises = [];
                    for (let i = 1; i <= numPages; i++) {
                        pagePromises.push(pdf.getPage(i).then(page => page.getTextContent()).then(content => {
                            text += content.items.map(item => item.str).join(' ') + '\n';
                        }));
                    }
                    Promise.all(pagePromises).then(() => resolve(text));
                }).catch(error => reject(error));
            } else if (file.name.endsWith('.txt')) {
                // Convert TXT to text
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target.result;
                    resolve(text);
                };
                reader.readAsText(file);
            } else {
                reject(new Error('Unsupported file format'));
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// Function to handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileToText(file)
            .then(text => {
                document.getElementById('resume_text').value = text;
            })
            .catch(error => {
                console.error('Error converting file to text:', error);
                alert('Error converting file to text. Please try again.');
            });
    }
}

let clickCount = 0;
let firstClickTime = 0;

document.addEventListener('DOMContentLoaded', function() {
    populateStateDropdown();
    populateCountryDropdown();
    restoreOptions();
    
    document.getElementById('resume').addEventListener('change', handleFileSelect);
    document.getElementById('save').addEventListener('click', saveOptions);
    document.getElementById('export').addEventListener('click', exportData);
    document.getElementById('import').addEventListener('click', importData);    

    // Add 5-click detection on body to show debug checkbox
    document.body.addEventListener('click', function(e) {
        const currentTime = new Date().getTime();
        
        if (clickCount === 0) {
            // Start timing from first click
            firstClickTime = currentTime;
        }
        
        // Reset if more than 5 seconds have passed since first click
        if (currentTime - firstClickTime > 5000) {
            clickCount = 0;
            firstClickTime = currentTime;
        }
        
        clickCount++;
        
        if (clickCount >= 5) {
            // Show debug checkbox
            document.querySelector('#debug_mode').parentElement.parentElement.style.display = 'block';
            clickCount = 0;
        }
    });
});

async function yamlToConfig(yamlContent) {
  const data = jsyaml.load(yamlContent);
          
  // Validate the data structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format');
  }
  
  // Separate resume chunks from other data
  const chunks = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith(RESUME_CHUNK_PREFIX)) {
      chunks[key] = value;
    }
  });

  // Store the imported data
  await gBrowserAPI.storage.sync.set({
    applicant_info: data.applicant_info || {},
    applicant_info_extra: data.applicant_info_extra || {},
    debug_mode: data.debug_mode || false,
    ...chunks  // Include the resume chunks
  });
}

async function configToYaml(config) {
  const result = await getStorageSync([
    'applicant_info',
    'applicant_info_extra',
    'debug_mode'
  ]);

  const chunkKeys = Array.from(
    { length: result.applicant_info_extra.resume_chunks_count },
    (_, i) => RESUME_CHUNK_PREFIX + i
  );
  
  const chunksResult = await getStorageSync(chunkKeys);
  // Add chunks directly to the result object
  Object.assign(result, chunksResult);
  
  // Create YAML content
  const yamlContent = `# Job Application Assistant Data Export
# Generated: ${new Date().toISOString()}

applicant_info:
${formatYamlObject(result.applicant_info, 2)}

applicant_info_extra:
${formatYamlObject(result.applicant_info_extra, 2)}

debug_mode: ${result.debug_mode || false}

# Resume chunks
${Object.entries(result)
  .filter(([key]) => key.startsWith(RESUME_CHUNK_PREFIX))
  .map(([key, value]) => `${key}: |\n${value.split('\n').map(line => `  ${line}`).join('\n')}`)
  .join('\n')}
`;

  return yamlContent;
}

// Add this function to handle data export
async function exportData() {
  try {
    await saveOptions();
  }
  catch (error) {
    alert('Error saving options: ' + error.message);
    return;
  }

  const yamlContent = await configToYaml();

  // Create and trigger download
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'job_assistant_data.yaml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
  
// Helper function to format objects for YAML
function formatYamlObject(obj, indent = 0) {
  if (!obj) return '  {}';

  return Object.entries(obj)
    .map(([key, value]) => {
      const spaces = ' '.repeat(indent);
      if (typeof value === 'string') {
          // Handle multi-line strings
          if (value.includes('\n')) {
          return `${spaces}${key}: |\n${value.split('\n').map(line => `${spaces}  ${line}`).join('\n')}`;
          }
          // Escape special characters and wrap in quotes if needed
          if (value.match(/[:#{}[\],&*?|<>=!%@`]/)) {
          return `${spaces}${key}: "${value.replace(/"/g, '\\"')}"`;
          }
          return `${spaces}${key}: ${value}`;
      }
      if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:\n${formatYamlObject(value, indent + 2)}`;
      }
      return `${spaces}${key}: ${value}`;
    })
    .join('\n');
}

function importData() {
  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.yaml,.yml';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
          // Parse YAML content
          const content = e.target.result;
          await yamlToConfig(content);
          
          // Update the UI with imported data
          restoreOptions();
          
          alert('Data imported successfully!');
          
      } catch (error) {
          alert('Error importing data: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  });

  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}
