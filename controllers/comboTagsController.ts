import { Response, Request } from 'express';
import { pool } from '../dbConnection';

export const createComboTag = async (req: Request, res: Response) => {
    const { combo_id, tag_id } = req.body;

    if (!combo_id || !tag_id) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const insertQuery = 'INSERT INTO combo_tags (combo_id, tag_id) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(insertQuery, [combo_id, tag_id]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating combo_tag:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}