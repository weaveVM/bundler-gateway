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

// Helper function to detect if content is text
function isTextContent(buffer) {
  // Check if the buffer contains valid UTF-8 text
  try {
    // Convert buffer to string and back to buffer
    const text = buffer.toString('utf8');
    const backToBuffer = Buffer.from(text, 'utf8');
    
    // If the buffers match and don't contain control characters (except newline and tab)
    return buffer.equals(backToBuffer) && 
           !buffer.some(byte => (byte < 32 && byte !== 9 && byte !== 10) || byte === 127);
  } catch {
    return false;
  }
}

// Helper function to get content type
function detectContentType(buffer) {
  // Check for common file signatures
  if (buffer.length >= 4) {
    // PDF signature
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }
    // JPEG signature
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    // PNG signature
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
  }

  // Check if it's text content
  if (isTextContent(buffer)) {
    return 'text/plain';
  }

  // Default to binary
  return 'application/octet-stream';
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
    
    // Get input
    const input = envelope.input;
    
    if (!input) {
      return res.status(400).json({ error: 'No input data found in envelope' });
    }

    // Get content type tag if it exists (case-insensitive)
    const contentTypeTag = envelope.tags?.find(tag => tag.name.toLowerCase() === 'content-type');

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
      'Content-Type': contentTypeTag?.value || detectContentType(processedData),
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
