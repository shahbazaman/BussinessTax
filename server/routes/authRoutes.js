import express from 'express';
import { registerUser, loginUser, updateUserSettings, getUserProfile, updatePassword } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js'; // Adjust path if needed
import { googleLogin } from '../controllers/authController.js';
import multer from 'multer';
import { uploadProfilePhoto } from '../controllers/authController.js';
import { getCustomUnits, updateCustomUnits } from '../controllers/userController.js';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); 
const router = express.Router();

router.get('/custom-units', protect, getCustomUnits);
router.put('/custom-units', protect, updateCustomUnits);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
// GET profile for the Settings page load
router.get('/profile', protect, getUserProfile);
router.post('/upload-photo', protect, upload.single('photo'), uploadProfilePhoto);
// PUT update for the Settings page save
router.put('/update-settings', protect, updateUserSettings);
router.put('/update-password', protect, updatePassword);

export default router;