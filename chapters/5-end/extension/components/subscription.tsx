// globals.d.ts
declare const $: any;

import React, { useState, useEffect, useContext } from 'react';
import { fetchAPI } from '../utils';
import { Context } from './layout';
import Popup from './popup';

const Subscription = () => {
  const [plan, setPlan] = useState('');
  const [card, setCard] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const { setLoading } = useContext<any>(Context);
  const [ subscribing, setSubscribing ] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const [subscription, setSubscription] = useState<any>(null);

  const isCanceled = subscription && subscription.canceled_at;

  const fetchSubscription = async () => {
    setLoading(true);

    try {
      const response: any = await fetchAPI({
        action: 'get-subscription',
        method: 'get',
        contentType: 'json',
      });
      const { plan, subscription, card, invoices } = response;

      setPlan(plan || 'free');
      setSubscription(subscription);
      setCard(card);
      setInvoices(invoices);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const renderCancelModal = () => {
    if (!showCancel) {
      return;
    }

    const cancel = async () => {
      setIsCanceling(true);

      await fetchAPI({ action: 'cancel-subscription' });
      await fetchSubscription();

      setIsCanceling(false);
      setShowCancel(false);
    };

    const content = (
      <div>
        <p>
          Are you sure to cancel?
        </p>

        <button
          className="btn btn-danger btn-sm"
          onClick={cancel}
          disabled={isCanceling}
        >
          { isCanceling ? 'Canceling ..' : `Yes, cancel plan`}
        </button>
      </div>
    )

    const onClose = () => {
      setShowCancel(false);
    }

    return <Popup content={content} onClose={onClose} size="medium" />
  }

  const handleSubscribe = async (pln: string) => {
    setSubscribing(pln);

    try {
      const response: any = await fetchAPI({
        action: 'create-subscription',
        contentType: 'json',
        data: {
          plan: pln,
        }
      });

      const { url } = response;

      if (url) {
        window.open(url, '__blank');

        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      setSubscribing('');
    }
  };

  const renderCard = () => {
    if (!card) {
      return null;
    }

    return (
      <div>
        <h1></h1>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ margin: 'auto 0px' }}>Card info</div>
            <a href={card.manage_url} className="btn btn-secondary">
              Manage card
            </a>
          </div>
          <div className="card-body">
            <div className="number">
              <label className="fw-bold">Card: **** **** **** {card.last4}</label>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span className="fw-bold">
                Expiration date: {card.exp_month}/{card.exp_year}
              </span>
              <span></span>
            </div>
          </div>
        </div>

        <br />
      </div>
    );
  };

  const renderInvoices = () => {
    if (!invoices || invoices.length === 0) {
      return null;
    }

    return (
      <>
        <div className="card">
          <div className="card-header">Invoices</div>

          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Amount due</th>
                  <th>Status</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.number}</td>
                      <td>${(invoice.amount_due / 100).toFixed(0)}</td>
                      <td>{invoice.status}</td>
                      <td>
                        <a href={invoice.hosted_invoice_url} target="__blank">
                          details
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <br />
      </>
    );
  };

  const renderStripeButton = (pln: string) => {
    const hasActiveSub = subscription && !subscription.canceled_at

    if (plan === pln && hasActiveSub) {
      return (
        <>
          <button onClick={() => setShowCancel(true)} className="btn btn-secondary" style={{ float: 'right', margin: '0px 5px' }}>
            Cancel
          </button>
        </>
      );
    }

    let disabled = false;
    let text = 'Subscribe';
    let notifcation;

    if (plan && hasActiveSub && plan !== pln) {
      disabled = true;

      notifcation = (
        <p style={{ color: "gray", fontSize: "13px" }}>
          Please cancel the active plan first
        </p>
      )
    }

    if (subscribing === pln) {
      disabled = true;
      text = 'Redirecting ...';
    }

    return (
      <>
        <button
          type="button"
          onClick={handleSubscribe.bind(this, pln)}
          className="btn btn-primary"
          disabled={disabled}
          style={{ float: 'right', margin: '0px 5px' }}
        >
          {text}
        </button>

        {notifcation}
      </>
    )
  };

  const renderSubscription = () => {
    return (
      <div className="card mb-4 rounded-3 shadow-sm">
        <div className="card-header py-3" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="my-0 fw-normal" style={{ margin: 'auto 0px' }}>
            Subscription
            {isCanceled ? (
              <p className="badge badge-secondary" style={{ marginLeft: '5px' }}>
                canceled
              </p>
            ) : null}

            {subscription && !subscription.canceled_at ? (
              <p className="badge badge-secondary" style={{ marginLeft: '5px' }}>
                You are a paying customer
              </p>
            ) : null}

          </div>
        </div>

        <div className="card-body">
          <div className={`pricing-plan ${plan === 'plan1' ? 'active' : ''}`} id="plan-1">
            <h4>Recruiter plan</h4>

            <h5 className="card-title pricing-card-title" style={{ textAlign: 'right' }}>
              $25<small className="text-muted fw-light">/month</small>
            </h5>

            <ul className="list-unstyled mt-3 mb-4">
              <li>- Limit per month</li>
              <li className='value'>2000 summaries</li>
              <li>- Data retention</li>
              <li className='value'>For 6 months</li>
              <li>- Email support</li>
            </ul>

            {renderStripeButton('plan1')}
          </div>

          <div className={`pricing-plan ${plan === 'plan2' ? 'active' : ''}`}>
            <h4>Agency plan</h4>

            <h5 className="card-title pricing-card-title" style={{ textAlign: 'right' }}>
              $99<small className="text-muted fw-light">/month</small>
            </h5>

            <ul className="list-unstyled mt-3 mb-4">
              <li>- Limit per month</li>
              <li className='value'>10000 summaries</li>
              <li>- Data retention</li>
              <li className='value'>For 6 months</li>
              <li>- Priority email support</li>
            </ul>

            {renderStripeButton('plan2')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <br />
      {renderCancelModal()}
      {renderSubscription()}
      {renderCard()}
      {renderInvoices()}
    </div>
  );
};

export default Subscription;
