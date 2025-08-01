import { Request, Response } from "express";
import { pool } from "../dbConnection";

export const getCombo = async (req: Request, res: Response) => {
  const { comboId } = req.params;
  try {
    const comboResult = await pool.query("SELECT * FROM combos WHERE id = $1", [
      comboId,
    ]);
    const combo = comboResult.rows[0];
    if (!combo) {
      return res.status(404).json({ message: "Combo not found" });
    }

    const tagsResult = await pool.query(
      `
            SELECT ct.combo_id, t.id, t.name
            FROM combo_tags ct
            JOIN tags t ON ct.tag_id = t.id
            WHERE ct.combo_id = $1
        `,
      [comboId]
    );

    const startingHandResult = await pool.query(
      `
            SELECT sh.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_starting_hand sh
            JOIN cards c ON sh.card_id = c.id
            WHERE sh.combo_id = $1
            ORDER BY sh.combo_id, sh.position
        `,
      [comboId]
    );

    const finalBoardResult = await pool.query(
      `
            SELECT fb.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_final_board fb
            JOIN cards c ON fb.card_id = c.id
            WHERE fb.combo_id = $1
            ORDER BY fb.combo_id, fb.position
        `,
      [comboId]
    );

    const tags = tagsResult.rows.map(({ id, name }) => ({ id, name }));
    const starting_hand = startingHandResult.rows.map(
      ({ card_id, card_name }) => ({ card_id, card_name })
    );
    console.log(starting_hand);
    const final_board = finalBoardResult.rows.map(({ card_id, card_name }) => ({
      card_id,
      card_name,
    }));

    res.status(200).json({
      ...combo,
      tags,
      starting_hand,
      final_board,
    });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to get a combo" });
  }
};

