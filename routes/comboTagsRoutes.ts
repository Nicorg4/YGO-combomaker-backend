import { Router } from "express";
import { createComboTag } from "../controllers/comboTagsController";

const router = Router();

router.post('/', createComboTag)

export default router;