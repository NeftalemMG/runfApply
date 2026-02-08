const input = document.getElementById('terminal-input');
const output = document.getElementById('output');
const cursor = document.querySelector('.cursor');

let history = [];
let historyIndex = -1;

const commands = {
  help: showHelp,
  install: showInstall,
  status: checkStatus,
  features: showFeatures,
  platforms: showPlatforms,
  clear: clearTerminal,
  download: showDownload,
  docs: showDocs,
  demo: runDemo,
  version: showVersion,
  ls: listFiles,
  cat: catFile,
  ping: pingAPI
};

// Update time
setInterval(() => {
  const now = new Date();
  document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour12: false });
}, 1000);

// Simulate CPU/MEM
let cpu = 0;
let mem = 128;
setInterval(() => {
  cpu = Math.floor(Math.random() * 15) + 5;
  mem = Math.floor(Math.random() * 50) + 100;
  document.getElementById('cpu').textContent = cpu + '%';
  document.getElementById('mem').textContent = mem + 'MB';
}, 2000);

// Check extension status
checkExtensionStatus();

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const cmd = input.value.trim();
    if (cmd) {
      history.unshift(cmd);
      historyIndex = -1;
      executeCommand(cmd);
      input.value = '';
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
    } else {
      historyIndex = -1;
      input.value = '';
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    autocomplete();
  }
});

function executeCommand(cmd) {
  addLine('command', cmd);
  
  const parts = cmd.split(' ');
  const command = parts[0];
  const args = parts.slice(1);
  
  if (commands[command]) {
    commands[command](args);
  } else if (cmd === 'exit' || cmd === 'quit') {
    addOutput('Use Ctrl+W to close this tab', 'warning');
  } else {
    addOutput(`Command not found: ${command}`, 'error');
    addOutput('Type \'help\' for available commands', 'suggestion');
  }
}

function addLine(type, content) {
  const line = document.createElement('div');
  line.className = 'line';
  
  if (type === 'command') {
    line.innerHTML = `
      <span class="prompt">root@resume-tailor</span>
      <span class="path">~</span>
      <span class="symbol">$</span>
      <span class="command">${content}</span>
    `;
  }
  
  output.appendChild(line);
  scrollToBottom();
}

function addOutput(content, className = '') {
  const line = document.createElement('div');
  line.className = `line output-text ${className}`;
  line.innerHTML = content;
  output.appendChild(line);
  scrollToBottom();
}

function scrollToBottom() {
  output.parentElement.scrollTop = output.parentElement.scrollHeight;
}

function showHelp() {
  addOutput(`
    <div class="help-grid">
      <div class="help-item">
        <div class="help-cmd">help</div>
        <div class="help-desc">Show this help menu</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">install</div>
        <div class="help-desc">Installation instructions</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">status</div>
        <div class="help-desc">Check system status</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">features</div>
        <div class="help-desc">List all features</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">platforms</div>
        <div class="help-desc">Supported job platforms</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">download</div>
        <div class="help-desc">Download extension</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">demo</div>
        <div class="help-desc">Run interactive demo</div>
      </div>
      <div class="help-item">
        <div class="help-cmd">clear</div>
        <div class="help-desc">Clear terminal</div>
      </div>
    </div>
  `);
}

function showInstall() {
  addOutput(`
    <div class="download-box">
      <div class="download-title">INSTALLATION GUIDE</div>
      <div class="download-steps">
        <div class="step">
          <span class="step-num">1.</span>
          <span class="step-text">Clone repository:<span class="step-code">git clone https://github.com/you/resume-tailor</span></span>
        </div>
        <div class="step">
          <span class="step-num">2.</span>
          <span class="step-text">Install backend:<span class="step-code">cd backend && pip install -r requirements.txt</span></span>
        </div>
        <div class="step">
          <span class="step-num">3.</span>
          <span class="step-text">Set API key:<span class="step-code">export ANTHROPIC_API_KEY='your-key'</span></span>
        </div>
        <div class="step">
          <span class="step-num">4.</span>
          <span class="step-text">Start server:<span class="step-code">python main.py</span></span>
        </div>
        <div class="step">
          <span class="step-num">5.</span>
          <span class="step-text">Load extension in Chrome:<span class="step-code">chrome://extensions/</span></span>
        </div>
      </div>
    </div>
  `);
}

function checkStatus() {
  addOutput('Checking system status...');
  setTimeout(() => {
    addOutput(`
      <div class="status-grid">
        <div class="status-item">
          <div class="status-icon active"></div>
          <span>API Server</span>
          <span class="status-value success">ACTIVE</span>
        </div>
        <div class="status-item">
          <div class="status-icon active"></div>
          <span>Job Detection</span>
          <span class="status-value success">RUNNING</span>
        </div>
        <div class="status-item">
          <div class="status-icon active"></div>
          <span>Claude AI</span>
          <span class="status-value success">CONNECTED</span>
        </div>
        <div class="status-item">
          <div class="status-icon"></div>
          <span>Chrome Extension</span>
          <span class="status-value" id="status-ext">CHECKING...</span>
        </div>
      </div>
    `, 'success');
    checkExtensionStatus();
  }, 500);
}

