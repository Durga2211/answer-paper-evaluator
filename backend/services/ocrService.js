const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || '';

/**
 * OCR Service with fallback chain:
 * 1. Try external FastAPI OCR microservice (if OCR_SERVICE_URL is set)
 * 2. Fall back to Tesseract.js (built-in, no external dependency)
 * 
 * @param {string[]} imagePaths 
 * @returns {Promise<string>}
 */
const extractTextFromImages = async (imagePaths) => {
    if (!imagePaths || imagePaths.length === 0) {
        return '';
    }

    console.log(`[OCR] Processing ${imagePaths.length} image(s)...`);

    let combinedText = '';

    for (const imagePath of imagePaths) {
        // Verify file exists
        if (!await fs.pathExists(imagePath)) {
            console.error(`[OCR] ❌ File not found: ${imagePath}`);
            continue;
        }

        let text = '';

        // Strategy 1: Try external OCR microservice
        if (OCR_SERVICE_URL) {
            text = await tryExternalOCR(imagePath);
        }

        // Strategy 2: Fall back to Tesseract.js
        if (!text || text.trim().length === 0) {
            console.log(`[OCR] Using Tesseract.js fallback for: ${path.basename(imagePath)}`);
            text = await tryTesseractJS(imagePath);
        }

        if (text && text.trim().length > 0) {
            combinedText += text.trim() + '\n';
            console.log(`[OCR] ✅ Extracted ${text.trim().length} chars from ${path.basename(imagePath)}`);
        } else {
            console.warn(`[OCR] ⚠️ No text extracted from ${path.basename(imagePath)}`);
        }
    }

    return combinedText.trim();
};

/**
 * Try the external FastAPI OCR microservice.
 */
async function tryExternalOCR(imagePath) {
    try {
        const data = await new Promise((resolve, reject) => {
            execFile('curl', [
                '-s', '-X', 'POST',
                OCR_SERVICE_URL,
                '-F', `file=@${imagePath}`,
                '--connect-timeout', '10',
                '--max-time', '30'
            ], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) return reject(error);
                resolve(stdout);
            });
        });

        const result = JSON.parse(data);
        if (result && result.text && result.text.trim().length > 0) {
            console.log(`[OCR External] ✅ Got ${result.text.length} chars, confidence: ${result.confidence || 'N/A'}`);
            return result.text;
        }
        return '';
    } catch (error) {
        console.warn(`[OCR External] ⚠️ Failed: ${error.message}`);
        return '';
    }
}

/**
 * Built-in OCR using Tesseract.js — works offline, no external service needed.
 */
async function tryTesseractJS(imagePath) {
    try {
        const Tesseract = require('tesseract.js');

        const { data } = await Tesseract.recognize(imagePath, 'eng', {
            logger: () => {}, // Suppress progress logs
        });

        if (data && data.text && data.text.trim().length > 0) {
            console.log(`[OCR Tesseract.js] ✅ Got ${data.text.trim().length} chars, confidence: ${Math.round(data.confidence)}%`);
            return data.text.trim();
        }
        return '';
    } catch (error) {
        console.error(`[OCR Tesseract.js] ❌ Failed: ${error.message}`);
        return '';
    }
}

module.exports = { extractTextFromImages };
