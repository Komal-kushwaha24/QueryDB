import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`QueryDB API listening on port ${port}`);
});
