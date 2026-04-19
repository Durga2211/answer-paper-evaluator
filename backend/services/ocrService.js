const { execFile } = require('child_process');
const path = require('path');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000/ocr';

/**
 * Sends images to the OCR microservice.
 * Returns the aggregated extracted text.
 * @param {string[]} imagePaths 
 * @returns {Promise<string>}
 */
const extractTextFromImages = async (imagePaths) => {
    if (!imagePaths || imagePaths.length === 0) {
        return '';
    }

    console.log(`[OCR Node] Sending ${imagePaths.length} image(s) to OCR service at ${OCR_SERVICE_URL}...`);
    
    let combinedText = '';

    for (const imagePath of imagePaths) {
        try {
            const data = await new Promise((resolve, reject) => {
                execFile('curl', [
                    '-s', '-X', 'POST',
                    OCR_SERVICE_URL,
                    '-F', `file=@${imagePath}`,
                    '--connect-timeout', '30',
                    '--max-time', '60'
                ], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(stdout);
                });
            });

            const result = JSON.parse(data);
            if (result && result.text) {
                combinedText += result.text + '\n';
                console.log(`[OCR Node] Extracted text length: ${result.text.length}, Confidence: ${result.confidence}`);
            }
        } catch (error) {
            console.error('[OCR Node] ❌ Failed to process image via OCR service:', error.message);
        }
    }

    return combinedText.trim();
};

module.exports = { extractTextFromImages };