export const getCombosByDeckId = async (req: Request, res: Response) => {
  const { deckId } = req.params;

  try {
    const combosResult = await pool.query(
      "SELECT * FROM combos WHERE deck_id = $1",
      [deckId]
    );
    const combos = combosResult.rows;

    if (combos.length === 0) {
      return res.status(200).json([]);
    }

    const comboIds = combos.map((combo) => combo.id);

    const tagsResult = await pool.query(
      `
            SELECT ct.combo_id, t.id, t.name
            FROM combo_tags ct
            JOIN tags t ON ct.tag_id = t.id
            WHERE ct.combo_id = ANY($1)
        `,
      [comboIds]
    );

    const startingHandResult = await pool.query(
      `
            SELECT sh.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_starting_hand sh
            JOIN cards c ON sh.card_id = c.id
            WHERE sh.combo_id = ANY($1)
            ORDER BY sh.combo_id, sh.position
        `,
      [comboIds]
    );

    const finalBoardResult = await pool.query(
      `
            SELECT fb.combo_id, c.id AS card_id, c.name AS card_name
            FROM combo_final_board fb
            JOIN cards c ON fb.card_id = c.id
            WHERE fb.combo_id = ANY($1)
            ORDER BY fb.combo_id, fb.position
        `,
      [comboIds]
    );

    const combosWithDetails = combos.map((combo) => {
      const tags = tagsResult.rows
        .filter((tag) => tag.combo_id === combo.id)
        .map(({ id, name }) => ({ id, name }));

      const starting_hand = startingHandResult.rows
        .filter((card) => card.combo_id === combo.id)
        .map(({ card_id, card_name }) => ({ card_id, card_name }));

      const final_board = finalBoardResult.rows
        .filter((card) => card.combo_id === combo.id)
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
    console.error("Error getting combos:", error);
    res
      .status(500)
      .json({ message: "Error while trying to get combos by deck id" });
  }
};

export const createCombo = async (req: Request, res: Response) => {
  const { deckId } = req.params;
  const { author, title, difficulty } = req.body;
  if (!author || !title || !difficulty) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const createComboQuery =
      "INSERT INTO combos (author, title, difficulty, deck_id) VALUES ($1, $2, $3, $4) RETURNING *";
    const comboResult = await pool.query(createComboQuery, [
      author,
      title,
      difficulty,
      deckId,
    ]);
    res.status(201).json(comboResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error while trying to create a combo" });
  }
};

export const removeCombo = async (req: Request, res: Response) => {
  const { comboId } = req.params;
  try {
    await pool.query("DELETE FROM combos WHERE id = $1", [comboId]);
    res.status(200).json({ message: "Combo removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to remove a combo" });
  }
};

export const updateCombo = async (req: Request, res: Response) => {
  const { comboId } = req.params;
  const { title, difficulty } = req.body;
  try {
    const updateComboQuery =
      "UPDATE combos SET title = $1, difficulty = $2, WHERE id = $4";
    await pool.query(updateComboQuery, [title, difficulty, comboId]);
    res.status(200).json({ message: "Combo updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to update a combo" });
  }
};

export const assignTagToCombo = async (req: Request, res: Response) => {
  const { comboId, tagId } = req.params;
  try {
    const assignTagQuery =
      "INSERT INTO combo_tags (combo_id, tag_id) VALUES ($1, $2)";
    await pool.query(assignTagQuery, [comboId, tagId]);
    res.status(200).json({ message: "Tag assigned to combo successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error while trying to assign a tag to a combo" });
  }
};

export const createFullCombo = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      deckId,
      author,
      title,
      difficulty,
      tags,
      starting_hand,
      final_board,
      steps,
    } = req.body;

    if (!deckId || !author || !title || !difficulty) {
      return res.status(400).json({ message: "Missing required fields" });
    }

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

    starting_hand?.forEach(addUniqueCard);
    final_board?.forEach(addUniqueCard);
    steps?.forEach(
      (step: {
        card_id: number;
        action_text: string;
        step_order: number;
        target_cards?: { card_id: number; card_name: string }[];
      }) => {
        step.target_cards?.forEach(addUniqueCard);
      }
    );

    for (const card of allCards) {
      await client.query(
        `INSERT INTO cards (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [card.card_id, card.card_name]
      );
    }

    const comboRes = await client.query(
      `INSERT INTO combos (author, title, difficulty, deck_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [author, title, difficulty, deckId]
    );
    const combo = comboRes.rows[0];

    if (Array.isArray(tags)) {
      for (const tagId of tags) {
        await client.query(
          `INSERT INTO combo_tags (combo_id, tag_id) VALUES ($1, $2)`,
          [combo.id, tagId]
        );
      }
    }

    if (Array.isArray(starting_hand)) {
      for (let i = 0; i < starting_hand.length; i++) {
        const card = starting_hand[i];
        await client.query(
          `INSERT INTO combo_starting_hand (combo_id, card_id, position) VALUES ($1, $2, $3)`,
          [combo.id, card.card_id, i]
        );
      }
    }

    if (Array.isArray(final_board)) {
      for (let i = 0; i < final_board.length; i++) {
        const card = final_board[i];
        await client.query(
          `INSERT INTO combo_final_board (combo_id, card_id, position) VALUES ($1, $2, $3)`,
          [combo.id, card.card_id, i]
        );
      }
    }

    if (Array.isArray(steps)) {
      for (const step of steps) {
        const stepRes = await client.query(
          `INSERT INTO steps (card_id, action_text, step_order, combo_id) VALUES ($1, $2, $3, $4) RETURNING id`,
          [step.card_id, step.action_text, step.step_order, combo.id]
        );
        const stepId = stepRes.rows[0].id;

        if (Array.isArray(step.target_cards) && step.target_cards.length > 0) {
          for (const target of step.target_cards) {
            await client.query(
              `INSERT INTO step_targets (step_id, target_card_id) VALUES ($1, $2)`,
              [stepId, target.card_id]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Combo created successfully", combo });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating full combo:", error);
    res.status(500).json({ message: "Error while creating full combo" });
  } finally {
    client.release();
  }
};

export const updateFullCombo = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      deckId,
      author,
      title,
      difficulty,
      tags,
      starting_hand,
      final_board,
      steps,
    } = req.body;

    const { comboId } = req.params;

    if (!comboId || !deckId || !author || !title || !difficulty) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE combos SET author = $1, title = $2, difficulty = $3, deck_id = $4 WHERE id = $5`,
      [author, title, difficulty, deckId, comboId]
    );

    await client.query(`DELETE FROM combo_tags WHERE combo_id = $1`, [comboId]);
    await client.query(`DELETE FROM combo_starting_hand WHERE combo_id = $1`, [
      comboId,
    ]);
    await client.query(`DELETE FROM combo_final_board WHERE combo_id = $1`, [
      comboId,
    ]);

    const stepIdsRes = await client.query(
      `SELECT id FROM steps WHERE combo_id = $1`,
      [comboId]
    );
    const stepIds = stepIdsRes.rows.map((r) => r.id);
    if (stepIds.length > 0) {
      await client.query(`DELETE FROM step_targets WHERE step_id = ANY($1)`, [
        stepIds,
      ]);
    }

    await client.query(`DELETE FROM steps WHERE combo_id = $1`, [comboId]);

    if (Array.isArray(tags)) {
      for (const tagId of tags) {
        await client.query(
          `INSERT INTO combo_tags (combo_id, tag_id) VALUES ($1, $2)`,
          [comboId, tagId]
        );
      }
    }

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

    starting_hand?.forEach(addUniqueCard);
    final_board?.forEach(addUniqueCard);
    steps?.forEach(
      (step: {
        card_id: number;
        action_text: string;
        step_order: number;
        target_cards?: { card_id: number; card_name: string }[];
      }) => {
        step.target_cards?.forEach(addUniqueCard);
      }
    );

    for (const card of allCards) {
      await client.query(
        `INSERT INTO cards (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [card.card_id, card.card_name]
      );
    }

    if (Array.isArray(starting_hand)) {
      for (let i = 0; i < starting_hand.length; i++) {
        const card = starting_hand[i];
        await client.query(
          `INSERT INTO combo_starting_hand (combo_id, card_id, position) VALUES ($1, $2, $3)`,
          [comboId, card.card_id, i]
        );
      }
    }

    if (Array.isArray(final_board)) {
      for (let i = 0; i < final_board.length; i++) {
        const card = final_board[i];
        await client.query(
          `INSERT INTO combo_final_board (combo_id, card_id, position) VALUES ($1, $2, $3)`,
          [comboId, card.card_id, i]
        );
      }
    }

    if (Array.isArray(steps)) {
      for (const step of steps) {
        const stepRes = await client.query(
          `INSERT INTO steps (card_id, action_text, step_order, combo_id) VALUES ($1, $2, $3, $4) RETURNING id`,
          [step.card_id, step.action_text, step.step_order, comboId]
        );
        const stepId = stepRes.rows[0].id;

        if (Array.isArray(step.target_cards) && step.target_cards.length > 0) {
          for (const target of step.target_cards) {
            await client.query(
              `INSERT INTO step_targets (step_id, target_card_id) VALUES ($1, $2)`,
              [stepId, target.card_id]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Combo updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating full combo:", error);
    res.status(500).json({ message: "Error while updating combo" });
  } finally {
    client.release();
  }
};
