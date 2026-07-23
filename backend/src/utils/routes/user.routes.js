const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/stats', userController.getStats);
router.get('/badges', userController.getBadges);
router.put('/settings', userController.updateSettings);
router.post('/backup', userController.createBackup);
router.post('/restore', userController.restoreBackup);

module.exports = router;
