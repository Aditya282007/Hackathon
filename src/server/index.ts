// src/server/index.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // To handle large base64 audio

app.post('/chat', async (req, res) => {
  const { message, audioBase64 } = req.body;

  const prompt = audioBase64
    ? `Transcribe this patient audio (base64-encoded): ${audioBase64}`
    : message;

  if (!prompt) {
    return res.status(400).json({ response: 'No message or audioBase64 provided.' });
  }

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'med-intake',
        prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return res.json({ response: data.response?.trim() || '' });
  } catch (err) {
    console.error('Error calling Ollama:', err);
    return res.status(500).json({ response: 'Error: Unable to reach AI model.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});