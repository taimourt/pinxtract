/**
 * PinXtract - Robust Pinterest Scraper & Stream Extractor
 * Extracts Videos (MP4), Images (Originals/HD), GIFs, Carousels, and Metadata
 */

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return null;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Fetch HEAD of a media URL to verify availability and retrieve file size
 */
async function getMediaInfo(url, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return { available: false, size: null, bytes: 0 };
    const contentLength = res.headers.get('content-length');
    const bytes = contentLength ? parseInt(contentLength, 10) : 0;
    return {
      available: true,
      bytes,
      size: formatBytes(bytes),
      contentType: res.headers.get('content-type')
    };
  } catch (err) {
    return { available: false, size: null, bytes: 0 };
  }
}

/**
 * Clean and normalize a Pinterest URL
 */
function normalizePinterestUrl(input) {
  if (!input || typeof input !== 'string') return '';
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Extract pin ID from any Pinterest URL
 */
function extractPinId(url) {
  try {
    const parsed = new URL(url);
    const pinMatch = parsed.pathname.match(/\/pin\/(?:[^/]*--)?(\d+)/i);
    if (pinMatch) return pinMatch[1];
    const ideasMatch = parsed.pathname.match(/\/ideas\/[^/]+\/(\d+)/i);
    if (ideasMatch) return ideasMatch[1];
    const answersMatch = parsed.pathname.match(/\/answers\/[^/]+\/(\d+)/i);
    if (answersMatch) return answersMatch[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert Pinterest HLS stream URL to direct MP4 URL
 */
function convertHlsToMp4(hlsUrl) {
  if (!hlsUrl || typeof hlsUrl !== 'string') return [];
  const list = [];
  const clean = hlsUrl.replace(/\\/g, '');

  if (clean.includes('/mc/hls/')) {
    const p720 = clean.replace('/mc/hls/', '/mc/720p/').replace(/\/[^/]+\.m3u8.*$/, '.mp4');
    list.push(p720);
    list.push(p720.replace('/720p/', '/1080p/'));
    list.push(p720.replace('/720p/', '/480p/'));
  } else if (clean.includes('/v2/hls/')) {
    const p720 = clean.replace('/v2/hls/', '/v2/720p/').replace(/\/[^/]+\.m3u8.*$/, '.mp4');
    list.push(p720);
  } else if (clean.includes('/hls/')) {
    const p720 = clean.replace('/hls/', '/720p/').replace(/\/[^/]+\.m3u8.*$/, '.mp4');
    list.push(p720);
  }
  return list;
}

/**
 * Recursively search any object for video URLs
 */
function findVideosInObject(obj, found = new Set()) {
  if (!obj) return found;
  if (typeof obj === 'string') {
    const clean = obj.replace(/\\/g, '');
    if ((clean.includes('.mp4') || clean.includes('.m3u8')) && clean.includes('pinimg.com')) {
      if (clean.includes('.m3u8')) {
        convertHlsToMp4(clean).forEach(u => found.add(u));
      } else if (clean.includes('.mp4')) {
        found.add(clean);
      }
    }
    return found;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) findVideosInObject(item, found);
    return found;
  }
  if (typeof obj === 'object') {
    if (obj.video_list) {
      for (const val of Object.values(obj.video_list)) {
        if (val && typeof val.url === 'string') {
          const u = val.url.replace(/\\/g, '');
          if (u.includes('.m3u8')) {
            convertHlsToMp4(u).forEach(converted => found.add(converted));
          } else if (u.includes('.mp4')) {
            found.add(u);
          }
        }
      }
    }
    for (const key of Object.keys(obj)) {
      findVideosInObject(obj[key], found);
    }
  }
  return found;
}

/**
 * Main scraper function
 */
async function extractPinterestMedia(rawUrl) {
  const url = normalizePinterestUrl(rawUrl);
  if (!url) {
    throw new Error('Please provide a valid Pinterest URL.');
  }

  // Fetch page with redirection
  const fetchRes = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    redirect: 'follow'
  });

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch Pinterest page (HTTP ${fetchRes.status})`);
  }

  const finalUrl = fetchRes.url;
  const html = await fetchRes.text();
  const pinId = extractPinId(finalUrl) || extractPinId(url) || 'media';

  // Containers for extracted data
  let title = '';
  let description = '';
  let author = { name: 'Pinterest Creator', url: '', username: '' };
  let stats = { saves: 0, comments: 0 };
  let duration = '';
  let dimensions = { width: 0, height: 0 };
  let thumbnailUrl = '';
  const discoveredVideoUrls = new Set();
  const galleryItems = [];

  // 1. Check Video Snippet (JSON-LD)
  const videoSnippetMatch = html.match(/<script data-test-id="video-snippet"[^>]*>([\s\S]*?)<\/script>/i);
  let videoSnippet = null;
  if (videoSnippetMatch) {
    try {
      videoSnippet = JSON.parse(videoSnippetMatch[1]);
    } catch {}
  }

  // 2. Check Leaf Snippet (JSON-LD)
  const leafSnippetMatch = html.match(/<script data-test-id="leaf-snippet"[^>]*>([\s\S]*?)<\/script>/i);
  let leafSnippet = null;
  if (leafSnippetMatch) {
    try {
      leafSnippet = JSON.parse(leafSnippetMatch[1]);
    } catch {}
  }

  // 3. Check all application/ld+json tags
  const ldJsonTags = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of ldJsonTags) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed['@type'] === 'VideoObject' && !videoSnippet) {
        videoSnippet = parsed;
      }
      if (parsed['@type'] === 'SocialMediaPosting' && !leafSnippet) {
        leafSnippet = parsed;
      }
      findVideosInObject(parsed, discoveredVideoUrls);
    } catch {}
  }

  // Fill Metadata from Leaf Snippet
  if (leafSnippet) {
    title = leafSnippet.headline || leafSnippet.name || title;
    description = leafSnippet.articleBody || leafSnippet.description || description;
    if (leafSnippet.author) {
      author.name = leafSnippet.author.name || leafSnippet.author.alternateName || author.name;
      author.username = leafSnippet.author.alternateName || '';
      author.url = leafSnippet.author.url || '';
    }
    if (Array.isArray(leafSnippet.interactionStatistic)) {
      for (const stat of leafSnippet.interactionStatistic) {
        if (stat.name === 'LikeAction' || stat.description === 'Saves') {
          stats.saves = stat.userInteractionCount || stats.saves;
        }
      }
    }
    if (leafSnippet.image) {
      thumbnailUrl = leafSnippet.image;
    }
  }

  // Fill Metadata from Video Snippet
  if (videoSnippet) {
    title = videoSnippet.name || title;
    description = videoSnippet.description || description;
    thumbnailUrl = videoSnippet.thumbnailUrl || thumbnailUrl;
    duration = videoSnippet.duration || duration;
    stats.comments = videoSnippet.commentCount || stats.comments;

    if (videoSnippet.width) {
      dimensions.width = parseInt(videoSnippet.width, 10) || dimensions.width;
    }
    if (videoSnippet.height) {
      dimensions.height = parseInt(videoSnippet.height, 10) || dimensions.height;
    }

    if (videoSnippet.contentUrl) {
      discoveredVideoUrls.add(videoSnippet.contentUrl.replace(/\\/g, ''));
      // Speculate 1080p and 480p variants
      if (videoSnippet.contentUrl.includes('/720p/')) {
        discoveredVideoUrls.add(videoSnippet.contentUrl.replace('/720p/', '/1080p/'));
        discoveredVideoUrls.add(videoSnippet.contentUrl.replace('/720p/', '/480p/'));
      }
    }
  }

  // 4. Check Meta Tags for Videos
  const metaVideoMatches = html.matchAll(/<meta property="(?:og:video|og:video:url|og:video:secure_url)"[^>]*content="([^"]*)"/gi);
  for (const m of metaVideoMatches) {
    if (m[1]) {
      const u = m[1].replace(/\\/g, '');
      if (u.includes('.m3u8')) {
        convertHlsToMp4(u).forEach(cv => discoveredVideoUrls.add(cv));
      } else if (u.includes('.mp4')) {
        discoveredVideoUrls.add(u);
      }
    }
  }

  // 5. Check Relay completed requests (window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__)
  const relayMatches = html.matchAll(/window\.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__\("([^"]+)"\)/g);
  for (const match of relayMatches) {
    try {
      const decoded = decodeURIComponent(match[1]);
      const json = JSON.parse(decoded);
      findVideosInObject(json, discoveredVideoUrls);

      // Look for original images in relay
      const str = JSON.stringify(json.response || {});
      const imgMatches = str.matchAll(/https?:\/\/i\.pinimg\.com\/originals\/[^"'\s\\]+?\.(?:jpg|jpeg|png|webp|gif)/gi);
      for (const m of imgMatches) {
        const cleanImg = m[0].replace(/\\/g, '');
        if (!galleryItems.includes(cleanImg)) galleryItems.push(cleanImg);
      }
    } catch {}
  }

  // 6. Check __PWS_DATA__ and __PWS_INITIAL_PROPS__
  const pwsMatches = html.matchAll(/<script id="__PWS_(?:DATA|INITIAL_PROPS)__"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of pwsMatches) {
    try {
      const json = JSON.parse(m[1]);
      findVideosInObject(json, discoveredVideoUrls);
    } catch {}
  }

  // 7. Regex search across entire HTML for any remaining v.pinimg.com video URLs
  const rawMp4Matches = html.matchAll(/https?:\/\/(?:v1|v|v2)\.pinimg\.com\/videos\/[^"'\s\\<>]+\.mp4/gi);
  for (const m of rawMp4Matches) {
    discoveredVideoUrls.add(m[0].replace(/\\/g, ''));
  }

  const rawHlsMatches = html.matchAll(/https?:\/\/(?:v1|v|v2)\.pinimg\.com\/videos\/[^"'\s\\<>]+\.m3u8/gi);
  for (const m of rawHlsMatches) {
    convertHlsToMp4(m[0]).forEach(u => discoveredVideoUrls.add(u));
  }

  // Fallback title / description if empty
  if (!title) {
    const metaTitle = html.match(/<meta property="og:title"[^>]*content="([^"]*)"/i)
                   || html.match(/<title>([^<]*)<\/title>/i);
    if (metaTitle && metaTitle[1]) {
      title = metaTitle[1].replace(/\|\s*Pinterest.*/i, '').trim();
    } else {
      title = `Pinterest Media - ${pinId}`;
    }
  }

  if (!description) {
    const metaDesc = html.match(/<meta property="og:description"[^>]*content="([^"]*)"/i)
                  || html.match(/<meta name="description"[^>]*content="([^"]*)"/i);
    if (metaDesc && metaDesc[1]) {
      description = metaDesc[1].trim();
    }
  }

  // Check for high-resolution original image
  let originalImage = leafSnippet?.image || '';
  if (!originalImage) {
    const origMatch = html.match(/https?:\/\/i\.pinimg\.com\/originals\/[^"'\s\\]+?\.(?:jpg|jpeg|png|webp|gif)/i);
    if (origMatch) originalImage = origMatch[0].replace(/\\/g, '');
  }
  if (!originalImage) {
    const resizedMatch = html.match(/https?:\/\/i\.pinimg\.com\/(?:736x|474x|236x|564x)\/([^"'\s\\]+?\.(?:jpg|jpeg|png|webp|gif))/i);
    if (resizedMatch) {
      originalImage = `https://i.pinimg.com/originals/${resizedMatch[1].replace(/\\/g, '')}`;
    }
  }

  if (originalImage && !thumbnailUrl) {
    thumbnailUrl = originalImage;
  }
  if (originalImage && !galleryItems.includes(originalImage)) {
    galleryItems.unshift(originalImage);
  }

  // Check if media is a GIF
  const isGif = originalImage && originalImage.toLowerCase().endsWith('.gif');

  // Verify Video Streams
  const verifiedVideos = [];
  if (discoveredVideoUrls.size > 0) {
    const videoChecks = Array.from(discoveredVideoUrls).map(async (vUrl) => {
      const info = await getMediaInfo(vUrl, 2500);
      if (info.available) {
        let quality = '720p HD';
        let priority = 2;

        if (vUrl.includes('1080p')) {
          quality = '1080p Full HD';
          priority = 1;
        } else if (vUrl.includes('720p')) {
          quality = '720p HD';
          priority = 2;
        } else if (vUrl.includes('480p')) {
          quality = '480p SD';
          priority = 3;
        } else if (vUrl.includes('hevcMp4')) {
          quality = 'Mobile Optimized MP4';
          priority = 4;
        } else {
          quality = 'Standard MP4';
          priority = 5;
        }

        return {
          id: `video-${quality.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          type: 'video',
          quality,
          format: 'MP4',
          url: vUrl,
          size: info.size,
          bytes: info.bytes,
          priority,
          downloadUrl: `/api/download?url=${encodeURIComponent(vUrl)}&filename=${encodeURIComponent(`pinxtract-${pinId}-${quality.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mp4`)}&type=video`
        };
      }
      return null;
    });

    const checkResults = await Promise.all(videoChecks);
    for (const r of checkResults) {
      if (r && !verifiedVideos.some(v => v.url === r.url)) {
        verifiedVideos.push(r);
      }
    }

    // Sort: 1080p first, then 720p, etc.
    verifiedVideos.sort((a, b) => a.priority - b.priority);
  }

  // Determine media type
  const isVideo = verifiedVideos.length > 0;
  const primaryType = isVideo ? 'video' : isGif ? 'gif' : 'image';

  // Build Media List & Poster List
  let mediaList = [];
  const posters = [];

  if (isVideo) {
    // Media list has ONLY video files!
    verifiedVideos[0].isPrimary = true;
    mediaList = verifiedVideos;

    // Separate thumbnail poster
    if (thumbnailUrl) {
      const thumbInfo = await getMediaInfo(thumbnailUrl, 1500);
      posters.push({
        id: 'video-poster',
        type: 'poster',
        quality: 'Video Poster / Cover',
        format: 'JPG',
        url: thumbnailUrl,
        size: thumbInfo.size,
        downloadUrl: `/api/download?url=${encodeURIComponent(thumbnailUrl)}&filename=${encodeURIComponent(`pinxtract-${pinId}-poster.jpg`)}`
      });
    }
  } else {
    // Pin is Image or GIF
    const ext = isGif ? 'GIF' : (originalImage.split('.').pop() || 'JPG').toUpperCase();
    const origInfo = await getMediaInfo(originalImage, 2500);

    mediaList.push({
      id: 'img-original',
      type: isGif ? 'gif' : 'image',
      quality: isGif ? 'Original Animated GIF' : 'Original Ultra HD (Source)',
      format: ext,
      url: originalImage,
      size: origInfo.size,
      bytes: origInfo.bytes,
      isPrimary: true,
      downloadUrl: `/api/download?url=${encodeURIComponent(originalImage)}&filename=${encodeURIComponent(`pinxtract-${pinId}-original.${ext.toLowerCase()}`)}&type=${isGif ? 'gif' : 'image'}`
    });

    if (!isGif) {
      const pathPart = originalImage.replace(/https?:\/\/i\.pinimg\.com\/originals\//i, '');
      if (pathPart && !pathPart.startsWith('http')) {
        const u736 = `https://i.pinimg.com/736x/${pathPart}`;
        const u474 = `https://i.pinimg.com/474x/${pathPart}`;

        const [info736, info474] = await Promise.all([
          getMediaInfo(u736, 1500),
          getMediaInfo(u474, 1500)
        ]);

        if (info736.available) {
          mediaList.push({
            id: 'img-large',
            type: 'image',
            quality: 'Large (736px)',
            format: ext,
            url: u736,
            size: info736.size,
            downloadUrl: `/api/download?url=${encodeURIComponent(u736)}&filename=${encodeURIComponent(`pinxtract-${pinId}-736px.${ext.toLowerCase()}`)}`
          });
        }

        if (info474.available) {
          mediaList.push({
            id: 'img-medium',
            type: 'image',
            quality: 'Medium (474px)',
            format: ext,
            url: u474,
            size: info474.size,
            downloadUrl: `/api/download?url=${encodeURIComponent(u474)}&filename=${encodeURIComponent(`pinxtract-${pinId}-474px.${ext.toLowerCase()}`)}`
          });
        }
      }
    }
  }

  if (mediaList.length === 0) {
    throw new Error('No downloadable media could be found for this Pinterest link. Please make sure the pin is public.');
  }

  const primaryMedia = mediaList.find(m => m.isPrimary) || mediaList[0];

  return {
    success: true,
    pinId,
    originalUrl: url,
    canonicalUrl: finalUrl,
    type: primaryType,
    title,
    description,
    author,
    stats,
    duration,
    dimensions,
    thumbnail: thumbnailUrl,
    primaryMedia,
    media: mediaList,
    posters,
    gallery: galleryItems.slice(0, 10).map((gUrl, idx) => ({
      index: idx + 1,
      url: gUrl,
      downloadUrl: `/api/download?url=${encodeURIComponent(gUrl)}&filename=${encodeURIComponent(`pinxtract-${pinId}-slide-${idx+1}.jpg`)}`
    }))
  };
}

module.exports = {
  extractPinterestMedia,
  normalizePinterestUrl,
  extractPinId,
  getMediaInfo
};
