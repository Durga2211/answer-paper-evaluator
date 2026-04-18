const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXAMS_FILE = path.join(__dirname, '../data/exams.json');

// Get all exams
router.get('/', async (req, res) => {
    try {
        const exams = await fs.readJson(EXAMS_FILE);
        res.json(exams);
    } catch (error) {
        res.json([]);
    }
});

// Create new exam
router.post('/', async (req, res) => {
    try {
        const newExam = {
            examId: uuidv4(),
            ...req.body,
            createdAt: new Date().toISOString()
        };

        let exams = [];
        try {
            if (await fs.pathExists(EXAMS_FILE)) {
                exams = await fs.readJson(EXAMS_FILE);
            }
        } catch (e) { }

        exams.push(newExam);
        await fs.writeJson(EXAMS_FILE, exams, { spaces: 2 });
        res.json(newExam);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create exam' });
    }
});

module.exports = router;
