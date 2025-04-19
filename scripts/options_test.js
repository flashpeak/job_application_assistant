async function runAllTests() {
    console.log("Running all tests...");
    await exportImportTest();
    await saveRestoreResumeTest();
}

async function exportImportTest() {
  console.log("TEST: export/import resume...");
  await saveOptions();
  let resumeText=document.getElementById("resume_text").value;
  const yamlContent = await configToYaml();
  await yamlToConfig(yamlContent);
  restoreOptions();
  if (document.getElementById("resume_text").value === resumeText) {
    console.log("PASS");
  } else {
    console.log("FAIL");
  }
}

async function saveRestoreResumeTest() {
  console.log("TEST: save/restore resume...");  
  let resumeText=document.getElementById("resume_text").value;
  await saveOptions();
  restoreOptions();
  if (document.getElementById("resume_text").value === resumeText) {
    console.log("PASS");
  } else {
    console.log("FAIL");
  }
}