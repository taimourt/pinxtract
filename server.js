const express = require('express');
const cors = require('cors');
const path = require('path');
const { extractPinterestMedia, normalizePinterestUrl } = require('./pinterestScraper');

const fs = require('fs');
const { SUPPORTED_LANGUAGES, localizeHtml } = require('./localization');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing and CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve translation JSON files statically
app.use('/translations', express.static(path.join(__dirname, 'translations')));

// Serve static assets without auto-serving index.html so localization routes can handle it
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const templateHtmlPath = path.join(__dirname, 'public/index.html');
function getTemplate() {
  try {
    return fs.readFileSync(templateHtmlPath, 'utf8');
  } catch (err) {
    console.error('Error reading template HTML:', err);
    return '';
  }
}

/**
 * Sitemap & Robots for Search Engine Indexing
 */
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://pinxtract.com';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  SUPPORTED_LANGUAGES.forEach(item => {
    const loc = item.code === 'en' ? `${baseUrl}/` : `${baseUrl}/${item.code}`;
    xml += '  <url>\n';
    xml += `    <loc>${loc}</loc>\n`;
    SUPPORTED_LANGUAGES.forEach(alt => {
      const altHref = alt.code === 'en' ? `${baseUrl}/` : `${baseUrl}/${alt.code}`;
      xml += `    <xhtml:link rel="alternate" hreflang="${alt.code}" href="${altHref}"/>\n`;
    });
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/"/>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += `    <priority>${item.code === 'en' ? '1.0' : '0.9'}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('User-agent: *\nAllow: /\n\nSitemap: https://pinxtract.com/sitemap.xml\n');
});

/**
 * Localized Page Routes (/fr, /es, /de, /ar, etc.)
 */
const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);

app.get('/:lang', (req, res, next) => {
  const lang = req.params.lang.toLowerCase();
  if (lang === 'en') {
    return res.redirect(301, '/');
  }
  if (supportedCodes.includes(lang)) {
    const localized = localizeHtml(getTemplate(), lang);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(localized);
  }
  next();
});

app.get('/', (req, res) => {
  const localized = localizeHtml(getTemplate(), 'en');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(localized);
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.5.0',
    service: 'PinXtract - Ultimate Pinterest Downloader',
    time: new Date().toISOString()
  });
});

/**
 * API: Resolve Pinterest URL
 * Accepts URL via query param or POST body
 */
app.all('/api/resolve', async (req, res) => {
  const url = (req.method === 'POST' ? req.body.url : req.query.url) || '';

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid Pinterest link (e.g. https://pin.it/... or https://pinterest.com/pin/...)'
    });
  }

  const cleanUrl = url.trim();

  // Validate format
  const isPinterest = /pin\.it|pinterest\.(com|co\.uk|de|fr|it|es|nl|se|ch|co\.in|br|au|at|cl|jp|ru|ie|ca|mx|nz|pt|ph)/i.test(cleanUrl);
  if (!isPinterest) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL. Only Pinterest links (pin.it or pinterest.com) are supported.'
    });
  }

  try {
    const result = await extractPinterestMedia(cleanUrl);
    res.json(result);
  } catch (err) {
    console.error('Resolve error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Unable to fetch Pinterest media. The pin might be private, deleted, or region-restricted.'
    });
  }
});

/**
 * API: Direct Stream Downloader
 * Proxies media with attachment headers so the browser directly downloads the file
 */
app.get('/api/download', async (req, res) => {
  const mediaUrl = req.query.url;
  let rawFilename = req.query.filename || 'pinxtract-media.mp4';

  if (!mediaUrl) {
    return res.status(400).send('Missing media URL parameter');
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!parsed.hostname.endsWith('pinimg.com') && !parsed.hostname.endsWith('pinterest.com')) {
      return res.status(403).send('Forbidden: Only Pinterest CDN media URLs can be proxied.');
    }

    const isVideo = mediaUrl.includes('/videos/') || mediaUrl.includes('.mp4') || req.query.type === 'video';
    const isGif = mediaUrl.endsWith('.gif') || req.query.type === 'gif';
    const isPng = mediaUrl.endsWith('.png') || req.query.type === 'png';

    // Ensure correct extension
    let filename = path.basename(rawFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (isVideo && !filename.toLowerCase().endsWith('.mp4')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.mp4';
    } else if (isGif && !filename.toLowerCase().endsWith('.gif')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.gif';
    } else if (isPng && !filename.toLowerCase().endsWith('.png')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.png';
    } else if (!isVideo && !isGif && !isPng && !filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.jpg';
    }

    const rangeHeader = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const mediaRes = await fetch(mediaUrl, {
      headers: fetchHeaders
    });

    if (!mediaRes.ok && mediaRes.status !== 206) {
      return res.status(mediaRes.status).send(`Failed to stream from CDN: ${mediaRes.statusText}`);
    }

    let contentType = isVideo ? 'video/mp4' 
                    : isGif ? 'image/gif' 
                    : isPng ? 'image/png' 
                    : 'image/jpeg';

    const contentLength = mediaRes.headers.get('content-length');
    const contentRange = mediaRes.headers.get('content-range');
    const acceptRanges = mediaRes.headers.get('accept-ranges') || 'bytes';

    res.status(mediaRes.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const { Readable } = require('stream');
    const readable = Readable.fromWeb(mediaRes.body);
    readable.pipe(res);

    req.on('close', () => {
      readable.destroy();
    });
  } catch (err) {
    console.error('Download stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Download failed: ' + err.message);
    }
  }
});

/**
 * API: Media preview proxy (avoids referrer blocking)
 */
app.get('/api/proxy-media', async (req, res) => {
  const mediaUrl = req.query.url;
  if (!mediaUrl) return res.status(400).send('Missing url');

  try {
    const parsed = new URL(mediaUrl);
    if (!parsed.hostname.endsWith('pinimg.com')) {
      return res.status(403).send('Only pinimg.com media allowed');
    }

    const mediaRes = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (!mediaRes.ok) return res.status(mediaRes.status).send('CDN fetch error');

    res.setHeader('Content-Type', mediaRes.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    const { Readable } = require('stream');
    Readable.fromWeb(mediaRes.body).pipe(res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`PinXtract server running at http://localhost:${PORT}`);
  console.log(`PinXtract HD resolution, proxy downloads, and modern UI`);
  console.log(`=========================================`);
});

server.on('error', (err) => {
  console.error('Fatal Server Error:', err);
});


