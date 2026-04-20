/* ================================================================
   SMERP Tweaks — 전역 테마/폰트 설정 패널
   smerp-tweaks.js  v1.0  2026-04-21
   모든 HTML 하단에 <script src="smerp-tweaks.js"></script> 추가
   ================================================================ */

(function () {

  /* ── 1. 기본값 ── */
  const DEFAULTS = {
    theme:    'light',
    darkL:    22,
    lightL:   98,
    accent:   '22',        // LG Red
    layout:   'cockpit',
    fontKo:   'Noto Sans KR',
    fontEn:   'Inter',
    fontMono: 'JetBrains Mono',
  };

  /* ── 2. Google Fonts URL 맵 ── */
  const FONT_URLS = {
    'Noto Sans KR':   'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap',
    'Pretendard':     'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css',
    'Nanum Gothic':   'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap',
    'Inter':          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'DM Sans':        'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
    'Roboto':         'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
    'Fira Code':      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap',
    'Source Code Pro':'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap',
  };

  const ACCENT_SWATCHES = [
    { hue: '22',  label: 'LG Red',        color: 'oklch(0.62 0.19 22)'  },
    { hue: '250', label: 'Samsung Blue',  color: 'oklch(0.55 0.17 250)' },
    { hue: '145', label: 'Hyundai Green', color: 'oklch(0.58 0.14 145)' },
    { hue: '265', label: 'Kia Indigo',    color: 'oklch(0.45 0.18 265)' },
    { hue: '70',  label: 'Amber',         color: 'oklch(0.75 0.16 70)'  },
    { hue: '12',  label: 'Crimson',       color: 'oklch(0.55 0.20 12)'  },
    { hue: '35',  label: 'Coral',         color: 'oklch(0.68 0.17 35)'  },
    { hue: '165', label: 'Teal',          color: 'oklch(0.65 0.14 165)' },
    { hue: '295', label: 'Violet',        color: 'oklch(0.55 0.20 295)' },
    { hue: '0',   label: 'Mono',          color: 'oklch(0.45 0.005 0)'  },
  ];

  /* ── 3. 상태 로드 ── */
  let state = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem('smerp_tweaks') || '{}');
    state = { ...state, ...saved };
  } catch(e) {}

  /* ── 4. 폰트 로드 ── */
  const loadedFonts = new Set();
  function loadFont(name) {
    if (loadedFonts.has(name) || !FONT_URLS[name]) return;
    loadedFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URLS[name];
    document.head.appendChild(link);
  }

  /* ── 5. CSS 변수 주입 (html에 없으면 추가) ── */
  function ensureTokens() {
    if (document.getElementById('smerp-token-style')) return;
    const s = document.createElement('style');
    s.id = 'smerp-token-style';
    s.textContent = `
      html[data-theme="dark"] {
        --bg-0: oklch(calc(var(--dark-L,0.22) - 0.06) 0.010 25);
        --bg-1: oklch(calc(var(--dark-L,0.22) - 0.02) 0.012 25);
        --bg-2: oklch(calc(var(--dark-L,0.22) + 0.02) 0.014 25);
        --line: oklch(calc(var(--dark-L,0.22) + 0.10) 0.014 25);
        --line-strong: oklch(calc(var(--dark-L,0.22) + 0.20) 0.016 25);
        --fg-0: oklch(0.96 0.004 70);
        --fg-1: oklch(0.78 0.008 50);
        --fg-2: oklch(0.58 0.012 40);
        --accent: oklch(var(--accent-L,0.62) var(--accent-C,0.19) var(--accent-hue,22));
        --accent-strong: oklch(calc(var(--accent-L,0.62) - 0.06) var(--accent-C,0.19) var(--accent-hue,22));
        --accent-soft: oklch(var(--accent-L,0.62) var(--accent-C,0.19) var(--accent-hue,22) / 0.16);
        --live:   oklch(0.80 0.14 160);
        --warn:   oklch(0.78 0.14 70);
        --danger: oklch(0.70 0.19 25);
        --info:   oklch(0.75 0.10 230);
        color-scheme: dark;
      }
      html[data-theme="light"] {
        --bg-0: oklch(var(--light-L,0.985) 0.003 60);
        --bg-1: oklch(calc(var(--light-L,0.985) - 0.02) 0.005 40);
        --bg-2: oklch(calc(var(--light-L,0.985) - 0.05) 0.008 30);
        --line: oklch(calc(var(--light-L,0.985) - 0.10) 0.010 30);
        --line-strong: oklch(calc(var(--light-L,0.985) - 0.22) 0.012 30);
        --fg-0: oklch(0.22 0.015 25);
        --fg-1: oklch(0.42 0.015 25);
        --fg-2: oklch(0.58 0.014 25);
        --accent: oklch(0.54 var(--accent-C,0.20) var(--accent-hue,22));
        --accent-strong: oklch(0.48 0.22 var(--accent-hue,22));
        --accent-soft: oklch(0.54 var(--accent-C,0.20) var(--accent-hue,22) / 0.12);
        --live:   oklch(0.55 0.14 160);
        --warn:   oklch(0.68 0.15 70);
        --danger: oklch(0.54 0.20 25);
        --info:   oklch(0.55 0.12 230);
        color-scheme: light;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── 6. 상태 적용 ── */
  function applyState() {
    const html = document.documentElement;

    // theme
    html.dataset.theme = state.theme;

    // brightness
    html.style.setProperty('--dark-L',  (state.darkL  / 100).toFixed(3));
    html.style.setProperty('--light-L', (state.lightL / 100).toFixed(3));

    // accent
    if (String(state.accent) === '0') {
      html.style.setProperty('--accent-hue', '0');
      html.style.setProperty('--accent-C',   '0.005');
      html.style.setProperty('--accent-L',   '0.55');
    } else {
      html.style.setProperty('--accent-hue', state.accent);
      html.style.setProperty('--accent-C',   '0.19');
      html.style.setProperty('--accent-L',   '0.62');
    }

    // layout
    html.dataset.layout = state.layout;

    // fonts
    [state.fontKo, state.fontEn, state.fontMono].forEach(loadFont);
    html.style.setProperty('--font-ko',   `'${state.fontKo}', sans-serif`);
    html.style.setProperty('--font-en',   `'${state.fontEn}', sans-serif`);
    html.style.setProperty('--font-mono', `'${state.fontMono}', monospace`);

    // body font 적용
    document.body.style.fontFamily = `var(--font-en), var(--font-ko), system-ui, sans-serif`;

    // mono 클래스
    document.querySelectorAll('.mono, .nums').forEach(el => {
      el.style.fontFamily = `var(--font-mono)`;
    });

    // 패널 UI 동기화
    syncPanelUI();

    // 저장
    try { localStorage.setItem('smerp_tweaks', JSON.stringify(state)); } catch(e) {}
  }

  /* ── 7. 패널 HTML ── */
  function buildPanel() {
    const fontKoOptions   = ['Noto Sans KR', 'Pretendard', 'Nanum Gothic'];
    const fontEnOptions   = ['Inter', 'DM Sans', 'Roboto'];
    const fontMonoOptions = ['JetBrains Mono', 'Fira Code', 'Source Code Pro'];

    const swatchHTML = ACCENT_SWATCHES.map(s =>
      `<div class="stk-swatch" data-hue="${s.hue}" title="${s.label}"
        style="background:${s.color}"></div>`
    ).join('');

    const fontSel = (id, opts, val) =>
      `<select id="${id}" class="stk-sel">
        ${opts.map(o => `<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}
      </select>`;

    return `
    <div id="stk-tweaks-overlay"></div>
    <div id="stk-tweaks-panel">
      <div class="stk-header">
        <span class="stk-title">⚙ TWEAKS</span>
        <button class="stk-close" id="stk-close-btn">✕</button>
      </div>

      <div class="stk-section">
        <div class="stk-label">THEME</div>
        <div class="stk-seg" id="stk-theme">
          <button data-v="dark">Dark</button>
          <button data-v="light">Light</button>
        </div>
      </div>

      <div class="stk-section" id="stk-dark-bright" style="display:none">
        <div class="stk-label">다크 밝기</div>
        <div class="stk-slider-row">
          <input type="range" id="stk-darkL" min="10" max="32" step="1">
          <span class="stk-val" id="stk-darkL-val"></span>
        </div>
      </div>

      <div class="stk-section" id="stk-light-bright">
        <div class="stk-label">라이트 밝기</div>
        <div class="stk-slider-row">
          <input type="range" id="stk-lightL" min="92" max="100" step="1">
          <span class="stk-val" id="stk-lightL-val"></span>
        </div>
      </div>

      <div class="stk-section">
        <div class="stk-label">LAYOUT</div>
        <div class="stk-seg" id="stk-layout">
          <button data-v="cockpit">Cockpit</button>
          <button data-v="cards">Cards</button>
          <button data-v="dense">Dense</button>
        </div>
      </div>

      <div class="stk-section">
        <div class="stk-label">ACCENT</div>
        <div class="stk-swatches" id="stk-swatches">${swatchHTML}</div>
      </div>

      <div class="stk-section">
        <div class="stk-label">한글 폰트</div>
        ${fontSel('stk-fontKo', fontKoOptions, state.fontKo)}
      </div>

      <div class="stk-section">
        <div class="stk-label">영문 폰트</div>
        ${fontSel('stk-fontEn', fontEnOptions, state.fontEn)}
      </div>

      <div class="stk-section">
        <div class="stk-label">수치 폰트</div>
        ${fontSel('stk-fontMono', fontMonoOptions, state.fontMono)}
      </div>

      <div class="stk-section">
        <button class="stk-reset-btn" id="stk-reset-btn">기본값으로 초기화</button>
      </div>
    </div>

    <!-- 톱니바퀴 FAB -->
    <button id="stk-fab" title="테마 설정">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83
          2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1
          1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65
          0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65
          0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65
          1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1
          2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0
          1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65
          0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65
          0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65
          1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
    `;
  }

  /* ── 8. 패널 스타일 ── */
  function injectPanelStyle() {
    if (document.getElementById('stk-style')) return;
    const s = document.createElement('style');
    s.id = 'stk-style';
    s.textContent = `
      #stk-fab {
        position: fixed; bottom: 24px; right: 24px; z-index: 9998;
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--accent, #e0002b); color: #fff;
        border: none; cursor: pointer; display: grid; place-items: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #stk-fab:hover { transform: scale(1.08) rotate(30deg); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
      #stk-fab.open  { transform: rotate(90deg); }

      #stk-tweaks-overlay {
        display: none; position: fixed; inset: 0; z-index: 9998;
      }
      #stk-tweaks-overlay.open { display: block; }

      #stk-tweaks-panel {
        display: none; position: fixed; bottom: 76px; right: 24px; z-index: 9999;
        width: 270px; border-radius: 12px;
        background: var(--bg-1, #fff);
        border: 1px solid var(--line, #ddd);
        box-shadow: 0 20px 50px -10px rgba(0,0,0,0.3);
        font-family: var(--font-en, 'Inter'), var(--font-ko, 'Noto Sans KR'), sans-serif;
        font-size: 13px; color: var(--fg-0, #111);
        overflow: hidden;
      }
      #stk-tweaks-panel.open { display: block; animation: stk-slide-up 0.18s ease; }

      @keyframes stk-slide-up {
        from { opacity:0; transform: translateY(10px); }
        to   { opacity:1; transform: translateY(0); }
      }

      .stk-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px 10px;
        border-bottom: 1px solid var(--line, #ddd);
      }
      .stk-title {
        font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--fg-2, #888);
      }
      .stk-close {
        background: none; border: none; cursor: pointer;
        color: var(--fg-2, #888); font-size: 14px; line-height: 1;
        padding: 2px 4px; border-radius: 4px;
      }
      .stk-close:hover { background: var(--bg-2, #f0f0f0); color: var(--fg-0, #111); }

      .stk-section {
        padding: 10px 16px;
        border-bottom: 1px solid var(--line, #eee);
      }
      .stk-section:last-child { border-bottom: none; }

      .stk-label {
        font-size: 10px; font-weight: 600; letter-spacing: 0.13em;
        text-transform: uppercase; color: var(--fg-2, #999);
        margin-bottom: 7px;
        font-family: 'JetBrains Mono', monospace;
      }

      .stk-seg {
        display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
        background: var(--bg-0, #f5f5f5);
        border: 1px solid var(--line, #ddd); border-radius: 6px;
        padding: 2px; gap: 2px;
      }
      .stk-seg button {
        border: none; background: transparent; cursor: pointer;
        padding: 6px 0; font-size: 12px; border-radius: 4px;
        color: var(--fg-1, #555); font-family: inherit;
        transition: background 0.12s;
      }
      .stk-seg button.on {
        background: var(--accent, #e0002b); color: #fff; font-weight: 600;
      }

      .stk-slider-row {
        display: flex; align-items: center; gap: 10px;
      }
      .stk-slider-row input[type="range"] {
        flex: 1; -webkit-appearance: none; appearance: none;
        height: 4px; border-radius: 3px;
        background: var(--bg-0, #eee); border: 1px solid var(--line, #ddd);
        outline: none;
      }
      .stk-slider-row input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
        background: var(--accent, #e0002b); border: 2px solid var(--bg-1, #fff);
        cursor: pointer;
      }
      .stk-val {
        font-family: 'JetBrains Mono', monospace; font-size: 10px;
        color: var(--fg-2, #999); width: 36px; text-align: right;
      }

      .stk-swatches {
        display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
      }
      .stk-swatch {
        aspect-ratio: 1; border-radius: 6px; cursor: pointer;
        border: 2px solid transparent; position: relative;
        transition: transform 0.1s;
      }
      .stk-swatch:hover { transform: scale(1.1); }
      .stk-swatch.on { border-color: var(--fg-0, #111); }
      .stk-swatch.on::after {
        content: "✓"; position: absolute; inset: 0;
        display: grid; place-items: center;
        color: #fff; font-size: 13px; font-weight: 700;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }

      .stk-sel {
        width: 100%; padding: 6px 8px; border-radius: 6px;
        border: 1px solid var(--line, #ddd);
        background: var(--bg-0, #f5f5f5); color: var(--fg-0, #111);
        font-size: 12px; font-family: inherit; cursor: pointer;
        outline: none;
      }
      .stk-sel:focus { border-color: var(--accent, #e0002b); }

      .stk-reset-btn {
        width: 100%; padding: 7px; border-radius: 6px;
        border: 1px solid var(--line, #ddd);
        background: transparent; color: var(--fg-2, #999);
        font-size: 11px; font-family: inherit; cursor: pointer;
        letter-spacing: 0.04em;
        transition: background 0.12s, color 0.12s;
      }
      .stk-reset-btn:hover {
        background: var(--danger, #e0002b); color: #fff; border-color: transparent;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── 9. 패널 UI 동기화 ── */
  function syncPanelUI() {
    const panel = document.getElementById('stk-tweaks-panel');
    if (!panel) return;

    // theme seg
    panel.querySelectorAll('#stk-theme button').forEach(b =>
      b.classList.toggle('on', b.dataset.v === state.theme));

    // 밝기 슬라이더 표시 전환
    const darkRow  = document.getElementById('stk-dark-bright');
    const lightRow = document.getElementById('stk-light-bright');
    if (darkRow)  darkRow.style.display  = state.theme === 'dark'  ? '' : 'none';
    if (lightRow) lightRow.style.display = state.theme === 'light' ? '' : 'none';

    // 슬라이더 값
    const dIn = document.getElementById('stk-darkL');
    const lIn = document.getElementById('stk-lightL');
    if (dIn) { dIn.value = state.darkL;  document.getElementById('stk-darkL-val').textContent  = (state.darkL/100).toFixed(2); }
    if (lIn) { lIn.value = state.lightL; document.getElementById('stk-lightL-val').textContent = (state.lightL/100).toFixed(2); }

    // layout seg
    panel.querySelectorAll('#stk-layout button').forEach(b =>
      b.classList.toggle('on', b.dataset.v === state.layout));

    // accent swatches
    panel.querySelectorAll('.stk-swatch').forEach(s =>
      s.classList.toggle('on', String(s.dataset.hue) === String(state.accent)));

    // font selects
    ['fontKo','fontEn','fontMono'].forEach(k => {
      const el = document.getElementById(`stk-${k}`);
      if (el) el.value = state[k];
    });
  }

  /* ── 10. 이벤트 바인딩 ── */
  function bindEvents() {
    const fab    = document.getElementById('stk-fab');
    const panel  = document.getElementById('stk-tweaks-panel');
    const overlay= document.getElementById('stk-tweaks-overlay');

    // FAB 토글
    fab.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      overlay.classList.toggle('open', !isOpen);
      fab.classList.toggle('open', !isOpen);
    });

    // 오버레이 클릭 → 닫기
    overlay.addEventListener('click', closePanel);
    document.getElementById('stk-close-btn').addEventListener('click', closePanel);

    function closePanel() {
      panel.classList.remove('open');
      overlay.classList.remove('open');
      fab.classList.remove('open');
    }

    // theme
    document.querySelectorAll('#stk-theme button').forEach(b => {
      b.addEventListener('click', () => { state.theme = b.dataset.v; applyState(); });
    });

    // 밝기
    document.getElementById('stk-darkL').addEventListener('input', e => {
      state.darkL = +e.target.value; applyState();
    });
    document.getElementById('stk-lightL').addEventListener('input', e => {
      state.lightL = +e.target.value; applyState();
    });

    // layout
    document.querySelectorAll('#stk-layout button').forEach(b => {
      b.addEventListener('click', () => { state.layout = b.dataset.v; applyState(); });
    });

    // accent swatches
    document.querySelectorAll('.stk-swatch').forEach(s => {
      s.addEventListener('click', () => { state.accent = s.dataset.hue; applyState(); });
    });

    // fonts
    ['fontKo','fontEn','fontMono'].forEach(k => {
      document.getElementById(`stk-${k}`).addEventListener('change', e => {
        state[k] = e.target.value; applyState();
      });
    });

    // 초기화
    document.getElementById('stk-reset-btn').addEventListener('click', () => {
      if (!confirm('기본값으로 초기화하시겠습니까?')) return;
      state = { ...DEFAULTS };
      applyState();
    });
  }

  /* ── 11. 초기화 ── */
  function init() {
    ensureTokens();
    injectPanelStyle();

    // 폰트 미리 로드
    [state.fontKo, state.fontEn, state.fontMono].forEach(loadFont);

    // 패널 마운트
    const wrap = document.createElement('div');
    wrap.innerHTML = buildPanel();
    document.body.appendChild(wrap);

    // 이벤트
    bindEvents();

    // 초기 적용
    applyState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
