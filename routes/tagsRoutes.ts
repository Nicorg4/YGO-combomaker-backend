import { Router } from 'express'
import { createTag, deleteTag, getAllTags, getTagsByComboId, updateTag } from '../controllers/tagsController';

const router = Router();

router.get('/', getAllTags)
router.get('/combo/:comboId', getTagsByComboId)
router.post('/', createTag)
router.put('/:tagId', updateTag)
router.delete('/:tagId', deleteTag)

export default router