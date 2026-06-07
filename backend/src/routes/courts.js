const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/courtsController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authMiddleware, adminMiddleware, create);
router.put('/:id', authMiddleware, adminMiddleware, update);
router.delete('/:id', authMiddleware, adminMiddleware, remove);

module.exports = router;
