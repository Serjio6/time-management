const express = require('express');
const chatController = require('../controllers/chat.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const { aiLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/message', aiLimiter, validate(schemas.chatMessage), chatController.sendMessage);
router.get('/conversations', chatController.listConversations);
router.get('/:id', chatController.getConversation);
router.delete('/:id', chatController.deleteConversation);
router.post('/:id/feedback', chatController.rateResponse);

module.exports = router;
