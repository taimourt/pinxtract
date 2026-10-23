/**
 * PinXtract - Client Application Logic
 * Interactive UI, Real-time resolver, Custom Player Controls, History, QR Codes
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const downloadForm = document.getElementById('downloadForm');
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  // Progress Bar Elements
  const progressWrap = document.getElementById('progressWrap');
  const progressStatus = document.getElementById('progressStatus');
  const progressPercent = document.getElementById('progressPercent');
  const progressBar = document.getElementById('progressBar');

  // Notice & Results Elements
  const errorNotice = document.getElementById('errorNotice');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const resultsSection = document.getElementById('resultsSection');

  // Media preview elements
  const resVideo = document.getElementById('resVideo');
  const resImage = document.getElementById('resImage');
  const videoExtraControls = document.getElementById('videoExtraControls');
  const loopToggleBtn = document.getElementById('loopToggleBtn');
  const videoSpeedSelect = document.getElementById('videoSpeedSelect');
  const pipBtn = document.getElementById('pipBtn');

  // Metadata elements
  const resMediaTypeText = document.getElementById('resMediaTypeText');
  const resMediaTypeBadge = document.getElementById('resMediaTypeBadge');
  const resTitle = document.getElementById('resTitle');
  const resDesc = document.getElementById('resDesc');
  const resCreatorName = document.getElementById('resCreatorName');
  const resCreatorAvatar = document.getElementById('resCreatorAvatar');
  const resCreatorBadge = document.getElementById('resCreatorBadge');
  const statSaves = document.getElementById('statSaves');
  const statComments = document.getElementById('statComments');
  const statDuration = document.getElementById('statDuration');
  const statQuality = document.getElementById('statQuality');
  const resOptionsList = document.getElementById('resOptionsList');
  const openPinBtn = document.getElementById('openPinBtn');
  const copyDirectLinkBtn = document.getElementById('copyDirectLinkBtn');
  const downloadAnotherBtn = document.getElementById('downloadAnotherBtn');
  const qrCodeBtn = document.getElementById('qrCodeBtn');

  // Gallery
  const resGallerySection = document.getElementById('resGallerySection');
  const resGalleryGrid = document.getElementById('resGalleryGrid');

  // History Drawer
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyDrawerBackdrop = document.getElementById('historyDrawerBackdrop');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historyCount = document.getElementById('historyCount');

  // QR Modal
  const qrModalBackdrop = document.getElementById('qrModalBackdrop');
  const closeQrModal = document.getElementById('closeQrModal');
  const qrCodeImage = document.getElementById('qrCodeImage');

  // Theme & Banner
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const topBanner = document.getElementById('topBanner');
  const closeBannerBtn = document.getElementById('closeBannerBtn');

  // Navigation & Platform Tabs
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  const modePills = document.querySelectorAll('.mode-pill');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .footer-link');
  const platformTabs = document.querySelectorAll('.platform-tab');
  const stepsMobile = document.getElementById('stepsMobile');
  const stepsDesktop = document.getElementById('stepsDesktop');

  // Dynamic Headings
  const dynamicHeading = document.getElementById('dynamicHeading');
  const dynamicSubtitle = document.getElementById('dynamicSubtitle');
  const heroChipText = document.getElementById('heroChipText');

  // FAQ
  const faqQuestions = document.querySelectorAll('.faq-question');
  const faqSearchInput = document.getElementById('faqSearchInput');

  // State
  let currentResult = null;
  let isResolving = false;
  let progressInterval = null;

  // =========================================================================
  // Theme Management
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('pinxtract_theme') || localStorage.getItem('pindown_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('pinxtract_theme', newTheme);
    showToast(`Switched to ${newTheme} theme`);
  });

  initTheme();

  // =========================================================================
  // Language Switcher (i18n)
  // =========================================================================
  const langDropdownWrapper = document.getElementById('langDropdownWrapper');
  const langDropdownBtn = document.getElementById('langDropdownBtn');

  if (langDropdownBtn && langDropdownWrapper) {
    langDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdownWrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!langDropdownWrapper.contains(e.target)) {
        langDropdownWrapper.classList.remove('open');
      }
    });
  }

  // Language selection handling: saves preference & navigates
  document.querySelectorAll('.lang-menu-item, .mobile-lang-chip, .footer-lang-picker a').forEach(el => {
    el.addEventListener('click', () => {
      const targetLang = el.getAttribute('data-lang');
      if (targetLang) {
        localStorage.setItem('pinxtract_lang', targetLang);
      }
    });
  });

  // i18n Translation Helper
  const i18nData = window.__TRANSLATION__ || {};
  function t(keyPath, fallback = '') {
    if (!keyPath) return fallback;
    const parts = keyPath.split('.');
    let cur = i18nData;
    for (const part of parts) {
      if (cur === undefined || cur === null) return fallback;
      cur = cur[part];
    }
    return cur !== undefined ? cur : fallback;
  }

  // Banner Dismissal
  if (closeBannerBtn && topBanner) {
    closeBannerBtn.addEventListener('click', () => {
      topBanner.style.display = 'none';
    });
  }

  // Mobile Menu
  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNavDrawer.classList.toggle('open');
    });
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // =========================================================================
  // Input Handling (Paste, Clear, Typing)
  // =========================================================================
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
    }
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    urlInput.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API not supported in this browser');
      }
      const text = await navigator.clipboard.readText();
      const trimmed = (text || '').trim();
      if (!trimmed) {
        showToast('Clipboard is empty!', 'error');
        return;
      }

      if (/pin\.it|pinterest\./i.test(trimmed)) {
        urlInput.value = trimmed;
        clearBtn.style.display = 'flex';
        showToast('Pinterest link pasted!', 'success');
        triggerResolve(trimmed);
      } else {
        urlInput.value = trimmed;
        clearBtn.style.display = 'flex';
        showToast('Pasted link from clipboard', 'info');
      }
    } catch (err) {
      showToast('Please press Cmd+V / Ctrl+V to paste', 'info');
    }
  });

  // Example Chips
  document.querySelectorAll('.example-chip, .btn-copy-format').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = btn.getAttribute('data-url') || btn.getAttribute('data-copy');
      if (targetUrl) {
        urlInput.value = targetUrl;
        clearBtn.style.display = 'flex';
        urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        triggerResolve(targetUrl);
      }
    });
  });

  // Mode Pills & Nav Category Switcher
  const categoryHeaders = {
    all: {
      title: 'Pinterest <span class="gradient-text">Media Downloader</span>',
      sub: 'Download Pinterest videos, high-resolution original images, GIFs, and story carousels directly to your phone or computer in 1 click.',
      chip: '100% Free • No Watermark • Ultra HD 1080p Supported'
    },
    video: {
      title: 'Pinterest <span class="gradient-text">Video Downloader</span>',
      sub: 'Convert Pinterest videos to MP4 in 1080p & 720p HD with crystal clear audio. No watermarks and ultra-fast DL2 streaming servers.',
      chip: '🎬 MP4 Format • 1080p/720p HD • With AAC Audio'
    },
    image: {
      title: 'Pinterest <span class="gradient-text">Image Downloader</span>',
      sub: 'Extract original source 4K and 2K resolution photos, wallpapers, and aesthetic posters from Pinterest pins.',
      chip: '🖼️ Original Source 4K/2K • High-Res JPG & PNG'
    },
    gif: {
      title: 'Pinterest <span class="gradient-text">GIF Downloader</span>',
      sub: 'Save animated Pinterest GIFs in both original loop GIF format and lightweight MP4 video.',
      chip: '✨ Animated GIFs • High Frame Rate • Direct Save'
    },
    carousel: {
      title: 'Pinterest <span class="gradient-text">Story & Carousel Saver</span>',
      sub: 'Download multi-step tutorial slides, idea pins, and collections from public Pinterest boards.',
      chip: '📚 Multi-Slide Carousels • Batch Slide Downloads'
    }
  };

  function setCategory(type) {
    modePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-type') === type));
    navLinks.forEach(l => {
      if (l.getAttribute('data-filter')) {
        l.classList.toggle('active', l.getAttribute('data-filter') === type);
      }
    });

    const info = categoryHeaders[type] || categoryHeaders.all;
    dynamicHeading.innerHTML = info.title;
    dynamicSubtitle.innerHTML = info.sub;
    heroChipText.textContent = info.chip;
  }

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const type = pill.getAttribute('data-type');
      setCategory(type);
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const filter = link.getAttribute('data-filter');
      if (filter) {
        setCategory(filter);
        if (mobileNavDrawer) mobileNavDrawer.classList.remove('open');
      }
    });
  });

  // Platform Tabs (How To)
  platformTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      platformTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const platform = tab.getAttribute('data-platform');
      if (platform === 'mobile') {
        stepsMobile.style.display = 'grid';
        stepsDesktop.style.display = 'none';
      } else {
        stepsMobile.style.display = 'none';
        stepsDesktop.style.display = 'grid';
      }
    });
  });

  // FAQ Search & Accordion
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isActive = item.classList.contains('active');
      // Collapse others
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', () => {
      const q = faqSearchInput.value.toLowerCase().trim();
      document.querySelectorAll('.faq-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'block' : 'none';
      });
    });
  }

  // =========================================================================
  // Progress Simulation & Execution
  // =========================================================================
  function startProgress() {
    progressWrap.style.display = 'block';
    errorNotice.style.display = 'none';
    progressBar.style.width = '15%';
    progressPercent.textContent = '15%';
    progressStatus.textContent = t('progress.p1', '1. Validating Pinterest Link...');

    let percent = 15;
    progressInterval = setInterval(() => {
      if (percent < 40) {
        percent += 8;
        progressStatus.textContent = t('progress.p2', '2. Resolving Media Streams from CDN...');
      } else if (percent < 75) {
        percent += 5;
        progressStatus.textContent = t('progress.p3', '3. Parsing HD Resolutions & Posters...');
      } else if (percent < 90) {
        percent += 2;
        progressStatus.textContent = t('progress.p4', '4. Ready to Download!');
      }
      progressBar.style.width = `${percent}%`;
      progressPercent.textContent = `${percent}%`;
    }, 200);
  }

  function finishProgress() {
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStatus.textContent = 'Ready!';
    setTimeout(() => {
      progressWrap.style.display = 'none';
      progressBar.style.width = '0%';
    }, 350);
  }

  function resetProgress() {
    clearInterval(progressInterval);
    progressWrap.style.display = 'none';
    progressBar.style.width = '0%';
  }

  function showError(msg) {
    resetProgress();
    errorNotice.style.display = 'flex';
    errorMessage.textContent = msg || 'Could not fetch Pinterest media. Please ensure the pin is public.';
    errorNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(msg, 'error');
  }

  // Form Submission
  downloadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Please enter a Pinterest URL', 'error');
      return;
    }
    triggerResolve(url);
  });

  async function triggerResolve(url) {
    if (isResolving) return;
    isResolving = true;
    submitBtn.disabled = true;
    startProgress();

    try {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to download pin');
      }

      finishProgress();
      currentResult = data;
      renderResult(data);
      saveToHistory(data);
      showToast('Media extracted successfully!', 'success');
    } catch (err) {
      showError(err.message);
    } finally {
      isResolving = false;
      submitBtn.disabled = false;
    }
  }

  // =========================================================================
  // Render Result Card
  // =========================================================================
  function renderResult(data) {
    resultsSection.style.display = 'block';

    const isVideo = data.type === 'video';
    const isGif = data.type === 'gif';

    // Type text & badge
    const typeLabel = isVideo ? '🎬 VIDEO FOUND (MP4)'
                    : isGif ? '✨ ANIMATED GIF'
                    : '🖼️ ORIGINAL IMAGE (HD)';
    resMediaTypeText.textContent = typeLabel;

    // Title & Description
    resTitle.textContent = data.title || 'Pinterest Media';
    resDesc.textContent = data.description || 'No description provided by author.';

    // Creator info
    if (data.author && data.author.name) {
      resCreatorName.textContent = data.author.name;
      resCreatorAvatar.textContent = (data.author.name[0] || 'P').toUpperCase();
      if (data.author.url) {
        resCreatorName.href = data.author.url;
      }
    } else {
      resCreatorName.textContent = 'Pinterest Creator';
      resCreatorAvatar.textContent = 'P';
    }

    // Stats
    statSaves.textContent = data.stats?.saves ? `❤️ ${formatCount(data.stats.saves)} Saves` : '❤️ Popular Pin';
    statComments.textContent = data.stats?.comments ? `💬 ${data.stats.comments} Comments` : '💬 Active Pin';
    statDuration.textContent = data.duration ? `⏱️ ${formatDuration(data.duration)}` : isVideo ? '⏱️ HD MP4' : '🖼️ Source File';
    statQuality.textContent = isVideo ? 'MP4 Video' : isGif ? 'Loop GIF' : 'Ultra HD';

    // Video / Image Preview Player
    if (isVideo) {
      resVideo.style.display = 'block';
      resImage.style.display = 'none';
      videoExtraControls.style.display = 'flex';

      // Set video source
      resVideo.src = data.primaryMedia?.url || '';
      resVideo.poster = data.thumbnail || '';
      resVideo.load();
    } else {
      resVideo.style.display = 'none';
      resImage.style.display = 'block';
      videoExtraControls.style.display = 'none';
      resVideo.pause();

      resImage.src = data.primaryMedia?.url || data.thumbnail || '';
    }

    // Populate Download Resolution Options
    resOptionsList.innerHTML = '';

    // Group 1: Primary Media Streams (For videos, this contains ONLY MP4 videos!)
    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = 'font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;';
    sectionTitle.textContent = isVideo 
      ? t('results.video_downloads', '🎬 Video Downloads (MP4)') 
      : isGif 
      ? t('results.gif_downloads', '✨ GIF Downloads') 
      : t('results.image_resolutions', '🖼️ Image Resolutions');
    resOptionsList.appendChild(sectionTitle);

    data.media.forEach((item, index) => {
      const isPrimary = item.isPrimary || index === 0;
      const optionBtn = document.createElement('a');
      optionBtn.className = `btn-option-download ${isPrimary ? 'primary' : ''}`;
      optionBtn.href = item.downloadUrl;
      const safeFilename = `pinxtract-${data.pinId}-${item.id}.${item.format.toLowerCase()}`;
      optionBtn.setAttribute('download', safeFilename);
      
      const sizeText = item.size ? item.size : '';
      const icon = item.type === 'video' ? '🎬' : item.type === 'gif' ? '✨' : '🖼️';
      const saveActionText = item.type === 'video' 
        ? t('results.save_mp4', 'Save MP4') 
        : t('results.save_jpg', 'Save Image');
      
      optionBtn.innerHTML = `
        <div class="option-left">
          <span style="font-size: 1.15rem;">${icon}</span>
          <div>
            <div class="option-quality">${item.quality}</div>
            <span class="option-format-tag">${item.format} • Direct Download</span>
          </div>
        </div>
        <div class="option-right">
          ${sizeText ? `<span class="option-size-tag">${sizeText}</span>` : ''}
          <span style="background: rgba(255,255,255,0.15); padding: 0.35rem 0.75rem; border-radius: 6px;">${saveActionText}</span>
        </div>
      `;

      optionBtn.addEventListener('click', (e) => {
        showToast(`${t('results.starting_dl', 'Starting download...')} (${item.quality})`, 'success');
      });

      resOptionsList.appendChild(optionBtn);
    });

    // Group 2: If Video, provide clearly separated Thumbnail Poster
    if (isVideo && data.posters && data.posters.length > 0) {
      const posterHeader = document.createElement('div');
      posterHeader.style.cssText = 'font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1.25rem; margin-bottom: 0.5rem; border-top: 1px solid var(--bg-card-border); padding-top: 0.85rem;';
      posterHeader.textContent = t('results.cover_photo', '📸 Video Cover / Thumbnail (Image Only)');
      resOptionsList.appendChild(posterHeader);

      data.posters.forEach(poster => {
        const posterBtn = document.createElement('a');
        posterBtn.className = 'btn-option-download';
        posterBtn.href = poster.downloadUrl;
        posterBtn.setAttribute('download', `pinxtract-${data.pinId}-cover.jpg`);
        posterBtn.innerHTML = `
          <div class="option-left">
            <span style="font-size: 1.15rem;">📸</span>
            <div>
              <div class="option-quality">Download Cover Thumbnail</div>
              <span class="option-format-tag">JPG Image</span>
            </div>
          </div>
          <div class="option-right">
            ${poster.size ? `<span class="option-size-tag">${poster.size}</span>` : ''}
            <span>${t('results.save_jpg', 'Save JPG')}</span>
          </div>
        `;
        posterBtn.addEventListener('click', () => {
          showToast('Downloading video thumbnail image...', 'info');
        });
        resOptionsList.appendChild(posterBtn);
      });
    }

    // Gallery / Multi-slide collections
    if (data.gallery && data.gallery.length > 1) {
      resGallerySection.style.display = 'block';
      resGalleryGrid.innerHTML = '';
      data.gallery.forEach(slide => {
        const itemEl = document.createElement('div');
        itemEl.className = 'gallery-item';
        itemEl.innerHTML = `
          <img src="${slide.url}" alt="Slide ${slide.index}" loading="lazy" />
          <a href="${slide.downloadUrl}" class="gallery-item-download" download>
            Slide #${slide.index}
          </a>
        `;
        resGalleryGrid.appendChild(itemEl);
      });
    } else {
      resGallerySection.style.display = 'none';
    }

    // Scroll to results smoothly
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // Video Tools (Speed, Loop, PiP)
  if (videoSpeedSelect) {
    videoSpeedSelect.addEventListener('change', () => {
      resVideo.playbackRate = parseFloat(videoSpeedSelect.value);
    });
  }

  if (loopToggleBtn) {
    loopToggleBtn.addEventListener('click', () => {
      resVideo.loop = !resVideo.loop;
      loopToggleBtn.classList.toggle('active', resVideo.loop);
      showToast(resVideo.loop ? 'Video looping enabled' : 'Video looping disabled');
    });
  }

  if (pipBtn) {
    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (resVideo.requestPictureInPicture) {
          await resVideo.requestPictureInPicture();
        }
      } catch (e) {
        showToast('PiP not supported', 'info');
      }
    });
  }

  // Direct actions
  if (copyDirectLinkBtn) {
    copyDirectLinkBtn.addEventListener('click', () => {
      if (!currentResult || !currentResult.primaryMedia) return;
      const targetUrl = currentResult.primaryMedia.url;
      navigator.clipboard.writeText(targetUrl).then(() => {
        showToast('Direct media URL copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed copying link', 'error');
      });
    });
  }

  if (downloadAnotherBtn) {
    downloadAnotherBtn.addEventListener('click', () => {
      urlInput.value = '';
      clearBtn.style.display = 'none';
      urlInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (openPinBtn) {
    openPinBtn.addEventListener('click', () => {
      if (currentResult && currentResult.canonicalUrl) {
        window.open(currentResult.canonicalUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // QR Code Modal for Phone Downloading
  if (qrCodeBtn) {
    qrCodeBtn.addEventListener('click', () => {
      if (!currentResult) return;
      const targetUrl = currentResult.primaryMedia?.url || currentResult.canonicalUrl;
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`;
      qrCodeImage.src = qrApi;
      qrModalBackdrop.style.display = 'flex';
    });
  }

  if (closeQrModal) {
    closeQrModal.addEventListener('click', () => {
      qrModalBackdrop.style.display = 'none';
    });
  }

  if (qrModalBackdrop) {
    qrModalBackdrop.addEventListener('click', (e) => {
      if (e.target === qrModalBackdrop) qrModalBackdrop.style.display = 'none';
    });
  }

  // =========================================================================
  // History Management
  // =========================================================================
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('pinxtract_history') || localStorage.getItem('pindown_history') || '[]');
    } catch {
      return [];
    }
  }

  function saveToHistory(data) {
    const list = getHistory();
    const existingIndex = list.findIndex(item => item.pinId === data.pinId);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
    }
    list.unshift({
      pinId: data.pinId,
      title: data.title,
      type: data.type,
      thumbnail: data.thumbnail,
      canonicalUrl: data.canonicalUrl,
      primaryMediaUrl: data.primaryMedia?.url,
      timestamp: Date.now()
    });

    const trimmed = list.slice(0, 20);
    localStorage.setItem('pinxtract_history', JSON.stringify(trimmed));
    updateHistoryUI();
  }

  function updateHistoryUI() {
    const list = getHistory();
    historyCount.textContent = list.length;

    if (list.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <p>${t('history.empty', 'No downloads yet in this browser.')}</p>
          <small>${t('history.empty_sub', 'Pins you download will appear here for fast re-access.')}</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = '';
    list.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      const timeAgo = formatTimeAgo(item.timestamp);
      itemEl.innerHTML = `
        <img class="history-thumb" src="${item.thumbnail || ''}" alt="thumb" />
        <div class="history-meta">
          <h4 class="history-title" title="${item.title}">${item.title}</h4>
          <span class="history-date">${item.type.toUpperCase()} • ${timeAgo}</span>
        </div>
        <button class="btn-history-load" data-url="${item.canonicalUrl}">Load</button>
      `;

      itemEl.querySelector('.btn-history-load').addEventListener('click', () => {
        historyDrawerBackdrop.classList.remove('open');
        urlInput.value = item.canonicalUrl;
        clearBtn.style.display = 'flex';
        triggerResolve(item.canonicalUrl);
      });

      historyList.appendChild(itemEl);
    });
  }

  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', () => {
      historyDrawerBackdrop.classList.add('open');
      updateHistoryUI();
    });
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      historyDrawerBackdrop.classList.remove('open');
    });
  }

  if (historyDrawerBackdrop) {
    historyDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === historyDrawerBackdrop) historyDrawerBackdrop.classList.remove('open');
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear your download history?')) {
        localStorage.removeItem('pinxtract_history');
        localStorage.removeItem('pindown_history');
        updateHistoryUI();
        showToast('History cleared', 'info');
      }
    });
  }

  updateHistoryUI();

  // =========================================================================
  // Formatting Utilities
  // =========================================================================
  function formatCount(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  function formatDuration(iso) {
    if (!iso) return '';
    const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return iso;
    const m = match[1] || '0';
    const s = match[2] || '0';
    return `${m > 0 ? m + 'm ' : ''}${s}s`;
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'recently';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
});
