const { extractTextFromImages } = require('../services/ocrService');
const { evaluateAnswer } = require('../services/gemmaService');
const path = require('path');
const fs = require('fs');

async function test() {
    const imgPath = path.join(__dirname, '../test_ocr_input.png');

    if (!fs.existsSync(imgPath)) {
        console.error('❌ Test image not found at', imgPath);
        process.exit(1);
    }

    console.log('🧪 Testing EasyOCR + Local Gemma Pipeline...');
    
    try {
        console.log('\n======================================');
        console.log('[STAGE 1] Pulling Text via Python EasyOCR');
        console.log('======================================');
        const extractedText = await extractTextFromImages([imgPath]);
        
        console.log('\n======================================');
        console.log('[STAGE 2] Evaluating Text via Local Gemma');
        console.log('======================================');
        const result = await evaluateAnswer(
            extractedText,
            'What is a stack in data structures and how does it manage elements?',
            10
        );
        
        console.log('\n✅ PIPELINE SUCCESS. FINAL OUTPUT:');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('\n❌ TEST FAILED:', e);
    }
}

test();
