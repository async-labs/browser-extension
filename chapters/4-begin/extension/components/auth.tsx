// globals.d.ts
declare const $: any;

import React, { useContext } from 'react';
import { Context } from './layout';
import Signup from './signup';
import SignIn from './signin';

const Auth = () => {
  const { currentPage, setCurrentPage } = useContext(Context);

  let comp = null;

  if (currentPage === 'signin') {
    comp = <SignIn />;
  }
    
  if (currentPage === 'signup') {
    comp = <Signup />;
  }

  if (!comp) {
    return null;
  }

  const changeTab = (tab: string) => {
    setCurrentPage(tab);
  }

  return (
    <div>
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <a className={`nav-link ${currentPage === 'signin' ? 'active': ''}`} aria-current="page" href="#" onClick={changeTab.bind(this, 'signin')}>
            Log in
          </a>
        </li>
        <li className="nav-item">
          <a className={`nav-link ${currentPage === 'signup' ? 'active': ''}`} href="#" onClick={changeTab.bind(this, 'signup')}>
            Sign Up
          </a>
        </li>
      </ul>

      <div id="tab-content">{comp}</div>
    </div>
  );
};

export default Auth;