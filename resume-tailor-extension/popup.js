let file = null;
let job = null;
let resume = null;
let cover = null;

const API = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[Popup] Initializing...');
  setupListeners();
  await checkJob();
  await loadFile();
  console.log('[Popup] Initialization complete');
}

function setupListeners() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  
  document.getElementById('remove-btn').addEventListener('click', removeFile);
  document.getElementById('edit-btn').addEventListener('click', editFile);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveEdit);
  document.getElementById('tailor-btn').addEventListener('click', generate);
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copy(btn.dataset.target));
  });
  
  document.getElementById('download-btn').addEventListener('click', download);
}

async function checkJob() {
  console.log('[Popup] Starting job detection...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[Popup] Active tab:', tab.url);
    
    // Check if we can inject on this page
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('[Popup] Cannot inject on this page type');
      setStatus('Cannot detect jobs on this page');
      updateBtn();
      return;
    }
    
    // Always try to inject content script first (it's safe to inject multiple times)
    console.log('[Popup] Injecting content script...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('[Popup] Content script injected successfully');
    } catch (injectError) {
      console.error('[Popup] Failed to inject content script:', injectError);
      // Continue anyway - maybe it's already injected
    }
    
    // Wait a moment for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now try to communicate
    console.log('[Popup] Sending message to content script...');
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'detectJobPosting' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Chrome runtime error:', chrome.runtime.lastError.message);
          setStatus('No job detected');
          updateBtn();
          return;
        }
        
        handleJobResponse(response);
      }
    );
  } catch (e) {
    console.error('[Popup] Job detection error:', e);
    setStatus('Error detecting job');
    updateBtn();
  }
}

function handleJobResponse(response) {
  console.log('[Popup] Received response:', response);
  
  if (response && response.found) {
    job = response.data;
    console.log('[Popup] Job detected:', job);
    setStatus('Job detected ✓');
    showJob(job);
  } else {
    console.log('[Popup] No job found in response');
    setStatus('No job detected');
  }
  updateBtn();
}

async function loadFile() {
  const stored = await chrome.storage.local.get(['masterResume']);
  if (stored.masterResume) {
    file = stored.masterResume;
    console.log('[Popup] Loaded stored resume:', file.name);
    showFile();
  } else {
    console.log('[Popup] No stored resume found');
  }
  updateBtn();
}

async function handleFile(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
    alert('PDF, DOC, DOCX, or TXT only');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async e => {
    file = { name: f.name, size: f.size, content: e.target.result };
    await chrome.storage.local.set({ masterResume: file });
    console.log('[Popup] Resume uploaded:', file.name);
    showFile();
    updateBtn();
  };
  reader.readAsText(f);
}

function showFile() {
  document.getElementById('upload-zone').classList.add('hidden');
  document.getElementById('file-display').classList.remove('hidden');
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent = formatSize(file.size);
}

async function removeFile() {
  file = null;
  await chrome.storage.local.remove('masterResume');
  document.getElementById('upload-zone').classList.remove('hidden');
  document.getElementById('file-display').classList.add('hidden');
  document.getElementById('file-input').value = '';
  updateBtn();
}

function editFile() {
  document.getElementById('resume-editor').value = file.content;
  document.getElementById('editor-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('editor-modal').classList.add('hidden');
}

async function saveEdit() {
  file.content = document.getElementById('resume-editor').value;
  await chrome.storage.local.set({ masterResume: file });
  closeModal();
}

function showJob(data) {
  document.getElementById('job-section').classList.remove('hidden');
  document.getElementById('job-title').textContent = data.title;
  document.getElementById('job-company').textContent = data.company;
  document.getElementById('job-location').textContent = data.location;
}

function setStatus(text) {
  console.log('[Popup] Status:', text);
  document.getElementById('status-text').textContent = text;
}

function updateBtn() {
  const isEnabled = !!(file && job);
  console.log('[Popup] Generate button enabled:', isEnabled, '(file:', !!file, ', job:', !!job, ')');
  document.getElementById('tailor-btn').disabled = !isEnabled;
}

async function generate() {
  const resultsSection = document.getElementById('results-section');
  const resumeText = document.getElementById('resume-text');
  const coverText = document.getElementById('cover-text');
  
  resultsSection.classList.remove('hidden');
  
  resumeText.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Generating resume...</div></div>';
  coverText.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Generating cover letter...</div></div>';
  
  const instructions = document.getElementById('custom-instructions').value;
  
  try {
    const res = await fetch(`${API}/api/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume: file.content,
        jobDescription: job.description,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        customInstructions: instructions || null
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error (${res.status}): ${errorText}`);
    }
    
    const data = await res.json();
    resume = data.resume;
    cover = data.coverLetter;
    
    if (!resume || resume.trim().length === 0) {
      throw new Error('Empty resume returned from API');
    }
    
    if (!cover || cover.trim().length === 0) {
      throw new Error('Empty cover letter returned from API');
    }
    
    resumeText.textContent = resume;
    coverText.textContent = cover;
    
    document.querySelectorAll('.copy-btn').forEach(btn => btn.disabled = false);
    document.getElementById('download-btn').disabled = false;
    
  } catch (e) {
    console.error('Generation error:', e);
    resumeText.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444">
      <svg style="width:48px;height:48px;margin:0 auto 16px;display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <strong>Error:</strong> ${e.message}<br><br>
      <small style="color:#666">Make sure the backend is running at ${API}</small>
    </div>`;
    coverText.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444">
      <strong>Error:</strong> ${e.message}
    </div>`;
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.getElementById('resume-content').classList.toggle('active', name === 'resume');
  document.getElementById('cover-content').classList.toggle('active', name === 'cover');
}

async function copy(target) {
  const text = target === 'resume' ? resume : cover;
  if (!text) return;
  
  await navigator.clipboard.writeText(text);
  const btn = document.querySelector(`[data-target="${target}"]`);
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Copied';
  setTimeout(() => btn.innerHTML = orig, 2000);
}

function download() {
  if (!resume || !cover) return;
  const text = `RESUME\n${'='.repeat(50)}\n\n${resume}\n\n\nCOVER LETTER\n${'='.repeat(50)}\n\n${cover}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${job.company || 'job'}-application.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

