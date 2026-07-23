const express = require('express');
const habitController = require('../controllers/habit.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');

const router = express.Router();

router.get('/', habitController.listHabits);
router.post('/', validate(schemas.createHabit), habitController.createHabit);
router.get('/streaks', habitController.getStreakLeaderboard);
router.get('/:id', habitController.getHabit);
router.put('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);
router.post('/:id/complete', habitController.completeHabit);

module.exports = router;
