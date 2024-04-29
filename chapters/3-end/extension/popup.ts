// globals.d.ts
declare const chrome: any;
declare const $: any;

import { fetchAPI, sendMessage, setLocalStorage, tokenKey } from "./utils";

let isLoadedUserInfo = false;
let isLoggedIn = false;

const fetchUserInfo = async () => {
  $('.account-column').hide();
  $('#logout').hide();
  $('#login-wrapper').hide();

  const info: any = await fetchAPI({
    action: 'get-status',
    data: { type: 'currentUser' },
    contentType: 'json',
  });

  isLoggedIn = info.status === 'loggedIn';

  if (isLoggedIn) {
    $('#logout').show();
    $('.account-column').show();
    $('#user-name').text(info.name);
    const email = info.email.length > 'recruit@workinbiotech.com'.length ? (info.email.slice(0, 25) + '...') : info.email;
    $('#user-email').text(email);
  } else {
    // if invalid token stored in localStorage then remove it
    setLocalStorage(tokenKey, '');

    $('#login-wrapper').show();

    $('#user-info').hide();
  }

  isLoadedUserInfo = true;
}

$('#login').on('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: any[]) {
    window.open(`chrome-extension://${chrome.runtime.id}/options.html?redirect_url=${encodeURIComponent(tabs[0].url)}&tabId=${tabs[0].id}`)
  });
});

$('#logout').on('click', () => {
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

const init = (currentUrl: string) => {
  if (
    !currentUrl.includes('http://localhost:3000') &&
    !currentUrl.includes('breezy.hr')
  ) {
    $('#loader').hide();
    $('#logout').hide();
    $('#login-wrapper').hide();
    return;
  }

  fetchUserInfo();
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
      chrome.tabs.reload(tabs[0].id);
    }

    init(tabs[0].url)
  });
};