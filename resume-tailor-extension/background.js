// Background service worker for Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Resume Tailor AI extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.action.openPopup();
  }
  return true;
});

// Update badge when on a job posting page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isJobPage = 
      tab.url.includes('linkedin.com/jobs') ||
      tab.url.includes('jobs.lever.co') ||
      tab.url.includes('boards.greenhouse.io') ||
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