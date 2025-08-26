// routes/search.js
import { Router } from 'express';
import Logbook from '../models/Logbook.js';
import { embedText } from '../services/embeddings.js';

const router = Router();

/**
 * POST /api/search/semantic
 * Body: { q: string, unit?: string, department?: string, limit?: number }
 * Returns top-k semantic matches from Logbook using Atlas Vector Search.
 */
router.post('/semantic', async (req, res, next) => {
  try {
    const { q, unit, department, limit = 10 } = req.body || {};
    if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q (query) is required' });

    const qvec = await embedText(q);
    const match = {};
    if (unit) match.unit = unit;
    if (department) match.department = department;

    // Aggregate with $search knnBeta (requires Atlas Search index with vector path "embedding")
    const results = await Logbook.aggregate([
      { $match: match },
      { $search: { knnBeta: { vector: qvec, path: 'embedding', k: Math.min(+limit || 10, 50) } } },
      { $limit: Math.min(+limit || 10, 50) },
      { $project: { title: 1, body: 1, unit: 1, department: 1, date: 1, score: { $meta: 'searchScore' } } }
    ]);

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
