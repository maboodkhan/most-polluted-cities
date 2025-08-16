import express from 'express';
import morgan from 'morgan';
import pino from 'pino';
import citiesRouter from './lib/cities-router.js';

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(express.json());
app.use(morgan('dev'));

app.use('/cities', citiesRouter({ logger }));

// global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});
