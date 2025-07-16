import { Router } from 'express';
import { createComboStep, getComboStep, removeStep, updateStep } from '../controllers/stepsController';

const router = Router();

router.get('/combo/:comboId', getComboStep);
router.post('/combo/:comboId', createComboStep);
router.delete('/:stepId', removeStep);
router.put('/:stepId', updateStep);

export default router