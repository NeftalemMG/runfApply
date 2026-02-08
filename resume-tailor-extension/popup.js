// State management
let uploadedFile = null;
let jobData = null;
let tailoredResume = null;
let coverLetter = null;

// API Configuration
const API_BASE_URL = 'http://localhost:8000'; // Update this when deploying

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

async function initializePopup() {
  // Check if we're on a job posting page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'detectJobPosting' }, (response) => {
    if (chrome.runtime.lastError) {
      updateStatus('Navigate to a job posting', false);
      return;
    }
    
    if (response && response.found) {
      jobData = response.data;
      updateStatus('Job posting detected!', true);
      displayJobInfo(response.data);
    } else {
      updateStatus('No job posting detected', false);
    }
  });

  // Check for previously uploaded resume
  const stored = await chrome.storage.local.get(['masterResume']);
  if (stored.masterResume) {
    uploadedFile = stored.masterResume;
    showFileInfo(stored.masterResume);
  }

  updateTailorButton();
}

function setupEventListeners() {
  // Upload button
  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  // File input
  document.getElementById('file-input').addEventListener('change', handleFileUpload);

  // Remove file
  document.getElementById('remove-file').addEventListener('click', removeFile);

  // Drag and drop
  const uploadArea = document.getElementById('upload-area');
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--accent-purple)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--glass-border)';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--glass-border)';
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  // Tailor button
  document.getElementById('tailor-btn').addEventListener('click', tailorResume);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyContent(btn.dataset.target));
  });

  // Download button
  document.getElementById('download-btn').addEventListener('click', downloadDocuments);

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) processFile(file);
}

async function processFile(file) {
  // Validate file type
  const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!validTypes.includes(fileExtension)) {
    alert('Please upload a PDF, DOC, DOCX, or TXT file.');
    return;
  }

  // Read file content
  const reader = new FileReader();
  reader.onload = async (e) => {
    const fileData = {
      name: file.name,
      size: file.size,
      content: e.target.result,
      type: file.type
    };

    uploadedFile = fileData;
    
    // Save to storage
    await chrome.storage.local.set({ masterResume: fileData });
    
    showFileInfo(fileData);
    updateTailorButton();
  };

  reader.readAsText(file);
}

function showFileInfo(fileData) {
  document.getElementById('upload-area').style.display = 'none';
  document.getElementById('file-info').classList.remove('hidden');
  document.getElementById('file-name').textContent = fileData.name;
  document.getElementById('file-size').textContent = formatFileSize(fileData.size);
}

async function removeFile() {
  uploadedFile = null;
  await chrome.storage.local.remove('masterResume');
  
  document.getElementById('upload-area').style.display = 'block';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('file-input').value = '';
  
  updateTailorButton();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateStatus(text, success = true) {
  const statusText = document.getElementById('status-text');
  const pulse = document.querySelector('.pulse');
  
  statusText.textContent = text;
  
  if (success) {
    pulse.style.background = 'var(--accent-green)';
    pulse.style.boxShadow = 'var(--shadow-glow-green)';
  } else {
    pulse.style.background = 'var(--accent-purple)';
    pulse.style.boxShadow = 'var(--shadow-glow-purple)';
  }
}

function displayJobInfo(data) {
  document.getElementById('job-section').classList.remove('hidden');
  document.getElementById('job-title').textContent = data.title || 'Job Title';
  document.getElementById('company-name').textContent = data.company || 'Company Name';
  document.getElementById('job-location').textContent = data.location || 'Location';
}

function updateTailorButton() {
  const btn = document.getElementById('tailor-btn');
  const canTailor = uploadedFile && jobData;
  btn.disabled = !canTailor;
}

async function tailorResume() {
  // Show results section with loading state
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('resume-content').innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Tailoring your resume...</p>
    </div>
  `;
  document.getElementById('cover-letter-content').innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Generating cover letter...</p>
    </div>
  `;

  try {
    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/tailor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resume: uploadedFile.content,
        jobDescription: jobData.description,
        jobTitle: jobData.title,
        company: jobData.company,
        location: jobData.location
      })
    });

    if (!response.ok) {
      throw new Error('Failed to tailor resume');
    }

    const result = await response.json();
    
    tailoredResume = result.resume;
    coverLetter = result.coverLetter;

    // Display results
    displayResults(result);
    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('resume-content').innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
        <p>⚠️ Error: ${error.message}</p>
        <p style="margin-top: 8px; font-size: 12px;">Make sure the backend server is running.</p>
      </div>
    `;
    document.getElementById('cover-letter-content').innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
        <p>⚠️ Error: ${error.message}</p>
      </div>
    `;
  }
}

function displayResults(result) {
  // Display resume
  document.getElementById('resume-content').innerHTML = `
    <pre style="white-space: pre-wrap; font-family: 'SF Pro Display', sans-serif;">${escapeHtml(result.resume)}</pre>
  `;

  // Display cover letter
  document.getElementById('cover-letter-content').innerHTML = `
    <pre style="white-space: pre-wrap; font-family: 'SF Pro Display', sans-serif;">${escapeHtml(result.coverLetter)}</pre>
  `;
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

async function copyContent(target) {
  const content = target === 'resume' ? tailoredResume : coverLetter;
  
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    
    // Show feedback
    const btn = document.querySelector(`[data-target="${target}"]`);
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

function downloadDocuments() {
  if (!tailoredResume || !coverLetter) return;

  // Create a text file with both documents
  const content = `TAILORED RESUME\n${'='.repeat(50)}\n\n${tailoredResume}\n\n\nCOVER LETTER\n${'='.repeat(50)}\n\n${coverLetter}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tailored-application-${jobData.company || 'job'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openSettings() {
  // Open settings page or chrome extension options
  chrome.runtime.openOptionsPage();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}