import { Request, Response } from 'express';
import { pool } from '../dbConnection';

export const getStepTargets = async (req: Request, res: Response) => {
    const { stepId } = req.params;
    try {
        const stepTargetsResult = await pool.query('SELECT * FROM step_targets WHERE step_id = $1', [stepId]);
        res.status(200).json(stepTargetsResult.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to get step targets' });
    }
}

export const createStepTarget = async (req: Request, res: Response) => {
    const { stepId } = req.params;
    const { target_card_id } = req.body;
    if (!target_card_id) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const createStepTargetQuery = 'INSERT INTO step_targets (step_id, target_card_id) VALUES ($1, $2) RETURNING *';
        const stepTargetResult = await pool.query(createStepTargetQuery, [stepId, target_card_id]);
        res.status(201).json(stepTargetResult.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to create a step target' });
    }
}

export const removeTarget = async (req: Request, res: Response) => {
    const { stepTargetId } = req.params;
    try {
        await pool.query('DELETE FROM step_targets WHERE id = $1', [stepTargetId]);
        res.status(200).json({ message: 'Step target removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to remove a step target' });
    }
}

export const updateTarget = async (req: Request, res: Response) => {
    const { stepTargetId } = req.params;
    const { target_card_id } = req.body;
    try {
        const updateTargetQuery = 'UPDATE step_targets SET target_card_id = $1 WHERE id = $2';
        await pool.query(updateTargetQuery, [target_card_id, stepTargetId]);
        res.status(200).json({ message: 'Step target updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to update a step target' });
    }
}