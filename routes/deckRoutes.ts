import { Router } from 'express';
import {
  createDeck,
  getAllDecks,
  getDeckById,
  removeDeck,
  updateDeck,
} from '../controllers/decksController';

const router = Router();

router.get('/', getAllDecks);
router.post('/', createDeck);
router.get('/:id', getDeckById);
router.put('/:id', updateDeck);
router.delete('/:id', removeDeck);

export default router;
