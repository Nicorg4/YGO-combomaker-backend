import { Request, Response } from "express";
import { pool } from "../dbConnection";

export const getComboStep = async (req: Request, res: Response) => {
  const { comboId } = req.params;

  if (!comboId) {
    return res.status(400).json({ message: "Missing combo id" });
  }

  try {
    const stepsResult = await pool.query(
      `SELECT * FROM steps WHERE combo_id = $1 ORDER BY step_order`,
      [comboId]
    );

    if (stepsResult.rows.length === 0) {
      return res.status(200).json([]);
    }

    const stepIds = stepsResult.rows.map((step) => step.id);

    const targetCardsResult = await pool.query(
      `
      SELECT
        st.id,
        st.step_id,
        st.target_card_id AS card_id,
        c.name AS card_name
      FROM step_targets st
      JOIN cards c ON c.id = st.target_card_id
      WHERE st.step_id = ANY($1)
    `,
      [stepIds]
    );

    const stepsWithTargets = stepsResult.rows.map((step) => {
      const targets = targetCardsResult.rows.filter(
        (tc) => tc.step_id === step.id
      );
      return {
        ...step,
        step_targets: targets,
      };
    });

    res.status(200).json(stepsWithTargets);
  } catch (error) {
    console.error("Error in getComboStep:", error);
    res.status(500).json({ message: "Error while trying to get combo steps" });
  }
};

export const createComboStep = async (req: Request, res: Response) => {
  const { comboId } = req.params;
  const { card_id, action_text, step_order, target_card_ids } = req.body;

  if (!card_id || !action_text || step_order == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const createStepQuery =
      "INSERT INTO steps (card_id, action_text, step_order, combo_id) VALUES ($1, $2, $3, $4) RETURNING *";
    const stepResult = await pool.query(createStepQuery, [
      card_id,
      action_text,
      step_order,
      comboId,
    ]);
    const createdStep = stepResult.rows[0];

    if (Array.isArray(target_card_ids) && target_card_ids.length > 0) {
      const insertTargetsPromises = target_card_ids.map(
        (targetCardId: number) =>
          pool.query(
            "INSERT INTO step_targets (step_id, target_card_id) VALUES ($1, $2)",
            [createdStep.id, targetCardId]
          )
      );
      await Promise.all(insertTargetsPromises);
    }

    res.status(201).json({ message: "Step created", step: createdStep });
  } catch (error) {
    console.error("Error creating step:", error);
    res.status(500).json({ message: "Error while trying to create a step" });
  }
};

export const removeStep = async (req: Request, res: Response) => {
  const { stepId } = req.params;
  try {
    await pool.query("DELETE FROM steps WHERE id = $1", [stepId]);
    res.status(200).json({ message: "Step removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to remove a step" });
  }
};

export const updateStep = async (req: Request, res: Response) => {
  const { stepId } = req.params;
  const { card_id, action_text, step_order } = req.body;
  try {
    const updateStepQuery =
      "UPDATE steps SET card_id = $1, action_text = $2, step_order = $3 WHERE id = $4";
    await pool.query(updateStepQuery, [
      card_id,
      action_text,
      step_order,
      stepId,
    ]);
    res.status(200).json({ message: "Step updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error while trying to update a step" });
  }
};
