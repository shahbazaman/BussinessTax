import express from 'express';
import { registerUser, loginUser, updateUserSettings, getUserProfile } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js'; // Adjust path if needed
import { googleLogin } from '../controllers/authController.js';
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
// GET profile for the Settings page load
router.get('/profile', protect, getUserProfile);

// PUT update for the Settings page save
router.put('/update-settings', protect, updateUserSettings);

export default router;