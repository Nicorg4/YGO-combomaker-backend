import { Response, Request } from 'express'
import { pool } from '../dbConnection';

export const createFinalBoard = async (req: Request, res: Response) => {
    const { combo_id, cards } = req.body;

    if (!combo_id || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Missing combo_id or cards array.' });
    }

    try {
        const insertCardPromises = cards.map(card => {
            const query = 'INSERT INTO cards (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING';
            return pool.query(query, [card.id, card.name]);
        });
        await Promise.all(insertCardPromises);

        const insertFinalBoardPromises = cards.map((card, position) => {
            const query = 'INSERT INTO combo_final_board (combo_id, card_id, position) VALUES ($1, $2, $3)';
            return pool.query(query, [combo_id, card.id, position]);
        });
        await Promise.all(insertFinalBoardPromises);

        res.status(201).json({ message: 'Final board added successfully.' });
    } catch (error) {
        console.error('Error in createComboFinalBoard:', error);
        res.status(500).json({ message: 'Error while trying to insert final board.' });
    }
};