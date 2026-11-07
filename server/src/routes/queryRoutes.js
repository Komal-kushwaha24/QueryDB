import express from 'express';
import { handleClarify, handleExplain, handleQuery } from '../controllers/queryController.js';

const router = express.Router();

router.post('/query', handleQuery);
router.post('/ai/clarify', handleClarify);
router.post('/ai/explain', handleExplain);

export default router;

