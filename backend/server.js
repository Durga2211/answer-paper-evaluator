const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fs = require('fs-extra');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── CORS Configuration ───
// Allow all origins — this is an internal evaluation tool
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// ─── Body Parsing ───
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

app.use('/uploads', express.static(uploadsDir));

// ─── Health Check (for Render cold-start detection) ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── Routes ───
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

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`CORS: all origins allowed`);
});
