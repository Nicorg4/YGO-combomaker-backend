import { Request, Response } from 'express';
import { pool } from '../dbConnection';

export const getCombo = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    try {
        const comboResult = await pool.query('SELECT * FROM combos WHERE id = $1', [comboId]);
        const combo = comboResult.rows[0];
        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }
        res.status(200).json(combo);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to get a combo' });
    }

}

export const getCombosByDeckId = async (req: Request, res: Response) => {
    const { deckId } = req.params;

    try {
        const combosResult = await pool.query(
            'SELECT * FROM combos WHERE deck_id = $1',
            [deckId]
        );
        const combos = combosResult.rows;

        if (combos.length === 0) {
            return res.status(200).json([]);
        }

        const comboIds = combos.map(combo => combo.id);

        const tagsResult = await pool.query(`
            SELECT ct.combo_id, t.id, t.name
            FROM combo_tags ct
            JOIN tags t ON ct.tag_id = t.id
            WHERE ct.combo_id = ANY($1)
        `, [comboIds]);

        const startingHandResult = await pool.query(`
            SELECT sh.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_starting_hand sh
            JOIN cards c ON sh.card_id = c.id
            WHERE sh.combo_id = ANY($1)
            ORDER BY sh.combo_id
        `, [comboIds]);

        const finalBoardResult = await pool.query(`
            SELECT fb.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_final_board fb
            JOIN cards c ON fb.card_id = c.id
            WHERE fb.combo_id = ANY($1)
            ORDER BY fb.combo_id, fb.position
        `, [comboIds]);

        const combosWithDetails = combos.map(combo => {
            const tags = tagsResult.rows
                .filter(tag => tag.combo_id === combo.id)
                .map(({ id, name }) => ({ id, name }));

            const starting_hand = startingHandResult.rows
                .filter(card => card.combo_id === combo.id)
                .map(({ card_id, card_name }) => ({ card_id, card_name }));

            const final_board = finalBoardResult.rows
                .filter(card => card.combo_id === combo.id)
                .map(({ card_id, card_name }) => ({ card_id, card_name }));

            return {
                ...combo,
                tags,
                final_board,
                starting_hand,
            };
        });

        res.status(200).json(combosWithDetails);
    } catch (error) {
        console.error('Error getting combos:', error);
        res.status(500).json({ message: 'Error while trying to get combos by deck id' });
    }
}


export const createCombo = async (req: Request, res: Response) => {
    const { deckId } = req.params;
    const { author, title, difficulty } = req.body;
    if (!author || !title || !difficulty) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const createComboQuery = 'INSERT INTO combos (author, title, difficulty, deck_id) VALUES ($1, $2, $3, $4) RETURNING *';
        const comboResult = await pool.query(createComboQuery, [author, title, difficulty, deckId]);
        res.status(201).json(comboResult.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to create a combo' });
    }
}

export const removeCombo = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    try {
        await pool.query('DELETE FROM combos WHERE id = $1', [comboId]);
        res.status(200).json({ message: 'Combo removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to remove a combo' });
    }
}

export const updateCombo = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    const { title, difficulty } = req.body;
    try {
        const updateComboQuery = 'UPDATE combos SET title = $1, difficulty = $2, WHERE id = $4';
        await pool.query(updateComboQuery, [title, difficulty, comboId]);
        res.status(200).json({ message: 'Combo updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to update a combo' });
    }
}

export const assignTagToCombo = async (req: Request, res: Response) => {
    const { comboId, tagId } = req.params;
    try {
        const assignTagQuery = 'INSERT INTO combo_tags (combo_id, tag_id) VALUES ($1, $2)';
        await pool.query(assignTagQuery, [comboId, tagId]);
        res.status(200).json({ message: 'Tag assigned to combo successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to assign a tag to a combo' });
    }
}