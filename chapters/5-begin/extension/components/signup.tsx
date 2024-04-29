// globals.d.ts
declare const $: any;
declare const chrome: any;

import React, { useState, useContext, useEffect } from 'react';
import { fetchAPI } from '../utils';
import { Context } from './layout';

const Signup = () => {
  const { setFlash, setCurrentPage, setLoading } = useContext(Context);

  const [email, setEmail] = useState('');

  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(
    localStorage.getItem('waitingRegisterVerification') === 'true'
  );
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [receivedCodeByUrl, setReceivedCodeByUrl] = useState(false);

  const setError = (error: string) => {
    setLoading(false);
    setFlash({ type: 'error', message: error });
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
  };

  const signup = () => {
    if (!email) {
      return false;
    }

    setLoading(true);

    fetchAPI({
      action: 'handle-auth',
      data: { action: 'register', email },
      contentType: 'json',
    })
      .then((response: any) => {
        setLoading(false);

        if (response.error) {
          setError(response.error);
        } else {
          localStorage.setItem('waitingRegisterVerification', 'true');
          setFlash({type: 'info', message: '' });
          setShowVerificationInput(true);
        }
      })
      .catch((e: Error) => {
        setError(e.message);
      });
  };

  const verify = () => {
    setLoading(true);

    fetchAPI({
      action: 'handle-auth',
      data: { action: 'confirm-token', token: verificationCode },
      contentType: 'json',
    })
      .then((response: any) => {
        setLoading(false);
        setReceivedCodeByUrl(false);

        if (response.error) {
          setError(response.error);
        } else {
          localStorage.removeItem('waitingRegisterVerification');
          setFlash({ type: 'info', message: 'Verification successful' });
          setShowPasswordForm(true);
        }
      })
      .catch((e: Error) => {
        setReceivedCodeByUrl(false);
        setError(e.message);
      });
  };

  const createPassword = () => {
    setLoading(true);

    fetchAPI({
      action: 'handle-auth',
      data: {
        action: 'set-password',
        token: verificationCode,
        password,
        passwordConfirmation,
      },
      contentType: 'json',
    })
      .then((response: any) => {
        setLoading(false);

        if (response.error) {
          setError(response.error);
        } else {
          setFlash({ type: 'info', message: 'Registration complete' });
          setCurrentPage('signin');
        }
      })
      .catch((e: Error) => {
        setError(e.message);
      });
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      message: any,
      sender: any,
      sendResponse: any
    ) {
      if (message.action === 'verificationCode') {
        setVerificationCode(message.verificationCode);
        setReceivedCodeByUrl(true);
      }

      sendResponse({ response: 'Message received in options!' });
    });
  }, []);

  useEffect(() => {
    if (receivedCodeByUrl) {
      verify();
    }
  }, [receivedCodeByUrl]);

  if (showPasswordForm) {
    return (
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password*</label>
          <input
            className="form-control"
            id="password"
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Confirm New Password*</label>
          <input
            className="form-control"
            id="password"
            type="password"
            value={passwordConfirmation}
            onChange={e => {
              setPasswordConfirmation(e.target.value);
            }}
          />
        </div>

        <button onClick={createPassword} className="btn btn-primary">
          Create password
        </button>
      </form>
    );
  }

  if (showVerificationInput) {
    if (receivedCodeByUrl) {
      return <p>Verifing ...</p>
    }

    return (
      <div>
        <p className="p-3 mb-2 bg-success text-white">
          We emailed you a verification link. Please click the link to complete signup.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'none' }}>
          <div className="form-group">
            <label htmlFor="code">Verification code</label>
            <input
              className="form-control"
              id="code"
              value={verificationCode}
              disabled={receivedCodeByUrl}
              onChange={e => {
                setVerificationCode(e.target.value);
              }}
            />
          </div>

          <button onClick={verify} className="btn btn-primary">
            Verify
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email address*</label>
        <input
          type="email"
          className="form-control"
          id="email"
          value={email}
          required
          onChange={e => {
            setEmail(e.target.value);
          }}
        />
      </div>

      <button onClick={signup} className="btn btn-primary">
        Sign up
      </button>
    </form>
  );
};

export default Signup;