function showFeatures() {
  addOutput(`
    <div class="ls-output">
      <div class="ls-item">
        <span class="permissions">-rwxr-xr-x</span>
        <span class="owner">1 root</span>
        <span class="size">2.4K</span>
        <span class="date">Feb 08</span>
        <span class="name">Auto job detection (LinkedIn, Lever, Greenhouse, Workday)</span>
      </div>
      <div class="ls-item">
        <span class="permissions">-rwxr-xr-x</span>
        <span class="owner">1 root</span>
        <span class="size">5.1K</span>
        <span class="date">Feb 08</span>
        <span class="name">AI-powered resume tailoring (Claude Sonnet 4)</span>
      </div>
      <div class="ls-item">
        <span class="permissions">-rwxr-xr-x</span>
        <span class="owner">1 root</span>
        <span class="size">1.8K</span>
        <span class="date">Feb 08</span>
        <span class="name">Custom cover letter generation</span>
      </div>
      <div class="ls-item">
        <span class="permissions">-rwxr-xr-x</span>
        <span class="owner">1 root</span>
        <span class="size">3.2K</span>
        <span class="date">Feb 08</span>
        <span class="name">Resume editing in-browser</span>
      </div>
      <div class="ls-item">
        <span class="permissions">-rwxr-xr-x</span>
        <span class="owner">1 root</span>
        <span class="size">1.1K</span>
        <span class="date">Feb 08</span>
        <span class="name">Custom instructions support</span>
      </div>
    </div>
  `);
}

function showPlatforms() {
  addOutput(`
    <div class="ls-output">
      <div class="ls-item">
        <span class="permissions" style="color: #00ff00">SUPPORTED</span>
        <span class="owner">100%</span>
        <span class="size">FULL</span>
        <span class="date">v2.0</span>
        <span class="name">LinkedIn Jobs</span>
      </div>
      <div class="ls-item">
        <span class="permissions" style="color: #00ff00">SUPPORTED</span>
        <span class="owner">100%</span>
        <span class="size">FULL</span>
        <span class="date">v2.0</span>
        <span class="name">Lever (jobs.lever.co)</span>
      </div>
      <div class="ls-item">
        <span class="permissions" style="color: #00ff00">SUPPORTED</span>
        <span class="owner">100%</span>
        <span class="size">FULL</span>
        <span class="date">v2.0</span>
        <span class="name">Greenhouse (boards.greenhouse.io)</span>
      </div>
      <div class="ls-item">
        <span class="permissions" style="color: #00ff00">SUPPORTED</span>
        <span class="owner">100%</span>
        <span class="size">FULL</span>
        <span class="date">v2.0</span>
        <span class="name">Workday (myworkdayjobs.com)</span>
      </div>
      <div class="ls-item">
        <span class="permissions" style="color: #ffff00">PARTIAL</span>
        <span class="owner">85%</span>
        <span class="size">BETA</span>
        <span class="date">v2.0</span>
        <span class="name">Generic /careers/ pages</span>
      </div>
    </div>
  `);
}

function clearTerminal() {
  output.innerHTML = '';
}

function showDownload() {
  addOutput('Opening download page...', 'success');
  setTimeout(() => {
    window.open('https://github.com/your-repo/resume-tailor', '_blank');
  }, 500);
}

function showDocs() {
  addOutput('Documentation: https://docs.resume-tailor.ai', 'success');
}

function runDemo() {
  addOutput('Starting interactive demo...', 'success');
  let step = 0;
  const steps = [
    'Detecting job posting...',
    'Job found: Senior Software Engineer at Google',
    'Loading resume: john-doe-resume.pdf',
    'Sending to Claude AI...',
    'Tailoring resume for this position...',
    'Generating custom cover letter...',
    'Complete! Resume tailored in 8.3 seconds'
  ];
  
  const interval = setInterval(() => {
    if (step < steps.length) {
      addOutput(steps[step], step === steps.length - 1 ? 'success' : '');
      step++;
    } else {
      clearInterval(interval);
    }
  }, 800);
}

function showVersion() {
  addOutput('Resume Tailor AI v2.0.0', 'success');
  addOutput('Build: 20250208', '');
  addOutput('Engine: Claude Sonnet 4', '');
}

function listFiles(args) {
  if (args[0] === '-la' || args[0] === '-l') {
    showFeatures();
  } else {
    addOutput('backend/  extension/  docs/  README.md');
  }
}

function catFile(args) {
  if (!args[0]) {
    addOutput('Usage: cat <filename>', 'error');
    return;
  }
  
  if (args[0] === 'README.md') {
    addOutput('# Resume Tailor AI\nAI-powered resume tailoring for job applications.\nType \'install\' for setup instructions.', 'success');
  } else {
    addOutput(`cat: ${args[0]}: No such file`, 'error');
  }
}

function pingAPI() {
  addOutput('Pinging localhost:8000...', '');
  setTimeout(() => {
    const latency = Math.floor(Math.random() * 50) + 10;
    addOutput(`Response from 127.0.0.1: time=${latency}ms`, 'success');
  }, 500);
}

function autocomplete() {
  const value = input.value;
  const matches = Object.keys(commands).filter(cmd => cmd.startsWith(value));
  if (matches.length === 1) {
    input.value = matches[0];
  } else if (matches.length > 1) {
    addOutput(matches.join('  '), 'suggestion');
  }
}

function checkExtensionStatus() {
  const statusEl = document.getElementById('ext-status');
  if (statusEl) {
    statusEl.textContent = 'NOT INSTALLED';
    statusEl.className = 'status-value error';
  }
}

// Keep cursor visible
setInterval(() => {
  cursor.style.visibility = document.activeElement === input ? 'visible' : 'hidden';
}, 100);

// Focus input on click
document.addEventListener('click', () => input.focus());