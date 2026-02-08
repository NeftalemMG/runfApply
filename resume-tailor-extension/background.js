// Background service worker for Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('RunF Apply extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    // Note: chrome.action.openPopup() requires user gesture in MV3
    // This action is typically not needed - popup opens when user clicks icon
    console.log('Open popup requested - user must click extension icon');
  }
  return true;
});

// Update badge when on a job posting page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when page is complete and we have a URL
  if (changeInfo.status === 'complete' && tab.url) {
    const isJobPage = 
      tab.url.includes('linkedin.com/jobs') ||
      tab.url.includes('jobs.lever.co') ||
      tab.url.includes('boards.greenhouse.io') ||
      tab.url.includes('myworkdayjobs.com') ||
      tab.url.includes('/careers') ||
      tab.url.includes('/jobs');

    if (isJobPage) {
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#86efac', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

console.log('Background service worker loaded');