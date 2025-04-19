async function runAllTests() {
  await gStorageManager.loadDataOptions();
  await testStorageListener();
  await testFormFillerFillFieldLocal();
}

async function testStorageListener() {
  // Save original values
  const originalFirstName = gStorageManager.appData.applicant_info.first_name;
  const originalLastName = gStorageManager.appData.applicant_info.last_name;
  
  // Set test values
  const testFirstName = "TestFirstName";
  const testLastName = "TestLastName";
  
  // Update storage with test values
  await Utils.browserAPI().storage.sync.set({
    'applicant_info': {
      ...gStorageManager.appData.applicant_info,
      first_name: testFirstName,
      last_name: testLastName
    }
  });
  
  // Wait for storage change to propagate
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Verify values were updated
  if (gStorageManager.appData.applicant_info.first_name !== testFirstName ||
      gStorageManager.appData.applicant_info.last_name !== testLastName) {
    throw new Error('Storage change listener failed to update values');
  }
  
  // Restore original values
  await Utils.browserAPI().storage.sync.set({
    'applicant_info': {
      ...gStorageManager.appData.applicant_info,
      first_name: originalFirstName,
      last_name: originalLastName
    }
  });
  
  // Wait for storage change to propagate
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Verify values were restored
  if (gStorageManager.appData.applicant_info.first_name !== originalFirstName ||
      gStorageManager.appData.applicant_info.last_name !== originalLastName) {
    throw new Error('Storage change listener failed to restore original values');
  }
  
  console.log('Storage change listener test passed successfully');
}

async function testFormFillerFillFieldLocal() {
  // Create test fields of different types
  const testFields = [
    // Text input field
    {
      label: "first name",
      element: document.createElement("input"),
      type: "text"
    },
    // Select field
    {
      label: "country",
      element: document.createElement("select"),
      options: ["United States", "Canada", "United Kingdom"]
    },
    // Checkbox group
    {
      label: "work authorization",
      element: document.createElement("input"),
      type: "checkbox"
    },
    // Radio group
    {
      label: "gender",
      radios: [
        { label: "Male", element: document.createElement("input") },
        { label: "Female", element: document.createElement("input") },
        { label: "Other", element: document.createElement("input") }
      ]
    }
  ];

  // Test filling each field
  for (const field of testFields) {
    if (field.type=="checkbox") {
      field.element.type="checkbox";
    }
    else if (field.radios) {
      for (const radio of field.radios) {
        radio.element.type="radio";
      }
    }
    const result = await FormFiller.fillFieldLocal(field, gStorageManager.appData.applicant_info);
    
    // Verify the field was filled correctly based on its type
    if (field.type === "text") {
      if (field.element.value !== gStorageManager.appData.applicant_info.first_name) {
        throw new Error('Text input field was not filled correctly');
      }
    } else if (field.element?.tagName === "SELECT") {
      const expectedCountry = gStorageManager.appData.applicant_info.country === "us" ? "United States" : "";
      if (field.element.value !== expectedCountry) {
        throw new Error('Select field was not filled correctly');
      }
    } else if (field.type === "checkbox") {
      if (field.element.checked !== (gStorageManager.appData.applicant_info.us_work_authorization === "Yes")) {
        throw new Error('Checkbox field was not filled correctly');
      }
    } else if (field.radios) {
      const checkedRadio = field.radios.find(r => r.element.checked);
      if (!checkedRadio || checkedRadio.label !== gStorageManager.appData.applicant_info.gender) {
        throw new Error('Radio group was not filled correctly');
      }
    }
  }

  console.log('FormFiller.fillFieldLocal test passed successfully');
}