const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', path: '/' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', path: '/fr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', path: '/es' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', path: '/de' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr', path: '/pt' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr', path: '/it' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', path: '/ru' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', path: '/tr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', path: '/ar' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr', path: '/ja' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr', path: '/ko' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr', path: '/zh' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', path: '/id' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', path: '/hi' }
];

const translationsCache = {};
const translationsDir = path.join(__dirname, 'translations');

// Preload all translation files
SUPPORTED_LANGUAGES.forEach(item => {
  const filePath = path.join(translationsDir, `${item.code}.json`);
  if (fs.existsSync(filePath)) {
    try {
      translationsCache[item.code] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`Failed to load translation for ${item.code}:`, err);
    }
  }
});

function getTranslation(lang) {
  return translationsCache[lang] || translationsCache['en'] || {};
}

function getNestedValue(obj, keyPath) {
  if (!obj || !keyPath) return undefined;
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function generateHreflangTags(currentLang, baseUrl = 'https://pinxtract.com') {
  const currentUrl = currentLang === 'en' ? `${baseUrl}/` : `${baseUrl}/${currentLang}`;
  
  let tags = `  <link rel="canonical" href="${currentUrl}">\n`;
  tags += `  <link rel="alternate" hreflang="x-default" href="${baseUrl}/">\n`;
  
  for (const item of SUPPORTED_LANGUAGES) {
    const href = item.code === 'en' ? `${baseUrl}/` : `${baseUrl}/${item.code}`;
    tags += `  <link rel="alternate" hreflang="${item.code}" href="${href}">\n`;
  }
  return tags;
}

function generateLanguageMenuHtml(currentLang) {
  return SUPPORTED_LANGUAGES.map(item => {
    const isActive = item.code === currentLang;
    const targetUrl = item.code === 'en' ? '/' : `/${item.code}`;
    return `
      <a href="${targetUrl}" class="lang-menu-item ${isActive ? 'active' : ''}" data-lang="${item.code}">
        <span class="lang-flag">${item.flag}</span>
        <span class="lang-name">${item.nativeName}</span>
        ${isActive ? '<span class="lang-check">✓</span>' : ''}
      </a>
    `;
  }).join('');
}

function generateMobileLangGridHtml(currentLang) {
  return SUPPORTED_LANGUAGES.map(item => {
    const isActive = item.code === currentLang;
    const targetUrl = item.code === 'en' ? '/' : `/${item.code}`;
    return `
      <a href="${targetUrl}" class="mobile-lang-chip ${isActive ? 'active' : ''}" data-lang="${item.code}">
        <span>${item.flag}</span>
        <span>${item.nativeName}</span>
      </a>
    `;
  }).join('');
}

function localizeHtml(rawHtml, langCode = 'en', baseUrl = 'https://pinxtract.com') {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode) ? langCode : 'en';
  const t = getTranslation(lang);
  const isRtl = t.dir === 'rtl';

  let html = rawHtml;

  // 1. Update <html lang="..." dir="...">
  html = html.replace(/<html\s+([^>]*?)lang="[^"]*"/i, `<html $1lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}"`);

  // 2. SEO Meta tags replacement
  if (t.meta) {
    // Title
    if (t.meta.title) {
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t.meta.title}</title>`);
      html = html.replace(/<meta\s+name="title"\s+content="[^"]*"/i, `<meta name="title" content="${t.meta.title}"`);
    }
    // Description
    if (t.meta.description) {
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${t.meta.description}"`);
    }
    // Keywords
    if (t.meta.keywords) {
      html = html.replace(/<meta\s+name="keywords"\s+content="[^"]*"/i, `<meta name="keywords" content="${t.meta.keywords}"`);
    }
    // OG Title & Desc
    if (t.meta.og_title) {
      html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"/i, `<meta property="og:title" content="${t.meta.og_title}"`);
      html = html.replace(/<meta\s+property="twitter:title"\s+content="[^"]*"/i, `<meta property="twitter:title" content="${t.meta.og_title}"`);
    }
    if (t.meta.og_description) {
      html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"/i, `<meta property="og:description" content="${t.meta.og_description}"`);
      html = html.replace(/<meta\s+property="twitter:description"\s+content="[^"]*"/i, `<meta property="twitter:description" content="${t.meta.og_description}"`);
    }
    // OG URL
    const canonicalUrl = lang === 'en' ? `${baseUrl}/` : `${baseUrl}/${lang}`;
    html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"/i, `<meta property="og:url" content="${canonicalUrl}"`);
  }

  // 3. Inject Canonical and Hreflang tags
  const hreflangTags = generateHreflangTags(lang, baseUrl);
  if (!html.includes('rel="alternate" hreflang=')) {
    html = html.replace('</head>', `${hreflangTags}\n</head>`);
  }

  // 4. Replace content with data-i18n attributes
  // Matches <tag ... data-i18n="some.key" ...>Original Text</tag>
  html = html.replace(/<([a-zA-Z0-9]+)\b([^>]*?)\bdata-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, before, key, after, currentContent) => {
    const val = getNestedValue(t, key);
    if (val !== undefined) {
      return `<${tag}${before}data-i18n="${key}"${after}>${val}</${tag}>`;
    }
    return match;
  });

  // 5. Replace placeholders with data-i18n-placeholder
  html = html.replace(/<([a-zA-Z0-9]+)\b([^>]*?)\bdata-i18n-placeholder="([^"]+)"([^>]*)>/gi, (match, tag, before, key, after) => {
    const val = getNestedValue(t, key);
    if (val !== undefined) {
      let combined = `${before} ${after}`;
      combined = combined.replace(/placeholder="[^"]*"/gi, '');
      return `<${tag} ${combined.trim()} placeholder="${val}" data-i18n-placeholder="${key}">`;
    }
    return match;
  });

  // 6. Update current language labels
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];
  html = html.replace(/id="currentLangLabel">[^<]*<\/span>/gi, `id="currentLangLabel">${currentLangObj.flag} ${currentLangObj.code.toUpperCase()}</span>`);
  html = html.replace(/id="langMenuList">[\s\S]*?<\/div>/i, `id="langMenuList">${generateLanguageMenuHtml(lang)}</div>`);
  html = html.replace(/id="mobileLangGrid">[\s\S]*?<\/div>/i, `id="mobileLangGrid">${generateMobileLangGridHtml(lang)}</div>`);

  // 7. Inject client-side hydration script before </body>
  const clientScript = `
  <script>
    window.__CURRENT_LANG__ = "${lang}";
    window.__LANG_DIR__ = "${isRtl ? 'rtl' : 'ltr'}";
    window.__SUPPORTED_LANGUAGES__ = ${JSON.stringify(SUPPORTED_LANGUAGES)};
    window.__TRANSLATION__ = ${JSON.stringify(t)};
  </script>
  `;
  html = html.replace('</body>', `${clientScript}\n</body>`);

  return html;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  getTranslation,
  getNestedValue,
  generateHreflangTags,
  generateLanguageMenuHtml,
  generateMobileLangGridHtml,
  localizeHtml
};
