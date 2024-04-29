import * as dotenv from 'dotenv';

dotenv.config();

export const routeErrorHandling = (fn, callback?: any) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (e) {
      console.error(e);

      if (callback) {
        return callback(res, e, next);
      }

      return next(e);
    }
  };
};

export const allowedOrigins = (origin, callback) => {
  const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

  if (ALLOWED_ORIGINS === '*') {
    return callback(null, true);
  }

  const origins = [
    ...ALLOWED_ORIGINS.split(',')
  ];

  if (origins.includes(origin)) {
    return callback(null, true);
  }

  const originEndsWith = (originString, endsArray) => {
      let value = false;

      value = endsArray.some(element => {
          return originString.endsWith(element);
      });

      return value;
  };

  const ends = ["breezy.hr"];

  if (!origin || originEndsWith(origin, ends)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}