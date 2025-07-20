import { Router } from "express";
import { assignTagToCombo, createCombo, getCombosByDeckId, removeCombo, updateCombo, getCombo } from "../controllers/combosController";

const router = Router();

router.get("/:comboId", getCombo);
router.get("/deck/:deckId", getCombosByDeckId);
router.post("/deck/:deckId", createCombo);
router.delete("/:comboId", removeCombo);
router.put("/:comboId", updateCombo);
router.put("/:comboId/assign-tag/:tagId", assignTagToCombo);

export default router;