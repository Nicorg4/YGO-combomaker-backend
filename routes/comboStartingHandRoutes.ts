import { Router } from 'express';
import { createComboStartingHand } from '../controllers/comboStartingHandController';

const router = Router();

router.post('/', createComboStartingHand);

export default router;