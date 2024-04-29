// globals.d.ts
declare const chrome: any;

import React, { createContext, useState, useEffect } from 'react';
import Auth from './auth';
import LogggedIn from './loggedin';
import { fetchAPI, tokenKey } from '../utils';

export const Context = createContext({} as any);

const Layout = () => {
  const [currentPage, setCurrentPage] = useState(
    localStorage.getItem('waitingRegisterVerification') === 'true'
      ? 'signup'
      : 'signin'
  );

  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: 'info', message: '' });
  const [user, setUser] = useState<any>();

  const logout = () => {
    localStorage.setItem(tokenKey, '');

    chrome.runtime.sendMessage({ action: 'bg:loggedout' });

    setCurrentPageWrapper('signin');
  };

  const fetchUser = () => {
    return fetchAPI({
      action: 'get-status',
      data: { type: 'currentUser' },
      contentType: 'json',
    }).then((response: any) => {
      if (response.status === 'loggedIn') {
        setUser(response);
      } else {
        setUser({ email: '' });

        // if invalid key is stored then remove it
        localStorage.setItem(tokenKey, '');
      }
    });
  };

  const setCurrentPageWrapper = (page: string) => {
    setCurrentPage(page);
    fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  let comp = null;

  if (!user) {
    comp = null;
  } else {
    if (user.email) {
      comp = <LogggedIn />;
    } else {
      comp = <Auth />;
    }
  }

  const renderFlash = () => {
    if (flash.type && flash.message) {
      if (flash.type === 'error') {
        return (
          <div className="p-3 mb-2 bg-warning text-dark">{flash.message}</div>
        );
      }

      return (
        <div className="p-3 mb-2 bg-success text-white">{flash.message}</div>
      );
    }
  };

  const renderLoader = () => {
    if (loading) {
      return <span className="loader" />;
    }

    return null;
  };

  return (
    <div>
      <Context.Provider
        value={{
          currentPage,
          user,
          setCurrentPage: setCurrentPageWrapper,
          setFlash,
          setLoading,
          loading,
          logout,
          fetchUser,
        }}
      >
        <div style={{display: 'inline-flex',alignItems: 'center'}}>
          <h1>AI-cruiter</h1>
          <span style={{marginLeft: '15px'}}>by WorkInBiotech.com</span>
        </div>

        <div id="content" style={{width: '600px'}}>
          {renderFlash()}
          {comp}
        </div>

        <p />
        <br />
        {renderLoader()}
      </Context.Provider>
    </div>
  );
};

export default Layout;
