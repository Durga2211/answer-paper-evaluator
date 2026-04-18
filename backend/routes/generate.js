const express = require('express');
const router = express.Router();
const { generateModelAnswer } = require('../services/gemmaService');

router.post('/model-answer', async (req, res) => {
    const { questionText } = req.body;

    if (!questionText) {
        return res.status(400).json({ error: 'Missing question text.' });
    }

    try {
        const answer = await generateModelAnswer(questionText);
        res.json({ modelAnswer: answer });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate model answer.' });
    }
});

module.exports = router;
