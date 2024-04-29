// globals.d.ts
declare const chrome: any;

import React, { useState, useContext } from 'react';
import { fetchAPI, tokenKey } from '../utils';
import { Context } from './layout';

const SignIn = () => {
  const { setFlash, setCurrentPage, setLoading } = useContext(Context);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const setError = (error: string) => {
    setFlash({ type: 'error', message: error });
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
  }

  const signin = () => {
    setLoading(true);

    const urlParams = new URLSearchParams(window.location.search);
    const redirect_url = urlParams.get('redirect_url');
    const tabId = urlParams.get('tabId');

    fetchAPI({
      action: 'handle-auth',
      data: { action: 'login', email, password },
      contentType: 'json',
    })
      .then((response: any) => {
        setLoading(false);

        if (response.error) {
          setError(response.error);
        } else {
          const loginToken = response.data;

          localStorage.setItem(tokenKey, loginToken);

          setCurrentPage('loggedin');
          setFlash({type: 'info', message: '' });

          chrome.storage.sync.set({ 'aicruiter-logged-in': loginToken });

          if (redirect_url) {
            chrome.tabs.update(parseFloat(tabId || ''), { active: true })
            .then(() => { window.close(); })
            .catch(() => { location.href = redirect_url; })
          }
        }
      })
      .catch((e: Error) => {
        setLoading(false);
        setError(e.message);
      });
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email address*</label>
        <input
          type="email"
          className="form-control"
          id="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password*</label>
        <input
          type="password"
          className="form-control"
          id="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
        />
      </div>

      <button onClick={signin} className='btn btn-primary'>Log in</button>
    </form>
  );
};

export default SignIn;