import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to process hex input
function processHexInput(input) {
  const hexString = input.startsWith('0x') ? input.slice(2) : input;
  return Buffer.from(hexString, 'hex');
}

// Main bundle route
app.get('/bundle/:txHash/:index', async (req, res) => {
  try {
    const { txHash, index } = req.params;
    
    // Validate index is a number
    const envelopeIndex = parseInt(index, 10);
    if (isNaN(envelopeIndex)) {
      return res.status(400).json({ error: 'Invalid index parameter' });
    }

    // Fetch bundle data
    const response = await fetch(`https://bundler.wvm.network/v1/envelopes/${txHash}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch bundle data: ${response.statusText}` 
      });
    }

    const data = await response.json();

    // Validate envelope exists at index
    if (!data.envelopes?.[envelopeIndex]) {
      return res.status(404).json({ 
        error: `No envelope found at index ${envelopeIndex}` 
      });
    }

    const envelope = data.envelopes[envelopeIndex];
    
    // Get input and content type
    const input = envelope.input;
    const contentTypeTag = envelope.tags?.find(tag => tag.name === 'content-type');
    
    if (!input) {
      return res.status(400).json({ error: 'No input data found in envelope' });
    }

    if (!contentTypeTag) {
      return res.status(400).json({ error: 'No content-type tag found in envelope' });
    }

    // Process the input data
    let processedData;
    try {
      processedData = processHexInput(input);
    } catch (error) {
      return res.status(400).json({ 
        error: `Failed to process input data: ${error.message}` 
      });
    }

    // Set response headers
    res.set({
      'Content-Type': contentTypeTag.value,
      'Content-Length': processedData.length,
      'Cache-Control': 'public, max-age=31536000'
    });

    // Send the processed data
    return res.send(processedData);

  } catch (error) {
    console.error('Error processing bundle request:', error);
    return res.status(500).json({ 
      error: 'Internal server error while processing bundle' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
