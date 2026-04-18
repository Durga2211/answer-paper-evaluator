const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fs = require('fs-extra');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const resultsDir = path.join(__dirname, 'data/results');
const uploadsDir = path.join(__dirname, 'uploads');
const examsFile = path.join(__dirname, 'data/exams.json');

fs.ensureDirSync(dataDir);
fs.ensureDirSync(resultsDir);
fs.ensureDirSync(uploadsDir);

if (!fs.existsSync(examsFile)) {
    fs.writeJsonSync(examsFile, [], { spaces: 2 });
}

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
const examRoutes = require('./routes/exams');
const uploadRoutes = require('./routes/uploads');
const resultRoutes = require('./routes/results');
const generateRoutes = require('./routes/generate');
const ocrExtractRoutes = require('./routes/ocr-extract');

app.use('/api/exams', examRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/ocr', ocrExtractRoutes);

app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});
