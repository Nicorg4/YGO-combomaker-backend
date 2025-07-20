import { Router } from 'express';
import { createStepTarget, getStepTargets, removeTarget, updateTarget } from '../controllers/stepTargetsController';

const router = Router();

router.get('/step/:stepId', getStepTargets);
router.post('/step/:stepId', createStepTarget);
router.delete('/:targetId', removeTarget);
router.put('/:targetId', updateTarget);

export default router