
// globals.d.ts
declare const $: any;
declare const chrome: any;

const cheerio = require('cheerio');
const axios = require('axios');
const striptags = require('striptags');

import {
  doFetch,
  fetchAPI,
  getToken,
  tokenKey,
} from './utils';

const host = `https://${location.host}`;

const changeTitle = (running=false) => {
  if (running) {
    document.title = `⌛ AI-cruiter: ${document.title}`
  } else {
    document.title = document.title.replace(`⌛ AI-cruiter: `, '');
  }
}

const sendMessage = (message: any) => {
  chrome.runtime.sendMessage(message);
}

const toggleButton = (isDisabled = true) => {
  sendMessage({
    action: 'toggleButton',
    isDisabled,
  })
};

interface IProcessRow {
  elem?: any;
  postingId: string;
}

export default class ContentScript {
  currentProccessingRow: string;
  isStartedEvaluation: boolean;

  rowInterval: any;
  containerInterval: any;
  userInfo: any;

  constructor() {
    this.currentProccessingRow = '';
    this.isStartedEvaluation = false;

    this.listen();
  }

  closestSelector(): string {
    return '.draggable';
  }

  rowSelector(): string {
    return '.evaluation-href';
  }

  async getProfile(applicantId: string): Promise<any> {
    const companyId = await this.findCompanyId();
    const postingIds = this.postingIdParam();
    const postingId = postingIds[0];

    return doFetch({
      url: `${host}/api/company/${companyId}/position/${postingId}/candidate/${applicantId}?`,
      contentType: 'json'
    });
  }

  async findContactInfo(ch: any, applicantId: string): Promise<{ phone: string, email: string }> {
    const profile: any = await this.getProfile(applicantId);

    return {
      email: profile.email_address,
      phone: profile.phone_number
    }
  }

  async findResumeId(applicantId: string, ch: any): Promise<string> {
    const profile: any = await this.getProfile(applicantId);

    return profile.resume.file_name;
  }

  async findPdfUrl(applicantId: string, resumeId: string): Promise<string> {
    const profile: any = await this.getProfile(applicantId);
    return profile.resume.pdf_url;
  }

  findApplicantId(href: string): string {
    return href.split('candidates/')[1].replace("/discussion", '');
  }

  postingIdParam(): any {
    if (location.href.split('/p/')[1]) {
      return [location.href.split('/p/')[1].split('/pipeline')[0]];
    }

    return ''
  }

  generateDetailLink(href: string) {
    return `${host}/${href}`;
  }

  findCompanyFriendlyId(): string {
    return location.pathname.replace('/app/c/', '').split('/p/')[0];
  }

  async findCompanyId(): Promise<string> {
    const companyData: any = await doFetch({
      url: `${host}/api/user/companies/meta?`,
      contentType: 'json',
    });

    const companyFriendlyId = this.findCompanyFriendlyId();
    let companyId;

    for (const key of Object.keys(companyData)) {
      if (key === companyFriendlyId) {
        companyId = companyData[key].company._id;
      }
    }

    return companyId;
  }

  async generateJobDetail(): Promise<{
    jobDetailText: string;
    jobLocation: string;
    jobTitle: string;
    postingId: string;
    jobDetailLink: string;
  }> {
    const postingIds = this.postingIdParam();
    const postingId = postingIds[0];

    const companyId = await this.findCompanyId();

    const jd: any = await doFetch({
      url: `${host}/api/company/${companyId}/position/${postingId}?verbose=true`,
      contentType: 'json',
    });

    return {
      jobDetailText: striptags(jd.description),
      jobDetailLink: `${host}/app/c/${this.findCompanyFriendlyId()}/positions/${postingId}/edit/description`,
      jobLocation: `${jd.location.city},
      ${jd.location.state.id}`,
      jobTitle: jd.name,
      postingId
    };
  }

  async generateJobTitle(): Promise<string> {
    const jd = await this.generateJobDetail();

    return jd.jobTitle;
  }

  handleRowClick() {
    $(document).on('click', this.onClickHandler);
  }

  onShowSummary(_href: string) {
    $('section').css({ overflow: 'visible' });
  }

  onHideSummary() {
    $('section').css({ overflow: 'auto' });
  }

