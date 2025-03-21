import Stripe from "stripe";
import Users, { IUserDocument } from "./models/users";
import { connectToDatabase, disconnectFromDatabase } from "./mongoose";
import { requireLogin } from "./utils";

import * as dotenv from "dotenv";
import getEmailTemplate from "./models/email-templates";
import sendEmail from "./aws-ses";

dotenv.config();

const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_KEY, STRIPE_PLAN1_PRICE_ID, STRIPE_PLAN2_PRICE_ID } = process.env;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });

const sendStripeEmail = async (toEmail: string, template: string) => {
  let emailTemplate = await getEmailTemplate(template);

  try {
    await sendEmail({
      from: `AI-recruiter <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
      to: [toEmail],
      cc: ["recruit@workinbiotech.com"],
      subject: emailTemplate.subject,
      body: emailTemplate.message,
    });
  } catch (err) {
    console.log("Email sending error:", err);
  }
};

const saveInvoice = async (user, event) => {
  const invoicePayment = event.data.object;

  let invoices = user.stripeInvoices || [];

  // delete previous entry
  invoices = invoices.filter((invoice) => invoice.id !== invoicePayment.id);

  invoices.push(invoicePayment);

  await Users.updateOne({ _id: user._id }, { $set: { stripeInvoices: invoices } });

  return invoicePayment;
};

export const webhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let rawData = "";

  req.on("data", (chunk) => {
    // Accumulate the raw request body
    rawData += chunk;
  });

  req.on("end", async () => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(rawData, sig, STRIPE_WEBHOOK_KEY);
    } catch (error) {
      console.error("Webhook signature verification failed.", error.message);
      return res.sendStatus(400);
    }

    const data = event.data.object;

    await connectToDatabase();

    // Handle specific event types
    switch (event.type) {
      case "checkout.session.completed":
        if (data.mode === "subscription") {
          const selector = { "stripeCustomer.id": data.customer };
          const user = await Users.findOne(selector);

          if (user) {
            await Users.updateOne(selector, {
              $set: { stripeCustomer: { id: data.customer }, activePricingPlan: data.metadata.plan },
            });

            try {
              await Users.subscribe({
                session: { subscription: { id: data.subscription } } as any,
                user,
              });
            } catch (error) {
              console.error("Failed to save subscription:", error);
            }
          }
        }

        if (data.mode === "setup") {
          const setupIntent: any = await stripe.setupIntents.retrieve(data.setup_intent);

          await stripe.customers.update(setupIntent.customer, {
            invoice_settings: {
              default_payment_method: setupIntent.payment_method,
            },
          });

          await stripe.subscriptions.update(setupIntent.metadata.subscription_id, {
            default_payment_method: setupIntent.payment_method,
          });
        }

        break;

      case "customer.source.expiring":
        const expiringData = event.data.object;

        const user = await Users.findOne({
          "stripeCustomer.id": expiringData.customer,
        });

        if (user) {
          await sendStripeEmail(user.email, "customerSourceExpiring");
        }

        break;

      case "invoice.payment_failed":
        const pfselector = { "stripeCustomer.id": event.data.object.customer };
        const pfuser = await Users.findOne(pfselector);

        if (pfuser) {
          const invoicePayment = await saveInvoice(pfuser, event);

          await sendStripeEmail(invoicePayment.customer_email, "paymentFailedNotification");
        }

        break;

      case "invoice.payment_succeeded":
        const selector = { "stripeCustomer.id": event.data.object.customer };
        const dbuser = await Users.findOne(selector);

        if (dbuser) {
          await saveInvoice(dbuser, event);
          await Users.updateOne(selector, { $set: { planChangedAt: new Date() } });
        }

        break;

      // Add cases for other event types you want to handle
    }

    await disconnectFromDatabase();

    res.sendStatus(200);
  });
};

export const createSession = async ({
  mode,
  user,
  plan,
  subscriptionId,
  customer,
}: {
  mode: string;
  user: IUserDocument;
  subscriptionId?;
  plan?: string;
  customer?;
}) => {
  const options: any = {
    payment_method_types: ["card"],
    mode,
    success_url: "https://workinbiotech.com/ai-cruiter?ai-cruiter-stripe-url=success",
    cancel_url: "https://workinbiotech.com/ai-cruiter?ai-cruiter-stripe-url=cancel",
  };

  if (mode === "subscription") {
    options.line_items = [
      {
        price: plan === "plan1" ? STRIPE_PLAN1_PRICE_ID : STRIPE_PLAN2_PRICE_ID,
        quantity: 1,
      },
    ];

    options.metadata = { plan };

    let stripeCustomerId: string;

    if (user && user.stripeCustomer && user.stripeCustomer.id) {
      stripeCustomerId = user.stripeCustomer.id;
    } else {
      const stripeCustomer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = stripeCustomer.id;
      await Users.updateOne({ _id: user._id }, { $set: { stripeCustomer } });
    }

    options.customer = stripeCustomerId;
  }

  if (mode === "setup") {
    options.customer = customer;
    options.setup_intent_data = {
      metadata: {
        customer_id: customer,
        subscription_id: subscriptionId,
      },
    };
  }

  return stripe.checkout.sessions.create(options);
};

export const createSubscription = async (req, res, next) => {
  await requireLogin(req, res, next);

  await connectToDatabase();

  const { plan } = req.body;

  let response: any;

  try {
    const session = await createSession({
      mode: "subscription",
      user: req.user,
      plan,
    });

    response = { url: session.url };
  } catch (error) {
    console.error(error);
    response = { error: "Something went wrong" };
  }

  await disconnectFromDatabase();

  if (response.error) {
    return res.status(500).json();
  }

  return res.json(response);
};

export const getStripeSubscription = (id: string) => stripe.subscriptions.retrieve(id);

export const getSubscription = async (req, res, next) => {
  await requireLogin(req, res, next);

  await connectToDatabase();

  const userId = req.user._id;

  const user = await Users.findOne({ _id: userId });

  if (!user.stripeSubscription || !user.stripeSubscription.id) {
    return res.json({ subscriptionId: "" });
  }

  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscription.id);

  const invoices = user.stripeInvoices || [];

  const customerId = user.stripeCustomer ? user.stripeCustomer.id : "";
  const default_payment_method_id: any = subscription.default_payment_method;

  const paymentMethod = await stripe.paymentMethods.retrieve(default_payment_method_id);

  const card: any = paymentMethod ? paymentMethod.card : null;

  await disconnectFromDatabase();

  try {
    const session = await createSession({
      mode: "setup",
      user,
      customer: customerId,
      subscriptionId: subscription.id,
    });

    card.manage_url = session.url;
  } catch (e) {
    console.log(`Error during generating manage card url ${e.message}`);
  }

  return res.json({ plan: user.activePricingPlan, subscription, invoices, card });
};

export const deleteSubscription = ({ subscriptionId }: { subscriptionId: string }) => {
  return stripe.subscriptions.cancel(subscriptionId);
};

export const cancelSubscription = async (req, res, next) => {
  await requireLogin(req, res, next);

  await connectToDatabase();

  await cancelSubscriptionHandler(req.user._id);

  await disconnectFromDatabase();

  return res.send("ok");
};

export const cancelSubscriptionHandler = async (userId: string) => {
  const user = await Users.findOne({ _id: userId });

  const subscription = user.stripeSubscription || {};

  let deletedSubscription;

  if (subscription.id) {
    try {
      deletedSubscription = await deleteSubscription({
        subscriptionId: subscription.id,
      });
    } catch (e) {
      console.log(`Error during cancelSubscriptionHandler ${e.message}`);
    }
  }

  await Users.updateOne(
    { _id: userId },
    {
      $set: {
        activePricingPlan: "",
        isSubscriptionActive: false,
        activePricingPlanWhenCancel: user.activePricingPlan,
        stripeSubscription: deletedSubscription,
      },
    }
  );
};
