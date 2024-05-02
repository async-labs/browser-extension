// globals.d.ts
declare const chrome: any;
declare const $: any;

import { fetchAPI, sendMessage, setLocalStorage, tokenKey } from "./utils";

const changeIcon = (loading=false) => {
  chrome.action.setIcon({
    path: { "16": loading ? "icon16-loading.png" : "icon16.png" }
  });
}

const writeLog = (text: string) => {
  if (text) {
    $('#evaluation-log').text(text).css('visibility', 'visible');
  } else {
    $('#evaluation-log').css('visibility', 'hidden');
  }
};

const setLoading = () => {
  $('.evaluation-spinner').show();
  $('#pause').prop('disabled', false);

  changeIcon(true);
}

$('#evaluate').on('click', () => {
  writeLog('');
  setLoading();
  sendMessage({ action: 'evaluate' });
});

const setPaused = () => {
  writeLog('Paused.');
  $('.evaluation-spinner').hide();
  toggleButton(false);
  $('#pause').prop('disabled', true);

  changeIcon(false);
}

$('#pause').on('click', () => {
  sendMessage({ action: 'pause' });

  setPaused();
});

let isLoadedUserInfo = false;
let isLoggedIn = false;

const fetchUserInfo = async () => {
  $('.account-column').hide();
  $('#logout').hide();
  $('#login-wrapper').hide();
  $('#evaluation-container').hide();
  $('#evaluation-log').hide();
  $('#selected-job').hide();

  const info: any = await fetchAPI({
    action: 'get-status',
    data: { type: 'currentUser' },
    contentType: 'json',
  });

  isLoggedIn = info.status === 'loggedIn';

  if (isLoggedIn) {
    $('#logout').show();
    $('#evaluation-container').show();
    $('#evaluation-log').show();
    $('.account-column').show();
    $('#selected-job').show();

    const email = info.email.length > 'recruit@workinbiotech.com'.length ? (info.email.slice(0, 25) + '...') : info.email;
    $('#user-email').text(email);
  } else {
    // if invalid token stored in localStorage then remove it
    setLocalStorage(tokenKey, '');

    $('#login-wrapper').show();

    $('#user-info').hide();
    $('#summaries').hide();
  }

  isLoadedUserInfo = true;
}

$('#login').on('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: any[]) {
    window.open(`chrome-extension://${chrome.runtime.id}/options.html?redirect_url=${encodeURIComponent(tabs[0].url)}&tabId=${tabs[0].id}`)
  });
});

$('#logout').on('click', () => {
  chrome.runtime.sendMessage({ action: 'clearBadge' });
  chrome.runtime.sendMessage({ action: 'bg:loggedout' });
  sendMessage({ action: 'loggedout' })
  setLocalStorage(tokenKey, '');
  fetchUserInfo();
});

$('#user-info').on('click', () => {
  const menuBox = $('#logout-element');

  if(menuBox.css('display') == "block") { 
    menuBox.css('display', 'none')
  } else {
    menuBox.css('display', 'block')
  }
});

$('.options').on('click', () => {
  window.open(`chrome-extension://${chrome.runtime.id}/options.html`, '_blank');
});

const toggleButton = (isDisabled: boolean) => {
  $('#evaluate').prop('disabled', isDisabled);
};

chrome.runtime.onMessage.addListener(function (
  message: any,
  sender: any,
  sendResponse: any
) {
  if (message.action === 'writeLog') {
    writeLog(message.text);
  }

  if (message.action === 'toggleButton') {
    toggleButton(message.isDisabled);
  }

  if (message.action === 'runningStatus') {
    if (message.status === 'running') {
      toggleButton(true);
      setLoading();
      writeLog('This can take a few minutes. Please keep this tab open. Come back later.');
    } else {
      toggleButton(false);
      $('.evaluation-spinner').hide();
      writeLog('Done.');
    }
  }

  if (message.action === 'receiveJobTitle') {
    if (message.text) {
      $('#selected-job').show();
      $('#job').text(message.text);
    }
  }

  sendResponse({ response: 'Message received in popup script!' });
});

const init = (currentUrl: string) => {
  if (
    !currentUrl.includes('http://localhost:3000') &&
    !currentUrl.includes('breezy.hr')
  ) {
    $('#loader').hide();
    $('#logout').hide();
    $('#login-wrapper').hide();
    $('#evaluation-container').hide();
    $('#selected-job').hide();
    $('#help').text('AI-cruiter only works on Breezy');

    chrome.runtime.sendMessage({ action: 'clearBadge' });

    return;
  }

  $('#root').hide();

  const loaderInterval = setInterval(() => {
    if (isLoadedUserInfo) {
      $('#loader').hide();
      $('#root').show();
      clearInterval(loaderInterval);
    }
  }, 500)

  fetchUserInfo();

  changeIcon(false);

  $('.evaluation-spinner').hide();
  $('#pause').attr('disabled', true);

  chrome.action.getBadgeText({}, function() {
    sendMessage({ action: 'getJobTitleFromContent' });
  });

  sendMessage({ action: 'callRun', loginToken: localStorage.getItem(tokenKey) })
};

window.onload = async function () {
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs: any[]) {
    const response = await chrome.storage.sync.get('isAiCruiterReloaded');

    if (response && response.isAiCruiterReloaded === 'true') {
      await chrome.storage.sync.set({ 'isAiCruiterReloaded': '' });
      localStorage.setItem('aicruiter-first-refresh', '');
    }

    if (localStorage.getItem('aicruiter-first-refresh') !== 'true') {
      localStorage.setItem('aicruiter-first-refresh', 'true');
      $('#loader').hide();
      $('.evaluation-spinner').hide();
      chrome.tabs.reload(tabs[0].id);
    }

    init(tabs[0].url)
  });
};