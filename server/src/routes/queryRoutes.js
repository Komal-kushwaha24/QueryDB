import express from 'express';
import { handleQuery } from '../controllers/queryController.js';

const router = express.Router();

router.post('/query', handleQuery);

export default router;
