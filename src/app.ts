import express from 'express';
import cors from 'cors';
import { configurePublicationRoutes } from './routes/publications';
import { initializeDb } from './database';

const port = process.env.PORT || 8000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({'API status': 'OK'});
});

initializeDb();

const publicationsRouter = express.Router();

app.use('/publications', publicationsRouter);

configurePublicationRoutes(publicationsRouter);

app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
});