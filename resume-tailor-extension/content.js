// Content script - Updated for LinkedIn's current structure (2025)
console.log('[Resume Tailor] Content script LOADED v3');
console.log('[Resume Tailor] URL:', window.location.href);
console.log('[Resume Tailor] Time:', new Date().toISOString());

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Resume Tailor] MESSAGE RECEIVED:', request);
  
  if (request.action === 'detectJobPosting') {
    try {
      console.log('[Resume Tailor] Starting job detection...');
      
      detectJobWithRetry()
        .then(jobData => {
          console.log('[Resume Tailor] Detection result:', jobData);
          sendResponse(jobData);
        })
        .catch(error => {
          console.error('[Resume Tailor] ERROR in detection:', error);
          sendResponse({ 
            found: false, 
            data: null, 
            error: error.message 
          });
        });
      
      return true;
    } catch (error) {
      console.error('[Resume Tailor] ERROR in detection:', error);
      sendResponse({ 
        found: false, 
        data: null, 
        error: error.message 
      });
      return true;
    }
  }
  return true;
});

async function detectJobWithRetry() {
  for (let i = 0; i < 3; i++) {
    const result = detectJob();
    if (result.found) {
      return result;
    }
    
    console.log(`[Resume Tailor] Attempt ${i + 1} failed, retrying in 1000ms...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return detectJob();
}

function detectJob() {
  const url = window.location.href;
  console.log('[Resume Tailor] Detecting job on:', url);
  
  if (url.includes('linkedin.com/jobs')) {
    console.log('[Resume Tailor] Detected LinkedIn');
    return extractLinkedIn();
  }
  if (url.includes('lever.co')) {
    console.log('[Resume Tailor] Detected Lever');
    return extractLever();
  }
  if (url.includes('greenhouse.io')) {
    console.log('[Resume Tailor] Detected Greenhouse');
    return extractGreenhouse();
  }
  if (url.includes('myworkdayjobs.com')) {
    console.log('[Resume Tailor] Detected Workday');
    return extractWorkday();
  }
  if (url.includes('/careers') || url.includes('/jobs') || url.includes('/job')) {
    console.log('[Resume Tailor] Using generic detection');
    return extractGeneric();
  }
  
  console.log('[Resume Tailor] No matching platform found');
  return { found: false, data: null };
}

function extractLinkedIn() {
  console.log('[Resume Tailor] LinkedIn extraction starting...');
  
  try {
    // Debug: Log all h1 and h2 elements to see what's available
    console.log('[Resume Tailor] DEBUG: Looking for title elements...');
    document.querySelectorAll('h1, h2').forEach((elem, i) => {
      const text = elem.textContent.trim();
      if (text && text.length > 3 && text.length < 200) {
        console.log(`  [${i}] <${elem.tagName} class="${elem.className}">: "${text.substring(0, 80)}"`);
      }
    });
    
    // Updated selectors for 2025 LinkedIn structure
    const titleSelectors = [
      // New structure (2024-2025)
      'h1.t-24.t-bold',
      'h2.t-24.t-bold', 
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      // Older structure
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.t-24.t-bold.job-details-jobs-unified-top-card__job-title',
      // Generic fallbacks
      'h1.job-title',
      'h2.job-title',
      '[data-job-title]',
      'article h1',
      'article h2',
      // Last resort: any large heading
      'h1.t-24',
      'h2.t-24',
      'h1',
      'h2'
    ];
    
    let title = null;
    for (const selector of titleSelectors) {
      try {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          // Filter out navigation/header titles
          if (text && 
              text.length > 3 && 
              text.length < 200 &&
              !text.toLowerCase().includes('linkedin') &&
              !text.toLowerCase().includes('search') &&
              !text.toLowerCase().includes('my network') &&
              !text.toLowerCase().includes('messaging')) {
            title = text;
            console.log(`[Resume Tailor] ✓ Found title with "${selector}": "${title.substring(0, 50)}"`);
            break;
          }
        }
      } catch (e) {
        // Selector failed, try next
      }
    }
    
    // Company extraction with updated selectors
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      'a.app-aware-link[href*="/company/"]',
      '.jobs-details-top-card__company-url',
      '.jobs-company-name',
      '[data-test-company-name]',
      '.job-details-jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__job-title'
    ];
    
    let company = 'Unknown Company';
    for (const selector of companySelectors) {
      try {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          if (text && text.length > 1 && text.length < 100) {
            company = text;
            console.log(`[Resume Tailor] ✓ Found company with "${selector}": "${company}"`);

          }
        }
      } catch (e) {}
    }
    
    // Location extraction
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .t-black--light.mt2',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__workplace-type',
      '.jobs-details-top-card__location',
      '[class*="location"]'
    ];
    
    let location = 'Remote';
    for (const selector of locationSelectors) {
      try {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          if (text && text.length > 2 && text.length < 100) {
            location = text;
            console.log(`[Resume Tailor] ✓ Found location with "${selector}": "${location}"`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Description extraction (most reliable part)
    const descriptionSelectors = [
      '.jobs-description__content .jobs-description-content__text',
      '.jobs-description-content__text',
      '.jobs-description__content',
      '.jobs-box__html-content',
      '#job-details',
      'article.jobs-description',
      '[class*="job-description"]'
    ];
    
    let description = '';
    for (const selector of descriptionSelectors) {
      try {
        const elem = document.querySelector(selector);
        if (elem) {
          const text = elem.textContent.trim();
          if (text.length > 100) {
            description = text;
            console.log(`[Resume Tailor] ✓ Found description with "${selector}": ${description.length} chars`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Fallback to body if needed
    if (!description || description.length < 100) {
      description = document.body.textContent.trim();
      console.log('[Resume Tailor] ⚠ Using body text as fallback:', description.length, 'chars');
    }
    
    console.log('[Resume Tailor] LinkedIn extraction summary:');
    console.log('  - Title:', title ? `"${title.substring(0, 50)}"` : '❌ NOT FOUND');
    console.log('  - Company:', company);
    console.log('  - Location:', location);
    console.log('  - Description:', description.length, 'chars');
    
    if (title && description && description.length > 50) {
      const result = {
        found: true,
        data: { 
          title, 
          company, 
          location, 
          description, 
          url: window.location.href
        }
      };
      console.log('[Resume Tailor] LinkedIn job found!');
      return result;
    } else {
      console.log('[Resume Tailor] LinkedIn job NOT found');
      console.log('[Resume Tailor] Missing:', !title ? 'title' : '', !description ? 'description' : '');
      
      // Additional debug: Show what we can find
      if (!title) {
        console.log('[Resume Tailor] DEBUG: Available headings:');
        document.querySelectorAll('h1, h2, h3').forEach((h, i) => {
          if (i < 10) { // Only show first 10
            console.log(`  ${h.tagName}: "${h.textContent.trim().substring(0, 60)}"`);
          }
        });
      }
    }
  } catch (e) {
    console.error('[Resume Tailor] LinkedIn extraction error:', e);
  }
  
  return { found: false, data: null };
}

function extractLever() {
  try {
    const title = document.querySelector('.posting-headline h2')?.textContent.trim() ||
                  document.querySelector('h2')?.textContent.trim();
    
    const company = document.querySelector('.main-header-text a')?.textContent.trim() || 'Unknown Company';
    const location = document.querySelector('.posting-categories .location')?.textContent.trim() || 'Remote';
    const description = document.querySelector('.content')?.textContent.trim() || document.body.textContent.trim();
    
    if (title && description && description.length > 50) {
      return {
        found: true,
        data: { title, company, location, description, url: window.location.href }
      };
    }
  } catch (e) {
    console.error('[Resume Tailor] Lever error:', e);
  }
  
  return { found: false, data: null };
}

function extractGreenhouse() {
  try {
    const title = document.querySelector('.app-title')?.textContent.trim() ||
                  document.querySelector('h1')?.textContent.trim();
    
    const company = document.querySelector('.company-name')?.textContent.trim() || 'Unknown Company';
    const location = document.querySelector('.location')?.textContent.trim() || 'Remote';
    const description = document.querySelector('#content')?.textContent.trim() || document.body.textContent.trim();
    
    if (title && description && description.length > 50) {
      return {
        found: true,
        data: { title, company, location, description, url: window.location.href }
      };
    }
  } catch (e) {
    console.error('[Resume Tailor] Greenhouse error:', e);
  }
  
  return { found: false, data: null };
}

function extractWorkday() {
  try {
    const title = document.querySelector('[data-automation-id="jobPostingHeader"]')?.textContent.trim() ||
                  document.querySelector('h2')?.textContent.trim();
    
    const company = document.querySelector('[data-automation-id="companyName"]')?.textContent.trim() || 'Unknown Company';
    const location = document.querySelector('[data-automation-id="locations"]')?.textContent.trim() || 'Remote';
    const description = document.querySelector('[data-automation-id="jobPostingDescription"]')?.textContent.trim() || document.body.textContent.trim();
    
    if (title && description && description.length > 50) {
      return {
        found: true,
        data: { title, company, location, description, url: window.location.href }
      };
    }
  } catch (e) {
    console.error('[Resume Tailor] Workday error:', e);
  }
  
  return { found: false, data: null };
}

function extractGeneric() {
  try {
    const title = document.querySelector('h1')?.textContent.trim() ||
                  document.querySelector('h2')?.textContent.trim();
    
    const company = document.querySelector('meta[property="og:site_name"]')?.content ||
                    document.title.split('|')[0].trim() ||
                    'Unknown Company';
    
    const location = 'Remote';
    const description = document.querySelector('main')?.textContent.trim() || document.body.textContent.trim();
    
    const descLower = description.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    
    const hasJobKeywords = 
      titleLower.includes('engineer') ||
      titleLower.includes('developer') ||
      titleLower.includes('manager') ||
      titleLower.includes('designer') ||
      titleLower.includes('analyst') ||
      descLower.includes('responsibilities') ||
      descLower.includes('qualifications') ||
      descLower.includes('requirements') ||
      descLower.includes('experience') ||
      descLower.includes('skills');
    
    if (title && description && description.length > 200 && hasJobKeywords) {
      return {
        found: true,
        data: { title, company, location, description, url: window.location.href }
      };
    }
  } catch (e) {
    console.error('[Resume Tailor] Generic error:', e);
  }
  
  return { found: false, data: null };
}

console.log('[Resume Tailor] Content script setup complete');

// Auto-detect on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(autoDetect, 2000);
  });
} else {
  setTimeout(autoDetect, 2000);
}

async function autoDetect() {
  console.log('[Resume Tailor] Auto-detecting after page load...');
  const result = await detectJobWithRetry();
  console.log('[Resume Tailor] Auto-detect result:', result);
}