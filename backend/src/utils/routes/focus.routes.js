const express = require('express');
const focusController = require('../controllers/focus.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');

const router = express.Router();

router.post('/start', validate(schemas.startFocusSession), focusController.startSession);
router.patch('/:id/end', focusController.endSession);
router.post('/:id/interrupt', focusController.logInterruption);
router.get('/stats', focusController.getStats);

module.exports = router;
