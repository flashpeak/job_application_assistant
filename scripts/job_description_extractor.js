class JobDescriptionExtractor {
  //check if a paragraph is a regular paragraph instead of some label or anchor text.
  static isRegularParagraph(paragraph) {
    return paragraph.match(/[.!?]$/) && paragraph.split(" ").length>=4 && paragraph.length>50;
  }
  
  //extract all text from the page. all short labels are automatically removed.
  static extractAllText() {
    const text = document.body.innerText;
    //split text into paragraphs and trim each paragraph
    let paragraphs=text.split("\n").map(p=>p.trim());
    //remove any paragraph that has no punctuation and the following paragraph also has no punctuation
    for (let i=0;i<paragraphs.length;i++) {
      if (!isRegularParagraph(paragraphs[i]) && (i==paragraphs.length-1 || !isRegularParagraph(paragraphs[i+1]))) {
        paragraphs[i]="";
      }
    }
    return paragraphs.filter(p=>p!="").map(p=>"\t"+p).join("\n");
  }

  static extractJobDescription() {
    let job_description="";
    if (document.location.href.includes("//www.linkedin.com/jobs/")) {
      let moreButton=document.querySelector("button[aria-label='see more, visually reveals content which is already detected by screen readers']");
      if (moreButton) {
        moreButton.click();
      }
      let article=document.querySelector("div.job-details-about-the-job-module__description");
      if (article) {
        job_description=article.innerText.trim();
      }
    }
    else if (document.location.href.includes("//www.indeed.com/jobs?")) {
      let job_description_element=document.querySelector("div#jobDescriptionText");
      if (job_description_element) {
        job_description=job_description_element.innerText.trim();
      }
    }
    else if (document.location.href.includes("//www.glassdoor.com/Job/")) {
      let job_description_element=document.querySelector("div.JobDetails_jobDescription__uW_fK");
      if (job_description_element) {
        job_description=job_description_element.innerText.trim();
      }
    }
  
    //if auto detect failed, return selected text
    if (!job_description) {
      job_description = window.getSelection().toString().trim();
      //if no text is selected, extract all text and use it if it is not too long.
      if (!job_description) {
        job_description=extractAllText();
      }
      if (!job_description || job_description.length>10000) {
        alert("We can't auto-detect job description on this website. Please select the job description text and try again.");
        return "";
      }
    }
    if (job_description.length>10000) {
      alert("Job description is too long. Maximum job description length is 10000 characters.");
      return "";
    }
    return job_description;
  }
  
}