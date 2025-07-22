import express from 'express';
import dotenv from 'dotenv';
import { pool } from './dbConnection';
import decksRoutes from './routes/deckRoutes';
import combosRoutes from './routes/combosRoutes';
import stepsRoutes from './routes/stepsRoutes';
import stepTargetsRoutes from './routes/stepTargetsRoutes';
import tagsRoutes from './routes/tagsRoutes';
import comboTagsRoutes from './routes/comboTagsRoutes';
import comboStartingHandRoutes from './routes/comboStartingHandRoutes';
import comboFinalBoard from './routes/comboFinalBoardRoutes';

dotenv.config();

const PORT = process.env.LISTEN_PORT || 3000;
const app = express();
const cors = require('cors');
app.use(express.json());

app.use(cors(
    {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
))

app.use('/uploads', express.static('uploads'));
app.use("/decks", decksRoutes);
app.use("/combos", combosRoutes);
app.use("/steps", stepsRoutes);
app.use("/stepTargets", stepTargetsRoutes);
app.use("/tags", tagsRoutes);
app.use("/comboTags", comboTagsRoutes);
app.use("/comboStartingHand", comboStartingHandRoutes)
app.use("/comboFinalBoard", comboFinalBoard)



pool.query('SELECT 1', (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        process.exit(1);
    } else {
        console.log('✅ DB connection successful');

        app.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });
    }
});
