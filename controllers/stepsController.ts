import { Request, Response } from 'express';
import { pool } from '../dbConnection';

export const getComboStep = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    if (!comboId) {
        return res.status(400).json({ message: 'Missing combo id' });
    }
    try{
        const stepsResult = await pool.query('SELECT * FROM steps WHERE combo_id = $1', [comboId]);
        if (stepsResult.rows.length === 0) {
            return res.status(404).json({ message: 'No steps found for this combo' });
        }
        res.status(200).json(stepsResult.rows);
    }catch (error) {
        res.status(500).json({ message: 'Error while trying to get combo steps' });
    }
}

export const createComboStep = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    const { card_id, action_text, step_order } = req.body;
    if (!card_id || !action_text || !step_order) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const createStepQuery = 'INSERT INTO steps (card_id, action_text, step_order, combo_id) VALUES ($1, $2, $3, $4) RETURNING *';
        const stepResult = await pool.query(createStepQuery, [card_id, action_text, step_order, comboId]);
        res.status(201).json(stepResult.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to create a step' });
    }
}

export const removeStep = async (req:Request, res:Response) => {
    const { stepId } = req.params;
    try {
        await pool.query('DELETE FROM steps WHERE id = $1', [stepId]);
        res.status(200).json({ message: 'Step removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to remove a step' });
    }
}

export const updateStep = async (req:Request, res:Response) => {
    const { stepId } = req.params;
    const { card_id, action_text, step_order } = req.body;
    try {
        const updateStepQuery = 'UPDATE steps SET card_id = $1, action_text = $2, step_order = $3 WHERE id = $4';
        await pool.query(updateStepQuery, [card_id, action_text, step_order, stepId]);
        res.status(200).json({ message: 'Step updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to update a step' });
    }
}