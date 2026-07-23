const express = require('express');
const taskController = require('../controllers/task.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');

const router = express.Router();

router.get('/', taskController.listTasks);
router.post('/', validate(schemas.createTask), taskController.createTask);
router.post('/bulk', taskController.bulkOperation);
router.get('/:id', taskController.getTask);
router.put('/:id', validate(schemas.updateTask), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/complete', taskController.completeTask);
router.patch('/:id/skip', taskController.skipTask);

module.exports = router;
