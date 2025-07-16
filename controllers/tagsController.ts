import { Request, Response } from 'express';
import { pool } from '../dbConnection';

export const getAllTags = async (req: Request, res: Response) => {
    try {
        const tagsResult = await pool.query('SELECT * FROM tags');
        res.status(200).json(tagsResult.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to get tags' });
    }
}

export const getTagsByComboId = async (req: Request, res: Response) => {
    const { comboId } = req.params;
    try {
        const tagsQuery = 'SELECT tags.* FROM tags JOIN combo_tags ON tags.id = combo_tags.tag_id WHERE combo_tags.combo_id = $1';
        const tagsResult = await pool.query(tagsQuery, [comboId]);
        res.status(200).json(tagsResult.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to get tags by combo id' });
    }
}

export const createTag = async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const checkQuery = 'SELECT * FROM tags WHERE name = $1';
        const existing = await pool.query(checkQuery, [name]);

        if ((existing.rowCount ?? 0) > 0) {
            return res.status(409).json({ message: 'Tag already exists' });
        }

        const createTagQuery = 'INSERT INTO tags (name) VALUES ($1) RETURNING *';
        const tagResult = await pool.query(createTagQuery, [name]);
        res.status(201).json(tagResult.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to create a tag' });
    }
}

export const deleteTag = async (req: Request, res: Response) => {
    const { tagId } = req.params;
    try {
        const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING *', [tagId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.status(200).json({ message: 'Tag deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to delete a tag' });
    }
}

export const updateTag = async (req: Request, res: Response) => {
    const { tagId } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const updateTagQuery = 'UPDATE tags SET name = $1 WHERE id = $2';
        await pool.query(updateTagQuery, [name, tagId]);
        res.status(200).json({ message: 'Tag updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while trying to update a tag' });
    }
}