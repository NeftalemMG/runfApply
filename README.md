# RunF Apply

AI-powered Chrome extension that tailors resumes and generates cover letters for specific job postings.

## Installation

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY='your-key-here'
python main.py
```

Keep terminal open. Server runs on localhost:8000.

### Extension Setup

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `extension-IMPROVED` folder
5. Pin extension to toolbar

## Usage

1. Navigate to job posting (LinkedIn, Lever, Greenhouse, or any /careers/ page)
2. Click extension icon
3. Upload resume (PDF, DOC, DOCX, or TXT)
4. Optional: Add custom instructions in text area
5. Optional: Click "Edit" to modify resume
6. Click "Tailor Resume"
7. Wait 10-15 seconds
8. Copy or download results

## Custom Instructions Examples

- "Focus on leadership experience"
- "Emphasize Python and AWS skills"
- "Keep to one page"
- "Highlight remote work experience"

## Features

- Auto-detects job postings on major career sites
- Generates tailored resume (full content, not summary)
- Creates custom cover letter
- Edit resume before tailoring
- Custom instructions for specific focus areas
- Copy to clipboard or download as TXT

## Tech Stack

- Extension: Vanilla JavaScript, Chrome Manifest V3
- Backend: FastAPI (Python)
- AI: Claude Sonnet 4 (Anthropic)
- Storage: Chrome local storage

## Troubleshooting

**Connection refused**: Backend not running. Start with `python main.py`

**Partial resume only**: Using old backend. Use backend-IMPROVED folder.

**No job detected**: Must be on LinkedIn, Lever, Greenhouse, or page with /careers/ or /jobs/ in URL.

**Invalid API key**: Set environment variable before starting server.

## File Structure
```
resume-tailor-extension/backend-IMPROVED/
├── main.py
└── requirements.txt

resume-tailor-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── content.css
├── background.js
└── icons/
```

## Requirements

- Python 3.8+
- Chrome browser
- Anthropic API key with credits

## API Configuration

Backend uses port 8000 by default. To change:

Edit `main.py` last line: `uvicorn.run(app, host="0.0.0.0", port=XXXX)`

Edit `popup.js` line 8: `const API_BASE_URL = 'http://localhost:XXXX';`

## Supported Job Sites

- LinkedIn Jobs
- Lever (jobs.lever.co)
- Greenhouse (boards.greenhouse.io)
- Any site with /careers/ or /jobs/ in URL

Adding more sites: Edit extractors in `content.js`

## Version

2.0.0

## License

MIT