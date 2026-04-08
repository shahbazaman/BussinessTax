import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { getLedger } from '../controllers/ledgerController.js';

const router = express.Router();

// GET /api/ledger
// Query: ?accountId=&startDate=&endDate=&type=
router.get('/', protect, getLedger);

export default router;