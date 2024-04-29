import * as jwt from 'jsonwebtoken';
import cors from 'cors';
import express from 'express';
import { connectToDatabase } from './mongoose';
import Users from './models/users';
import {
  routeErrorHandling,
  allowedOrigins
} from "./utils"

import {
  createSubscription,
  cancelSubscription,
  getSubscription,
  webhook,
} from './stripe';

import * as dotenv from 'dotenv';
import llmRoutes from './llm-routes';

dotenv.config();

const port = process.env.PORT || 3000;

(async () => {
  await connectToDatabase();
})();

const app = express();

// Enable CORS for all routes
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins
  })
);

// Endpoint to handle Stripe webhook events
app.post('/webhook', routeErrorHandling(webhook));

app.use(express.json());

app.post('/create-subscription', routeErrorHandling(createSubscription));
app.post('/cancel-subscription', routeErrorHandling(cancelSubscription));
app.get('/get-subscription', routeErrorHandling(getSubscription));

llmRoutes(app);

app.post(
  '/get-status',
  routeErrorHandling(async (req, res) => {
    const loginToken = req.headers['ai-cruiter-auth-token'];

    let response;

    try {
      // verify user token and retrieve stored user information
      const { user }: any = jwt.verify(
        loginToken,
        process.env.JWT_TOKEN_SECRET || ''
      );

      response = {
        status: 'loggedIn',
        ...user,
      };
    } catch (e) {
      response = {
        status: 'notLoggedIn'
      };
    }

    return res.json(response);
  })
);

app.post(
  '/handle-auth',
  routeErrorHandling(async (req, res) => {
    const {
      action,
      email,
      password,
      passwordConfirmation,
      token,
      confirmationType,
    } = req.body;

    let data: any;

    if (action === 'confirm-token') {
      data = await Users.confirmToken(token, confirmationType);
    }

    if (action === 'set-password') {
      data = await Users.setPassword({ token, password, passwordConfirmation });
    }

    if (action === 'register') {
      data = await Users.register(email);
    }

    if (action === 'login') {
      data = await Users.login({ email, password });
    }

    return res.json({ data });
  })
);

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err); // Log the error for debugging purposes

  // Handle other types of errors
  return res.status(500).json({ serverError: err.message });
});

app.get('/', (_, res) => {
  res.send('ok');
});

app.get('*', (_, res) => {
  res.sendStatus(403);
});

app.listen(port, () => {
  console.log(`> Ready on ${port}`);
});
