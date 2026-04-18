const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../data/results');

// Get all results
router.get('/', async (req, res) => {
    try {
        const files = await fs.readdir(RESULTS_DIR);
        const results = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const result = await fs.readJson(path.join(RESULTS_DIR, file));
                results.push(result);
            }
        }
        res.json(results);
    } catch (error) {
        res.json([]);
    }
});

// Update manual marks
router.patch('/:paperId', async (req, res) => {
    const { paperId } = req.params;
    const { answers, totalMarks } = req.body;

    try {
        const resultFile = path.join(RESULTS_DIR, `${paperId}.json`);
        if (!(await fs.pathExists(resultFile))) {
            return res.status(404).json({ error: 'Result not found' });
        }

        const result = await fs.readJson(resultFile);
        result.answers = answers;
        result.totalMarks = totalMarks;

        await fs.writeJson(resultFile, result, { spaces: 2 });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update result' });
    }
});

module.exports = router;
