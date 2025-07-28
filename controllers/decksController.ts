import { Request, Response } from "express";
import { pool } from "../dbConnection";

export const getAllDecks = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  try {
    const totalResult = await pool.query("SELECT COUNT(*) FROM decks");
    const total = parseInt(totalResult.rows[0].count, 10);
    const decksResult = await pool.query(
      `
                SELECT d.*, COUNT(c.id) AS combos_count
                FROM decks d
                LEFT JOIN combos c ON c.deck_id = d.id
                GROUP BY d.id
                ORDER BY combos_count DESC, name ASC
                LIMIT $1 OFFSET $2;
            `,
      [limit, offset]
    );

    const comboCountForEachDeck = await pool.query(
      `
                SELECT deck_id, COUNT(*) AS combo_count
                FROM combos
                GROUP BY deck_id;
            `
    );

    const deckComboCounts = new Map<number, number>();

    comboCountForEachDeck.rows.forEach((row) => {
      deckComboCounts.set(row.deck_id, row.combo_count);
    });

    const decksWithComboCounts = decksResult.rows.map((deck) => {
      const comboCount = deckComboCounts.get(deck.id) || 0;
      return {
        ...deck,
        combos_count: comboCount,
      };
    });

    if (decksResult.rows.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json({
      total,
      page,
      limit,
      decks: decksWithComboCounts,
    });
  } catch (error) {
    console.error("Error fetching decks ordered by combos:", error);
    res.status(500).json({ message: "Error fetching decks" });
  }
};

export const createDeck = async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const image_url = req.file?.filename;
  if (!name || !description || !image_url) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const createDeckQuery =
      "INSERT INTO decks (name, description, image_url) VALUES ($1, $2, $3) RETURNING *";
    await pool.query(createDeckQuery, [name, description, image_url]);
    res.status(201).json({ message: "Deck created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to create a deck" });
  }
};

export const getDeckById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deckResult = await pool.query("SELECT * FROM decks WHERE id = $1", [
      id,
    ]);
    if (deckResult.rows.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(deckResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error while trying to get a deck" });
  }
};

export const removeDeck = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deckResult = await pool.query("DELETE FROM decks WHERE id = $1", [
      id,
    ]);
    if (deckResult.rowCount === 0) {
      return res.status(404).json({ message: "Deck not found" });
    }
    res.status(200).json({ message: "Deck removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to remove a deck" });
  }
};

export const updateDeck = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, title, description, image } = req.body;
  try {
    const deckResult = await pool.query(
      "UPDATE decks SET name = $1, title = $2, description = $3, image = $4 WHERE id = $5",
      [name, title, description, image, id]
    );
    if (deckResult.rowCount === 0) {
      return res.status(404).json({ message: "Deck not found" });
    }
    res.status(200).json({ message: "Deck updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to update a deck" });
  }
};
