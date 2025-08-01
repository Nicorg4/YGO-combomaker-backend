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

export const setDeckInfo = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  const { note, key_cards, main_dangers } = req.body;

  try {
    await client.query("BEGIN");

    const allCards: { card_id: number; card_name: string }[] = [];

    const addUniqueCard = (card: any) => {
      if (
        card &&
        card.card_id &&
        card.card_name &&
        !allCards.some((c) => c.card_id === card.card_id)
      ) {
        allCards.push({ card_id: card.card_id, card_name: card.card_name });
      }
    };

    key_cards?.forEach(
      (kc: { card_id: number; card_name: string; description: string }) =>
        addUniqueCard(kc)
    );
    main_dangers?.forEach(
      (danger: {
        card_id: number;
        card_name: string;
        extra_notes: string;
        responses: {
          card_id: number;
          card_name: string;
        }[];
      }) => {
        addUniqueCard(danger);
        danger.responses?.forEach(addUniqueCard);
      }
    );

    for (const card of allCards) {
      await client.query(
        `INSERT INTO cards (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [card.card_id, card.card_name]
      );
    }

    await client.query(`UPDATE decks SET note = $1 WHERE id = $2`, [note, id]);

    await client.query(`DELETE FROM deck_key_cards WHERE deck_id = $1`, [id]);

    const dangerIdsRes = await client.query(
      `SELECT id FROM deck_main_dangers WHERE deck_id = $1`,
      [id]
    );
    const dangerIds = dangerIdsRes.rows.map((r) => r.id);

    if (dangerIds.length > 0) {
      await client.query(
        `DELETE FROM main_dangers_response WHERE deck_main_danger_id = ANY($1::int[])`,
        [dangerIds]
      );
    }

    await client.query(`DELETE FROM deck_main_dangers WHERE deck_id = $1`, [
      id,
    ]);

    if (Array.isArray(key_cards)) {
      for (const kc of key_cards) {
        await client.query(
          `INSERT INTO deck_key_cards (deck_id, card_id, description) VALUES ($1, $2, $3)`,
          [id, kc.card_id, kc.description]
        );
      }
    }

    if (Array.isArray(main_dangers)) {
      for (const danger of main_dangers) {
        const dangerRes = await client.query(
          `INSERT INTO deck_main_dangers (deck_id, card_id, extra_notes) VALUES ($1, $2, $3) RETURNING id`,
          [id, danger.card_id, danger.extra_notes]
        );
        const dangerId = dangerRes.rows[0].id;

        if (Array.isArray(danger.responses)) {
          for (const resp of danger.responses) {
            await client.query(
              `INSERT INTO main_dangers_response (deck_main_danger_id, card_id) VALUES ($1, $2)`,
              [dangerId, resp.card_id]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Deck info saved successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in setDeckInfo:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

export const getDeckInfo = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  try {
    const deckRes = await client.query(`SELECT name, note FROM decks WHERE id = $1`, [
      id,
    ]);
    const name = deckRes.rows[0]?.name || null;
    const note = deckRes.rows[0]?.note || null;

    const keyCardsRes = await client.query(
      `SELECT k.card_id, c.name AS card_name, k.description
       FROM deck_key_cards k
       JOIN cards c ON k.card_id = c.id
       WHERE k.deck_id = $1`,
      [id]
    );

    const dangersRes = await client.query(
      `SELECT d.id, d.card_id, c.name AS card_name, d.extra_notes
       FROM deck_main_dangers d
       JOIN cards c ON d.card_id = c.id
       WHERE d.deck_id = $1
       ORDER BY d.id ASC
       `,
      [id]
    );

    const main_dangers = [];

    for (const danger of dangersRes.rows) {
      const respRes = await client.query(
        `SELECT r.card_id, c.name AS card_name
         FROM main_dangers_response r
         JOIN cards c ON r.card_id = c.id
         WHERE r.deck_main_danger_id = $1`,
        [danger.id]
      );

      main_dangers.push({
        card_id: danger.card_id,
        card_name: danger.card_name,
        extra_notes: danger.extra_notes,
        responses: respRes.rows,
      });
    }

    res.status(200).json({
      name,
      note,
      key_cards: keyCardsRes.rows,
      main_dangers,
    });
  } catch (error) {
    console.error("Error in getDeckInfo:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
