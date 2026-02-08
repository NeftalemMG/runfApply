"""
RunF Apply - Backend API
FastAPI server for tailoring resumes and generating cover letters using Claude API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic
import os
from typing import Optional
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(title="RunF Apply", version="2.0.0")

# Enable CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIXED: Validate API key before initializing client
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("=" * 60)
    print("ERROR: ANTHROPIC_API_KEY environment variable is not set!")
    print("Please set it with: export ANTHROPIC_API_KEY=your_key_here")
    print("=" * 60)
else:
    print(f"✓ API key found (length: {len(api_key)})")

anthropic_client = Anthropic(api_key=api_key) if api_key else None


class TailorRequest(BaseModel):
    resume: str
    jobDescription: str
    jobTitle: str
    company: str
    location: Optional[str] = None
    customInstructions: Optional[str] = None


class TailorResponse(BaseModel):
    resume: str
    coverLetter: str


@app.get("/")
async def root():
    return {
        "message": "RunF Apply API",
        "status": "running",
        "version": "2.0.0",
        "api_key_configured": bool(api_key)
    }


@app.get("/health")
async def health_check():
    """Health check endpoint with more details"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "anthropic_key_set": bool(api_key),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/tailor", response_model=TailorResponse)
async def tailor_resume(request: TailorRequest):
    """
    Tailor a resume and generate a cover letter for a specific job posting
    """
    # Check if API key is configured
    if not anthropic_client:
        raise HTTPException(
            status_code=500, 
            detail="ANTHROPIC_API_KEY not configured on server"
        )
    
    try:
        # Build custom instructions section
        custom_instructions_section = ""
        if request.customInstructions and request.customInstructions.strip():
            custom_instructions_section = f"""

ADDITIONAL CUSTOM INSTRUCTIONS FROM USER:
{request.customInstructions}

Make sure to follow these custom instructions carefully while tailoring the resume.
"""

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
{custom_instructions_section}

INSTRUCTIONS:
1. Analyze the job description carefully to identify key requirements, skills, and qualifications.
2. Tailor the ENTIRE resume - include ALL sections with full content:
   - Contact information
   - Professional summary
   - Technical skills
   - Work experience (all positions with full bullet points)
   - Education
   - Projects
   - Certifications
   - Any other sections from the original
3. Use keywords from the job description naturally throughout.
4. Maintain the original resume's structure and formatting.
5. Keep it concise but comprehensive (1-2 pages).
6. Generate a compelling cover letter that:
   - Opens with a strong hook related to the company or role
   - Highlights 2-3 key achievements that match the job requirements
   - Shows enthusiasm and cultural fit
   - Ends with a clear call to action
   - Is professional but personable (3-4 paragraphs)

CRITICAL: Return the COMPLETE tailored resume with ALL sections and full content. Do not summarize or truncate any sections.

Please provide your response in the following exact format:

===RESUME_START===
[Full tailored resume here - include everything]
===RESUME_END===

===COVER_LETTER_START===
[Complete cover letter here]
===COVER_LETTER_END==="""

        # FIXED: Use correct model string
        # Call Claude API with increased tokens for full resume
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",  # FIXED: Correct model string
            max_tokens=8000,  # Increased for full resume
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
        
        print("=" * 50)
        print("CLAUDE RESPONSE RECEIVED")
        print(f"Length: {len(response_text)} characters")
        print("=" * 50)

        # Parse using markers
        resume_part = ""
        cover_letter_part = ""
        
        # Try to extract using markers
        if "===RESUME_START===" in response_text and "===RESUME_END===" in response_text:
            resume_start = response_text.find("===RESUME_START===") + len("===RESUME_START===")
            resume_end = response_text.find("===RESUME_END===")
            resume_part = response_text[resume_start:resume_end].strip()
            print(f"✓ Resume extracted ({len(resume_part)} chars)")
        
        if "===COVER_LETTER_START===" in response_text and "===COVER_LETTER_END===" in response_text:
            cl_start = response_text.find("===COVER_LETTER_START===") + len("===COVER_LETTER_START===")
            cl_end = response_text.find("===COVER_LETTER_END===")
            cover_letter_part = response_text[cl_start:cl_end].strip()
            print(f"✓ Cover letter extracted ({len(cover_letter_part)} chars)")
        
        # Fallback parsing if markers not found
        if not resume_part or not cover_letter_part:
            print("⚠ Using fallback parsing...")
            # Try splitting by common separators
            parts = response_text.split("---")
            
            if len(parts) >= 2:
                resume_part = parts[0].replace("TAILORED RESUME:", "").replace("RESUME:", "").strip()
                cover_letter_part = parts[1].replace("COVER LETTER:", "").strip()
            else:
                # Last resort - try to find sections
                lines = response_text.split("\n")
                resume_lines = []
                cover_letter_lines = []
                current_section = None
                
                for line in lines:
                    line_upper = line.upper()
                    if "RESUME" in line_upper and "COVER" not in line_upper and len(line) < 50:
                        current_section = "resume"
                        continue
                    elif "COVER LETTER" in line_upper:
                        current_section = "cover_letter"
                        continue
                    
                    if current_section == "resume":
                        resume_lines.append(line)
                    elif current_section == "cover_letter":
                        cover_letter_lines.append(line)
                
                resume_part = "\n".join(resume_lines).strip()
                cover_letter_part = "\n".join(cover_letter_lines).strip()
        
        # Validate results
        if not resume_part or len(resume_part) < 100:
            print("⚠ WARNING: Resume is very short or empty!")
            if not resume_part:
                resume_part = response_text
                cover_letter_part = "Cover letter could not be parsed. Please check the resume section."
        
        if not cover_letter_part or len(cover_letter_part) < 50:
            print("⚠ WARNING: Cover letter is very short or empty!")

        return TailorResponse(
            resume=resume_part,
            coverLetter=cover_letter_part
        )

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to tailor resume: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Starting RunF Apply Backend")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
