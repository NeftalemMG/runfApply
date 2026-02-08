"""
Resume Tailor AI - Backend API
FastAPI server for tailoring resumes and generating cover letters using Claude API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic
import os
from typing import Optional

# Initialize FastAPI app
app = FastAPI(title="Resume Tailor AI", version="1.0.0")

# Enable CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
# Set your API key as environment variable: export ANTHROPIC_API_KEY=your_key_here
anthropic_client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class TailorRequest(BaseModel):
    resume: str
    jobDescription: str
    jobTitle: str
    company: str
    location: Optional[str] = None


class TailorResponse(BaseModel):
    resume: str
    coverLetter: str


@app.get("/")
async def root():
    return {
        "message": "Resume Tailor AI API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/tailor", response_model=TailorResponse)
async def tailor_resume(request: TailorRequest):
    """
    Tailor a resume and generate a cover letter for a specific job posting
    """
    try:
        # Create the prompt for Claude
        prompt = f"""You are an expert resume writer and career coach. Your task is to tailor a resume and create a compelling cover letter for a specific job application.

JOB DETAILS:
- Position: {request.jobTitle}
- Company: {request.company}
- Location: {request.location or 'Not specified'}

JOB DESCRIPTION:
{request.jobDescription}

ORIGINAL RESUME:
{request.resume}

INSTRUCTIONS:
1. Analyze the job description carefully to identify key requirements, skills, and qualifications.
2. Tailor the resume to highlight relevant experience, skills, and achievements that match the job requirements.
3. Use keywords from the job description naturally throughout the resume.
4. Maintain the original resume's structure but optimize the content for this specific position.
5. Keep the tailored resume concise and impactful (ideally 1-2 pages).
6. Generate a compelling cover letter that:
   - Opens with a strong hook related to the company or role
   - Highlights 2-3 key achievements or experiences that make the candidate perfect for this role
   - Shows enthusiasm and cultural fit
   - Ends with a clear call to action
   - Is professional but personable

Please provide your response in the following format:

TAILORED RESUME:
[Your tailored resume here]

---

COVER LETTER:
[Your cover letter here]"""

        # Call Claude API
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            temperature=0.7,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract the response
        response_text = message.content[0].text

        # Parse the response to separate resume and cover letter
        parts = response_text.split("---")
        
        if len(parts) >= 2:
            resume_part = parts[0].replace("TAILORED RESUME:", "").strip()
            cover_letter_part = parts[1].replace("COVER LETTER:", "").strip()
        else:
            # Fallback parsing if format is different
            lines = response_text.split("\n")
            resume_lines = []
            cover_letter_lines = []
            current_section = None
            
            for line in lines:
                if "TAILORED RESUME" in line.upper():
                    current_section = "resume"
                    continue
                elif "COVER LETTER" in line.upper():
                    current_section = "cover_letter"
                    continue
                
                if current_section == "resume":
                    resume_lines.append(line)
                elif current_section == "cover_letter":
                    cover_letter_lines.append(line)
            
            resume_part = "\n".join(resume_lines).strip()
            cover_letter_part = "\n".join(cover_letter_lines).strip()

        return TailorResponse(
            resume=resume_part,
            coverLetter=cover_letter_part
        )

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor resume: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)