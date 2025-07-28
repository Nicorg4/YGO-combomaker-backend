import { Router } from 'express';
import {
  createDeck,
  getAllDecks,
  getDeckById,
  getDeckInfo,
  removeDeck,
  setDeckInfo,
  updateDeck,
} from '../controllers/decksController';
import { upload } from '../config/multer';

const router = Router();

router.get('/', getAllDecks);
router.post('/', upload.single('image'), createDeck);
router.get('/:id', getDeckById);
router.put('/:id', updateDeck);
router.delete('/:id', removeDeck);
router.get('/info/:id', getDeckInfo)
router.post('/info/:id', setDeckInfo)

export default router;
