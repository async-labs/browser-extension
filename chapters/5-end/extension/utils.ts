// globals.d.ts
declare const chrome: any;

// Replace this value to test on lever.co with https://hire.lever.co
export const HOST = process.env.HOST || '';

export const API_URL = process.env.API_URL || '';

export const tokenKey = 'ai-cruiter-auth-token';

export const doFetch = ({
  url,
  method = 'GET',
  contentType = 'text',
  body,
  headers,
}: {
  url: string;
  method?: string;
  contentType?: 'text' | 'json';
  body?: any;
  headers?: any;
}) => {
  return new Promise(function (resolve, reject) {
    fetch(url.includes('http') ? url : `${HOST}${url}`, {
      method,
      body,
      credentials: 'include',
      headers,
    })
      .then((response: any) => response[contentType]())
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const getToken = () =>
  localStorage.getItem(tokenKey) || '';

interface IFetchLambda {
  action: string;
  data?: any;
  contentType?: string;
  method?: string;
}

export const fetchAPI = ({
  action,
  data,
  contentType = 'text',
  method = 'post',
}: IFetchLambda) => {
  return new Promise(function (resolve, reject) {
    fetch(`${API_URL}/${action}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'ai-cruiter-auth-token': getToken(),
      },
      body: data ? JSON.stringify(data) : undefined,
    })
      .then((response: any) => response[contentType]())
      .then(data => {
        if (data && data.serverError) {
          return reject(new Error(data.serverError));
        }

        return resolve(data);
      })
      .catch(error => {
        reject(error);
      });
  });
}

export const sendMessage = (message: any, callback?: any) => {
  const interval = setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs: any) {
      chrome.tabs.sendMessage(tabs[0].id, message)
      .then((response: any) => {
        clearInterval(interval);

        if (callback) {
          callback();
        }
      })
      .catch((e: any) => {
        // Handle any error that occurred during message sending
        console.error("Error sending message:", e);
      });
    });
  }, 1000)
}

export const sendMessageByTabId = (tabId: number, message: any) => {
  let tries = 0;

  const interval = setInterval(() => {
    tries++;

    if (tries > 10) {
      clearInterval(interval);
    }

    chrome.tabs
      .sendMessage(tabId, message)
      .then(() => {
        clearInterval(interval);
      })
      .catch((e: any) => {
        // Handle any error that occurred during message sending
        console.error('Error sending message:', e);
      });
  }, 1000);
};

export const setLocalStorage = (key: string, value: string) => {
  localStorage.setItem(key, value);

  sendMessage({ action: 'setLocalStorage', key, value });
};;