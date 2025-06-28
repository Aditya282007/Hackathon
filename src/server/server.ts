// src/server/trainVoiceModel.ts
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';

const app = express();
const upload = multer({ dest: 'uploads/' });

// Store transcriptions for training
const TRAINING_DATA_PATH = path.join(__dirname, 'training-data.json');

interface AudioTrainingSample {
  text: string;
  base64Audio: string;
}

const saveTrainingSample = (sample: AudioTrainingSample) => {
  const existing = fs.existsSync(TRAINING_DATA_PATH)
    ? JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf-8'))
    : [];

  existing.push(sample);
  fs.writeFileSync(TRAINING_DATA_PATH, JSON.stringify(existing, null, 2));
};

// Endpoint to collect training audio + text
app.post('/train-voice', upload.single('file'), (req, res) => {
  const { text } = req.body;
  const file = req.file;

  if (!file || !text) {
    return res.status(400).json({ error: 'Missing file or text' });
  }

  const audioPath = path.resolve(file.path);
  const base64Audio = fs.readFileSync(audioPath).toString('base64');

  saveTrainingSample({ text, base64Audio });

  fs.unlinkSync(audioPath); // Clean up
  return res.json({ success: true });
});

// Optional: Endpoint to trigger offline fine-tuning
app.post('/train-now', (req, res) => {
  exec('python3 scripts/fine_tune.py', (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).send('Training failed');
    }
    console.log(stdout);
    return res.send('Training started');
  });
});

app.listen(5001, () => console.log('Trainer API running on port 5001'));