  insertIndicator(href: string, elmToPrepend: any) {
    $(`a[href='${href}']`)
      .closest(this.closestSelector())
      .prepend(elmToPrepend);
  }

  findFullName(href: string) {
    return $(`a[href='${href}']`).closest(this.closestSelector()).find('.candidate-details h4').text();
  }

  getQueryParam = (name: string, isAll = false): any => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams[isAll ? 'getAll' : 'get'](name) || [];
  };

  writeLog(text: string) {
    sendMessage({
      action: 'writeLog',
      text,
    });
  }

  showInfo({
    href,
    loading,
    error,
    responseText,
  }: {
    href: string;
    loading?: boolean;
    error?: string;
    responseText?: string;
  }) {
    if ($(`div[data-href='${href}'] .tooltip`).length > 0) {
      return;
    }

    $(`div[data-href='${href}']`).remove();

    let elm = '';

    const name = this.findFullName(href);

    if (!error) {
      if (typeof responseText === 'undefined') {
        elm = `<span>-</span>`;
      } else {
        elm = `
          <div class="tooltip">
            <div class="tooltiptext" style="display:inline-flex">
              <div style="margin-top:15px !important">
                Applicant: ${name}
                \n${responseText}
              </div>
            </div>

            <img
              class="evaluated-indicator"
              data-href="${href}"
              src="data:image/png;base64,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"
            />
          </div>
        `;
      }
    } else {
      elm = `
        <span class="chatgpt-error">${error}</span>
      `;
    }

    if (loading) {
      elm = '<div class="spinner"></div>';
    }

    const elmToPrepend = `<div data-href="${href}" class="evaluation-row evaluation-row-breezy">${elm}</div>`;

    this.insertIndicator(href, elmToPrepend);
  }

  async finishedRunning(sendStatus = true) {
    this.isStartedEvaluation = false;

    this.currentProccessingRow = '';

    if (this.rowInterval) {
      clearInterval(this.rowInterval);
      this.rowInterval = null;
    }

    if (sendStatus) {
      sendMessage({ action: 'runningStatus', status: 'finished' });
    }

    changeTitle(false);
    sendMessage({ action: 'changeIcon', loading: false });

    await fetchAPI({
      action: 'pause-job',
      data: { jobId: this.postingIdParam()[0] },
      contentType: 'json',
    });
  }

  async processRow({ elem, postingId }: IProcessRow) {
    const href = $(elem).attr('href');

    this.currentProccessingRow = href;

    this.showInfo({ href, loading: true });

    const url = this.generateDetailLink(href);

    const applicantDetailData: any = await doFetch({ url });
    const ch = cheerio.load(applicantDetailData);

    const applicantId = this.findApplicantId(href);
    const resumeId = await this.findResumeId(applicantId, ch);
    const contactInfo = await this.findContactInfo(ch, applicantId);

    // getting signed url
    const signResponse: any = await fetchAPI({
      action: 'signurl',
      data: {
        jobId: postingId,
        applicantId,
        resumeId,
      },
      contentType: 'json',
    });

    const pdfUrl = await this.findPdfUrl(applicantId, resumeId);

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
    });

    // uploading to s3 using signed url
    await doFetch({
      url: signResponse.signedRequest,
      method: 'PUT',
      body: response.data,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

    // database save
    await fetchAPI({
      action: 'save',
      data: {
        s3Url: signResponse.url,
        action: 'summary',
        jobId: postingId,
        applicantId,
        applicantFullName: this.findFullName(href),
        applicantContactInfo: contactInfo,
        resumeId,
      },
      contentType: 'json',
    });
  }

  findNextElm() {
    let nextIndex = 0;

    const elms = $(this.rowSelector());

    for (const elem of elms) {
      const tooltip = $(elem).closest(this.closestSelector()).find('.tooltip');
      const error = $(elem)
        .closest(this.closestSelector())
        .find('.chatgpt-error');

      if (tooltip.length === 0 && error.length === 0) {
        break;
      }

      nextIndex++;
    }

    return elms[nextIndex];
  }

  async processNext(fetchPrev=true) {
    if (!this.isStartedEvaluation) {
      return;
    }

    // Check if the loaded URL matches the desired URL
    const postingIds = this.postingIdParam();
    const postingId = postingIds[0];

    if (fetchPrev) {
      await this.showPreviousResults();
    }

    const nextElm = this.findNextElm();

    if (nextElm) {
      const href = $(nextElm).attr('href');

      try {
        await this.processRow({ elem: nextElm, postingId: postingId || '' });
      } catch (e: any) {
        let error = 'Error';

        if (e.message) {
          if (e.message.includes('404')) {
            error = 'Resume not found';
          }

          console.log(e.message);
        }

        // database save
        await fetchAPI({
          action: 'save',
          data: {
            action: 'summary-error',
            jobId: postingId,
            applicantId: this.findApplicantId(href),
            error,
          },
          contentType: 'json',
        });

        await this.processNext();
      }
    } else {
      await this.finishedRunning();
    }
  }

  async startEvaluation() {
    this.isStartedEvaluation = true;

    changeTitle(true);
    sendMessage({ action: 'changeIcon', loading: true });
    sendMessage({ action: 'runningStatus', status: 'running' });

    toggleButton(true);

    // Check if the loaded URL matches the desired URL
    const postingIds = this.postingIdParam();
    const postingId = postingIds[0];

    this.writeLog('This can take a few minutes. Please keep this tab open. Come back later.');

    const nextElm = this.findNextElm();

    if (nextElm) {
      this.showInfo({
        loading: true,
        href: $(nextElm).attr('href'),
      });
    }

    await this.processNext(false);

    if (!this.rowInterval) {
      this.rowInterval = setInterval(async () => {
        if (this.currentProccessingRow) {
          const response: any = await fetchAPI({
            action: 'get-summary-status',
            data: {
              jobId: postingId,
              applicantId: this.findApplicantId(this.currentProccessingRow),
            },
            contentType: 'json',
          });

          if (response && response.status === 'evaluated') {
            this.showInfo({
              loading: false,
              href: this.currentProccessingRow,
              responseText: response.responseText,
            });

            await this.processNext();
          }
        } else {
          await this.processNext();
        }
      }, 2000);
    }
  }

  async fetchPreviousResults() {
    const postingIds = this.postingIdParam();
    const postingId = postingIds[0];

    if (!postingId) {
      return [];
    }

    return await fetchAPI({
      action: `prev-results?jobId=${postingId}`,
      method: 'get',
      contentType: 'json',
    });
  }

  async showPreviousResults() {
    if (!getToken()) {
      return;
    }

    const prevResults: any = await this.fetchPreviousResults();

    let numberOfSummaries = 0;

    const summariesByApplicantId: any = {};

    for (const prev of prevResults || []) {
      summariesByApplicantId[prev.applicantId] = {
        status: prev.status,
        error: prev.error,
        responseText: prev.responseText,
      };

      if (prev.responseText) {
        numberOfSummaries++;
      }
    }

    for (const elem of $(this.rowSelector())) {
      const href = $(elem).attr('href');
      const prev =
        summariesByApplicantId[this.findApplicantId(href)] || {};

      this.showInfo({
        href,
        error: prev.error,
        responseText: prev.responseText,
      });
    }

    return numberOfSummaries;
  }

  onClickHandler = (e: any) => {
    const target: any = e.target;

    if (
      target &&
      target.className !== 'tooltiptext'
    ) {
      $('.tooltiptext').css({ visibility: 'hidden' });

      this.onHideSummary();
    }

    if (target && (target.className || '').includes('evaluated-indicator')) {
      $(e.target)
        .parent('.tooltip')
        .find('.tooltiptext')
        .css({ visibility: 'unset' });

      const href = $(target).attr('data-href');

      this.onShowSummary(href);

      const distanceToBottom =
        $(document).height() -
        ($(target).offset().top + $(target).outerHeight());

      if (distanceToBottom < 550) {
        $(e.target).parent('.tooltip').addClass('up');
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  };

  evaluationContainer() {
    return `
      <div id="evaluation-container">
      </div>
    `;
  }

  listen() {
    chrome.runtime.onMessage.addListener(
      async (message: any, sender: any, sendResponse: any) => {
        if (message.action === 'evaluate') {
          this.startEvaluation();
        }

        if (message.action === 'pause') {
          changeTitle(false);
          $('.evaluation-row .spinner').remove();
          await this.finishedRunning(false);

          let lastNumberOfSummaries = 0;

          for (const elem of $(this.rowSelector())) {
            const href = $(elem).attr('href');

            const tooltip = $(elem).closest('td').find('.tooltip');

            if (tooltip && tooltip.length > 0) {
              this.showInfo({
                loading: false,
                href,
                responseText: 'Loading ...',
              });

              lastNumberOfSummaries++;
            }
          }

          await this.showPreviousResults();
        }

        if (message.action === 'loggedout') {
          await this.finishedRunning();
          localStorage.setItem(tokenKey, '');
          $('.evaluation-row').remove();
          sendMessage({ action: 'clearBadge' });
        }

        if (message.action === 'setLocalStorage') {
          localStorage.setItem(message.key, message.value);

          this.showPreviousResults();
        }

        if (message.action === 'callRun') {
          if (!localStorage.getItem(tokenKey) && message.loginToken) {
            localStorage.setItem(tokenKey, message.loginToken);
            this.showPreviousResults();
          }

          this.run();
        }

        if (message.action === 'getJobTitleFromContent') {
          const title = await this.generateJobTitle();

          if (title) {
            sendMessage({ action: 'receiveJobTitle', text: title });
          } else {
            sendMessage({ action: 'receiveJobTitle', text: '' });
          }
        }

        sendResponse({ response: 'Message received in content script!' });
      }
    );

    window.onload = () => {
      const stripeCallBack = this.getQueryParam(
        'ai-cruiter-stripe-url',
        true
      )[0];

      const options = this.getQueryParam('ai-cruiter-options', true)[0];

      const verificationCode = this.getQueryParam(
        'verification-token',
        true
      )[0];

      if (options) {
        sendMessage({ action: 'openOptions' });
      }

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

      if (stripeCallBack) {
        setTimeout(() => {
          sendMessage({ action: 'openOptions' });
        }, 2000);

        setTimeout(() => {
          window.close();
        }, 4000);
      }

      this.run();
    };

    chrome.storage.onChanged.addListener(async (changes: any, area: any) => {
      const key = 'aicruiter-logged-in';

      if (area === 'sync') {
        if (changes && changes[key] && changes[key].newValue) {
          const loginToken = changes[key].newValue;

          if (!localStorage.getItem(tokenKey) && loginToken) {
            localStorage.setItem(tokenKey, loginToken);

            await chrome.storage.sync.set({ [key]: ''});

            this.run();
          }
        }
      }
    });
  }

  async run() {
    this.userInfo = await fetchAPI({
      action: 'get-status',
      data: {
        type: 'currentUser'
      },
      contentType: 'json',
    });

    this.handleRowClick();

    if (!this.containerInterval) {
      if (this.userInfo.status !== 'loggedIn') {
        // if invalid token is stored in local storage then remove it
        localStorage.setItem(tokenKey, '');
      }

      // For example on lever, the container is constantly being removed so we are trying to
      // reinsert it every second. If the element is present, we will do nothing
      this.containerInterval = setInterval(() => {
        if ($('#evaluation-container').length === 0) {
          setTimeout(() => {
            $('.position-pipeline').prepend(this.evaluationContainer());

            setTimeout(() => {
              for (const draggable of $('section .draggable')) {
                const href = `/app/c/${this.findCompanyFriendlyId()}/p/${this.postingIdParam()[0]}/candidates/${$(draggable).attr('data-candidate-id')}/discussion`;

                if ($(`a[href="${href}"]`).length === 0) {
                  $(draggable).append(`<a class="evaluation-href" href="${href}"><a>`)
                }
              };
            }, 2000)

            this.showPreviousResults();
          }, 4000)
        }
      }, 1000);
    }

    changeTitle(false);
    sendMessage({ action: 'changeIcon', loading: false });

    this.generateJobDetail().then((response) => {
      const { jobDetailText, jobDetailLink, postingId, jobLocation, jobTitle } = response;

      if (jobDetailText && jobTitle && postingId) {
        fetchAPI({
          action: 'save-job-detail',
          data: {
            jobId: postingId,
            jobDetailText,
            jobDetailLink,
            jobLocation,
            jobTitle,
          },
          contentType: 'json',
        });
      }
    });

    if (this.isStartedEvaluation || this.currentProccessingRow) {
      changeTitle(true);
      sendMessage({ action: 'changeIcon', loading: true });
      return sendMessage({ action: 'runningStatus', status: 'running' });
    }
  }
}

new ContentScript();