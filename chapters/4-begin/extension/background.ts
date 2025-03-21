import { sendMessage } from "./utils";

// globals.d.ts
declare const chrome: any;

chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
  if (message.action === "openOptions") {
    chrome.runtime.openOptionsPage();
  }

  if (message.action === "content-to-bg:verificationCode") {
    const newMessage = { ...message, action: "verificationCode" };
    sendMessage(newMessage);
  }
});
