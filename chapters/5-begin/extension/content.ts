declare const chrome: any;

const getQueryParam = (name: string, isAll = false): any => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams[isAll ? 'getAll' : 'get'](name) || [];
};

const sendMessage = (message: any) => {
  chrome.runtime.sendMessage(message);
}

window.onload = () => {
    const verificationCode = getQueryParam(
        'verification-token',
        true
    )[0];

    if (verificationCode) {
        sendMessage({ action: 'openOptions' });
        sendMessage({
            action: 'content-to-bg:verificationCode',
            verificationCode,
        });

        setTimeout(() => {
            window.close();
        }, 4000);
    }

    const stripeCallBack = getQueryParam(
        'ai-cruiter-stripe-url',
        true
    )[0];

    if (stripeCallBack) {
        setTimeout(() => {
            sendMessage({ action: 'openOptions' });
        }, 2000);

        setTimeout(() => {
            window.close();
        }, 4000);
    }
};