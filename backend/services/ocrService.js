const { execFile } = require('child_process');
const path = require('path');

/**
 * Sends images to the Python FastAPI OCR microservice.
 * Returns the aggregated extracted text.
 * @param {string[]} imagePaths 
 * @returns {Promise<string>}
 */
const extractTextFromImages = async (imagePaths) => {
    if (!imagePaths || imagePaths.length === 0) {
        return '';
    }

    console.log(`[OCR Node] Sending ${imagePaths.length} image(s) to FastAPI OCR microservice...`);
    
    let combinedText = '';

    for (const imagePath of imagePaths) {
        try {
            const data = await new Promise((resolve, reject) => {
                execFile('curl', [
                    '-s', '-X', 'POST',
                    'http://127.0.0.1:8000/ocr',
                    '-F', `file=@${imagePath}`
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
            console.error('[OCR Node] ❌ Failed to process image via OCR microservice request:', error.message);
        }
    }

    return combinedText.trim();
};

module.exports = { extractTextFromImages };
