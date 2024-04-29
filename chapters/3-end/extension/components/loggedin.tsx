// globals.d.ts
declare const $: any;

import React, { useContext } from 'react';
import { Context } from './layout';

const LogggedIn = () => {
  const { user, logout, subscription, loading } = useContext(Context);

  const renderDescription = () => {
    if (loading) {
      return null;
    }

    if (subscription && !subscription.canceled_at) {
      return (
        <div>
          <p>
            As a paying customer you can generate unlimited resume summaries
            per month.
          </p>
        </div>
      );
    }

    return (
      <div>
        <p>
          Generate up to 250 resume summaries for free per month. Subscribe to generate
          more resume summaries.
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="card">
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <div style={{ margin: 'auto 0px' }}>
            Account: <b>{user.email}</b>
          </div>
          <div>
            <button onClick={logout} className="btn btn-secondary">
              Log out
            </button>
          </div>
        </div>
        <div className="card-body">
          {renderDescription()}
          <br />
        </div>
      </div>

    </div>
  );
};

export default LogggedIn;
