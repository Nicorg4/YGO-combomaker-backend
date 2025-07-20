import { Router } from 'express';
import {
  createDeck,
  getAllDecks,
  getDeckById,
  removeDeck,
  updateDeck,
} from '../controllers/decksController';
import { upload } from '../config/multer';

const router = Router();

router.get('/', getAllDecks);
router.post('/', upload.single('image'), createDeck);
router.get('/:id', getDeckById);
router.put('/:id', updateDeck);
router.delete('/:id', removeDeck);

export default router;
