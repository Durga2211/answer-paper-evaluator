const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const { extractTextFromImages } = require('../services/ocrService');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/model-answers');
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

/**
 * POST /api/ocr/extract
 * Accepts multiple image files, runs OCR on them, returns combined extracted text.
 * Used by the CreateExam page for uploading model answer images.
 */
router.post('/extract', upload.array('images'), async (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images provided.' });
    }

    try {
        const imagePaths = files.map(f => f.path);
        console.log(`[OCR Extract] Processing ${imagePaths.length} model answer image(s)...`);

        const extractedText = await extractTextFromImages(imagePaths);

        res.json({
            text: extractedText,
            pageCount: files.length,
            filenames: files.map(f => f.filename)
        });
    } catch (error) {
        console.error('[OCR Extract] ❌ Error:', error);
        res.status(500).json({ error: 'Failed to extract text from images.' });
    }
});

module.exports = router;
