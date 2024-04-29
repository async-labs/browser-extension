import express from 'express';

const port = process.env.PORT || 3030;

const app = express();

app.use(express.json());

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