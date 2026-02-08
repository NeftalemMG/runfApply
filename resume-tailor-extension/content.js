// Content script - runs on job posting pages to extract information

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectJobPosting') {
    const jobData = extractJobPosting();
    sendResponse(jobData);
  }
  return true;
});

function extractJobPosting() {
  const url = window.location.href;
  let jobData = { found: false, data: null };

  // LinkedIn Jobs
  if (url.includes('linkedin.com/jobs')) {
    jobData = extractLinkedIn();
  }
  // Lever
  else if (url.includes('jobs.lever.co')) {
    jobData = extractLever();
  }
  // Greenhouse
  else if (url.includes('boards.greenhouse.io')) {
    jobData = extractGreenhouse();
  }
  // Generic career pages
  else if (url.includes('/careers') || url.includes('/jobs')) {
    jobData = extractGeneric();
  }

  return jobData;
}

function extractLinkedIn() {
  try {
    const title = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent.trim() ||
                  document.querySelector('.jobs-unified-top-card__job-title')?.textContent.trim();
    
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent.trim() ||
                    document.querySelector('.jobs-unified-top-card__company-name')?.textContent.trim();
    
    const location = document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent.trim() ||
                     document.querySelector('.jobs-unified-top-card__bullet')?.textContent.trim();
    
    const description = document.querySelector('.jobs-description-content__text')?.textContent.trim() ||
                        document.querySelector('.jobs-description')?.textContent.trim() ||
                        document.querySelector('.description__text')?.textContent.trim();

    if (title && description) {
      return {
        found: true,
        data: {
          title,
          company: company || 'Unknown Company',
          location: location || 'Location not specified',
          description,
          url: window.location.href
        }
      };
    }
  } catch (error) {
    console.error('LinkedIn extraction error:', error);
  }

  return { found: false, data: null };
}

function extractLever() {
  try {
    const title = document.querySelector('.posting-headline h2')?.textContent.trim();
    const company = document.querySelector('.main-header-text a')?.textContent.trim();
    const location = document.querySelector('.posting-categories .location')?.textContent.trim();
    const description = document.querySelector('.content.content-wrapper')?.textContent.trim();

    if (title && description) {
      return {
        found: true,
        data: {
          title,
          company: company || 'Unknown Company',
          location: location || 'Location not specified',
          description,
          url: window.location.href
        }
      };
    }
  } catch (error) {
    console.error('Lever extraction error:', error);
  }

  return { found: false, data: null };
}

function extractGreenhouse() {
  try {
    const title = document.querySelector('#header .app-title')?.textContent.trim() ||
                  document.querySelector('.app-title')?.textContent.trim();
    
    const company = document.querySelector('#header .company-name')?.textContent.trim() ||
                    document.querySelector('.company-name')?.textContent.trim();
    
    const location = document.querySelector('.location')?.textContent.trim();
    
    const description = document.querySelector('#content')?.textContent.trim() ||
                        document.querySelector('.content')?.textContent.trim();

    if (title && description) {
      return {
        found: true,
        data: {
          title,
          company: company || 'Unknown Company',
          location: location || 'Location not specified',
          description,
          url: window.location.href
        }
      };
    }
  } catch (error) {
    console.error('Greenhouse extraction error:', error);
  }

  return { found: false, data: null };
}

function extractGeneric() {
  try {
    // Try common patterns for job title
    const titleSelectors = [
      'h1[class*="job"]',
      'h1[class*="title"]',
      'h1[class*="position"]',
      '.job-title',
      '.position-title',
      '[data-job-title]',
      'h1'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        title = el.textContent.trim();
        break;
      }
    }

    // Try common patterns for company
    const companySelectors = [
      '[class*="company"]',
      '.organization',
      '.employer',
      'meta[property="og:site_name"]'
    ];

    let company = null;
    for (const selector of companySelectors) {
      const el = document.querySelector(selector);
      if (el) {
        company = el.textContent?.trim() || el.content?.trim();
        if (company) break;
      }
    }

    // Try common patterns for location
    const locationSelectors = [
      '[class*="location"]',
      '[class*="office"]',
      '.region',
      '.city'
    ];

    let location = null;
    for (const selector of locationSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        location = el.textContent.trim();
        break;
      }
    }

    // Try to get full description
    const descriptionSelectors = [
      '[class*="description"]',
      '[class*="content"]',
      '[class*="details"]',
      'article',
      'main'
    ];

    let description = null;
    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 200) {
        description = el.textContent.trim();
        break;
      }
    }

    if (title && description) {
      return {
        found: true,
        data: {
          title,
          company: company || document.title.split('|')[0].trim() || 'Unknown Company',
          location: location || 'Location not specified',
          description,
          url: window.location.href
        }
      };
    }
  } catch (error) {
    console.error('Generic extraction error:', error);
  }

  return { found: false, data: null };
}

// Inject floating button when job is detected
function injectFloatingButton() {
  const existingBtn = document.getElementById('resume-tailor-float-btn');
  if (existingBtn) return;

  const jobData = extractJobPosting();
  if (!jobData.found) return;

  const floatingBtn = document.createElement('div');
  floatingBtn.id = 'resume-tailor-float-btn';
  floatingBtn.innerHTML = `
    <button class="resume-tailor-float">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="url(#gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="gradient" x1="3" y1="3" x2="21" y2="21">
            <stop offset="0%" stop-color="#c084fc"/>
            <stop offset="100%" stop-color="#86efac"/>
          </linearGradient>
        </defs>
      </svg>
      <span>Tailor Resume</span>
    </button>
  `;

  document.body.appendChild(floatingBtn);

  floatingBtn.querySelector('button').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
}

// Try to inject button after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectFloatingButton, 1000);
  });
} else {
  setTimeout(injectFloatingButton, 1000);
}