export const prompts = {
  'summary-default': {
    promptName: 'summary-default',
    chatGptModel: 'gpt-3.5-turbo',
    system: `
        You are an experienced recruiter in the biotech industry responsible for hiring the best job applicant for the job by summarizing the job applicant's resume.

        Your task is to compare the job applicant's resume to the job description on the following parameters:

        {{ prompts }}

        ------

        Respond in a helpful tone, with very concise answers.
      `,
    user: `
        Review the job applicant's resume. Find and mention all of the above parameters.
        
        See the job applicant's resume below.
        
        <!--start-resume-->
        <%= resumeContent %>
        <!--end-resume-->
    
        Use the below example response, your response should contain similar structure.
    
        <!--start-example-response-->

        {{ prompts }}

        <!--end-example-response-->
      `
  }
}

export const templatePrompts = [
  {
    name: 'Education level',
    promptText: `Education level. Find and mention the most senior education level of the job applicant from the job applicant's resume. Example values for educational level: "Postdoctoral Fellow", "M.D.", "Ph.D.", "Pharm.D.", "M.S.", "B.S.", "A.S.", "M.S. in Bioengineering", "PhD in Bioinformatics" and other values. If field of study is mentioned, mention field of study together with education level. Examples of field of study: "Chemistry", "Biology", "Computer Biology", "Biochemistry", "Bioinformatics", "Immunology", "Pharmacology", "Microbiology" and other values. Mention the graduation date for this found education level and university's name.`,
    exampleResponse: 'Education level: The job applicant has an Ph.D. degree in Virology from Caltech (Pasadena, CA). Completion date is May 2020.'
  },
  {
    name: 'Job title',
    promptText: `Job title. Mention the most senior job title of the job applicant from the job applicant's resume. Example values for job title: "Intern", "Co-op", "Technicain", "Research Associate", "Scientist", "Engineer", "Developer", "Analyst", "Manager", "Supervisor", "Director", "Head", "Lead", "President", "Officer", "Executive" and other values. Mentioned the date when job applicant received this job title. Mention employer's name.`,
    exampleResponse: `Job title: The job applicant's most recent job title is "Senior Scientist" at Moderna (Cambridge, MA). The job applicant held this job title since July 2021.`
  },
  {
    name: 'Skills',
    promptText: `Skills. Skills inside the job applicant's resume that are related to research, laboratory and technology. Example values for skills: "Flow cytometry", "PCR", "CHIP-seq", "Brain dissection", "NGS-based assays", "target discovery", "PreSeq software", "Max Reads assay", "cell culturing", "Python". Mention hard skills and don't mention soft skills. Indicate one or two skills that are mentioned most frequently in the job applicant's resume.`,
    exampleResponse: `Skills: The job applicant has experience with Next-Generation Sequencing (NGS)-based genetic tests, PCR-based methods, RNA-Seq, FACS and Flow cytometry. The job applicant has extensive experience in RNA sequencing.`
  },
  {
    name: 'Physical location',
    promptText: `Physical location. Indicate the current physical location of the job applicant or physical location of their most recent employer or physical location of their university if the job applicant is the recent graduate. Mention this location (city, state) and if this location is outside of United States then indicate it.`,
    exampleResponse: `Skills: The job applicant has experience with Next-Generation Sequencing (NGS)-based genetic tests, PCR-based methods, RNA-Seq, FACS and Flow cytometry. The job applicant has extensive experience in RNA sequencing.`
  },
]