import { Request, Response } from 'express';
import { pool } from '../dbConnection';

export const createComboStartingHand = async (req: Request, res: Response) => {
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

        const insertStartingHandPromises = cards.map(card => {
            const query = 'INSERT INTO combo_starting_hand (combo_id, card_id) VALUES ($1, $2)';
            return pool.query(query, [combo_id, card.id]);
        });
        await Promise.all(insertStartingHandPromises);

        res.status(201).json({ message: 'Starting hand added successfully.' });
    } catch (error) {
        console.error('Error in createComboStartingHand:', error);
        res.status(500).json({ message: 'Error while trying to insert starting hand.' });
    }
};