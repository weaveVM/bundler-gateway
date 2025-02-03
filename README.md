# Bundler Gateway

A gateway service that provides easy access to WVM Network bundles with automatic content-type detection and hex processing.

## Features

- Fetches bundle data from bundler.wvm.network
- Automatic content-type detection for common file types (PDF, JPEG, PNG, text)
- Hex input processing
- CORS enabled
- Vercel deployment ready

## Installation

```bash
npm install
```

## Local Development

Start the development server:

```bash
npm start
```

## API Usage

### Get Bundle Content

```
GET /bundle/:txHash/:index
```

#### Parameters

- `txHash`: The transaction hash of the bundle
- `index`: The index of the envelope within the bundle (zero-based)

#### Response

The response will include the processed content with the appropriate content-type header. The service automatically detects and sets the content type based on:

- Content-Type tag in the envelope (if present)
- File signatures (PDF, JPEG, PNG)
- Text content detection
- Defaults to `application/octet-stream` for unknown types

#### Example

```bash
curl http://localhost:3001/bundle/0xf4aa3cc6580d1ecbc93a9c015087718bee67290a6cf14587bbae7ef69e8e65fe/0
```

#### Response Headers

- `Content-Type`: Automatically detected content type
- `Content-Length`: Size of the content in bytes
- `Cache-Control`: public, max-age=31536000 (1 year)

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400`: Invalid parameters or input data
- `404`: Envelope not found
- `500`: Internal server error
- Status codes from bundler.wvm.network are passed through

## Deployment

### Vercel Deployment

This project is configured for deployment on Vercel. To deploy:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

The included `vercel.json` configuration handles all routing and build settings.
