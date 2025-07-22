import { Router } from 'express';
import { createFinalBoard } from '../controllers/comboFinalBoardController';

const router = Router();

router.post('/', createFinalBoard);

export default router;