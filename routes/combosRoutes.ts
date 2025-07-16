import { Router } from "express";
import { assignTagToCombo, createCombo, getCombos, removeCombo, updateCombo } from "../controllers/combosController";

const router = Router();

router.get("/deck/:deckId", getCombos);
router.post("/deck/:deckId", createCombo);
router.delete("/:comboId", removeCombo);
router.put("/:comboId", updateCombo);
router.put("/:comboId/assign-tag/:tagId", assignTagToCombo);

export default router;