import { Request, Response } from 'express';
import { pool } from '../dbConnection';


export const getCombos = async (req: Request, res: Response) => {
    const { deckId } = req.params;
    try {
        const combosResult = await pool.query('SELECT * FROM combos WHERE deck_id = $1', [deckId]);
        res.status(200).json(combosResult.rows);
    } catch (error) {
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