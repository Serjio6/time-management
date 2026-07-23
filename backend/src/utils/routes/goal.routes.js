const express = require('express');
const goalController = require('../controllers/goal.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');

const router = express.Router();

router.get('/', goalController.listGoals);
router.post('/', validate(schemas.createGoal), goalController.createGoal);
router.get('/:id', goalController.getGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.patch('/:id/milestones/:milestoneId/complete', goalController.completeMilestone);
router.post('/:id/ai-roadmap', goalController.generateAiRoadmap);

module.exports = router;
