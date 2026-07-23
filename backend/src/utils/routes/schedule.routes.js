const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');

const router = express.Router();

router.get('/', scheduleController.getSchedule);
router.post('/generate', validate(schemas.generateSchedule), scheduleController.generateSchedule);
router.put('/:id', scheduleController.updateSchedule);
router.patch('/:id/adjust', scheduleController.adjustSchedule);
router.post('/:id/complete', scheduleController.completeBlock);

module.exports = router;
