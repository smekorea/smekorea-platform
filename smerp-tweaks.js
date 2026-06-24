/* ================================================================
   SMERP Tweaks — 전역 테마/폰트/화면꾸미기 설정 패널
   smerp-tweaks.js  v2.0  2026-06-25
   모든 HTML 하단에 <script src="smerp-tweaks.js"></script> 추가
   ================================================================ */

(function () {

  /* ── 1. 기본값 ── */
  const DEFAULTS = {
    theme:    'light',
    darkL:    22,
    lightL:   98,
    accent:   '22',
    layout:   'cockpit',
    fontKo:   'Noto Sans KR',
    fontEn:   'Inter',
    fontMono: 'JetBrains Mono',
    // 화면 꾸미기
    hdrH:     112,
    hdrBg:    '#2c2420',
    sideBg:   '#352c28',
    sideW:    240,
    logoSize: 52,
    menuSize: 13,
    tblHdSize:12,
    rowH:     14,
    mainBg:   '#ffffff',
    tblHdBg:  '#ece8e2',
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

  /* ── 5. CSS 변수 주입 ── */
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
        --live: oklch(0.80 0.14 160); --warn: oklch(0.78 0.14 70);
        --danger: oklch(0.70 0.19 25); --info: oklch(0.75 0.10 230);
        color-scheme: dark;
      }
      html[data-theme="light"] {
        --bg-0: oklch(var(--light-L,0.985) 0.003 60);
        --bg-1: oklch(calc(var(--light-L,0.985) - 0.02) 0.005 40);
        --bg-2: oklch(calc(var(--light-L,0.985) - 0.05) 0.008 30);
        --line: oklch(calc(var(--light-L,0.985) - 0.10) 0.010 30);
        --line-strong: oklch(calc(var(--light-L,0.985) - 0.22) 0.012 30);
        --fg-0: oklch(0.22 0.015 25); --fg-1: oklch(0.42 0.015 25);
        --fg-2: oklch(0.58 0.014 25);
        --accent: oklch(0.54 var(--accent-C,0.20) var(--accent-hue,22));
        --accent-strong: oklch(0.48 0.22 var(--accent-hue,22));
        --accent-soft: oklch(0.54 var(--accent-C,0.20) var(--accent-hue,22) / 0.12);
        --live: oklch(0.55 0.14 160); --warn: oklch(0.68 0.15 70);
        --danger: oklch(0.54 0.20 25); --info: oklch(0.55 0.12 230);
        color-scheme: light;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── 6. 화면 꾸미기 CSS 적용 ── */
  function applyUICustom() {
    let s = document.getElementById('smerp-ui-custom');
    if (!s) { s = document.createElement('style'); s.id = 'smerp-ui-custom'; document.head.appendChild(s); }
    const rowPad = state.rowH;
    s.textContent = `
      .topbar { height: ${state.hdrH}px !important; background: ${state.hdrBg} !important; }
      .tb-logo { width: ${state.sideW}px !important; background: ${state.hdrBg} !important; }
      .tb-logo-text { font-size: ${state.logoSize}px !important; }
      .sidebar { width: ${state.sideW}px !important; background: ${state.sideBg} !important;
                 top: ${state.hdrH}px !important; height: calc(100vh - ${state.hdrH}px) !important; }
      .sb-name { font-size: ${state.menuSize}px !important; }
      .main { background: ${state.mainBg} !important; }
      .menu-tbl thead th { font-size: ${state.tblHdSize}px !important; background: ${state.tblHdBg} !important; }
      .menu-tbl td { padding: ${rowPad}px 20px !important; }
      .app-body { min-height: calc(100vh - ${state.hdrH}px) !important; }
    `;
  }

  /* ── 7. 전체 상태 적용 ── */
  function applyState() {
    const html = document.documentElement;
    html.dataset.theme = state.theme;
    html.style.setProperty('--dark-L',  (state.darkL  / 100).toFixed(3));
    html.style.setProperty('--light-L', (state.lightL / 100).toFixed(3));
    if (String(state.accent) === '0') {
      html.style.setProperty('--accent-hue', '0');
      html.style.setProperty('--accent-C',   '0.005');
      html.style.setProperty('--accent-L',   '0.55');
    } else {
      html.style.setProperty('--accent-hue', state.accent);
      html.style.setProperty('--accent-C',   '0.19');
      html.style.setProperty('--accent-L',   '0.62');
    }
    html.dataset.layout = state.layout;
    [state.fontKo, state.fontEn, state.fontMono].forEach(loadFont);
    html.style.setProperty('--font-ko',   `'${state.fontKo}', sans-serif`);
    html.style.setProperty('--font-en',   `'${state.fontEn}', sans-serif`);
    html.style.setProperty('--font-mono', `'${state.fontMono}', monospace`);
    document.body.style.fontFamily = `var(--font-en), var(--font-ko), system-ui, sans-serif`;
    document.querySelectorAll('.mono, .nums').forEach(el => {
      el.style.fontFamily = `var(--font-mono)`;
    });
    applyUICustom();
    syncPanelUI();
    try { localStorage.setItem('smerp_tweaks', JSON.stringify(state)); } catch(e) {}
  }

  /* ── 8. 패널 HTML ── */
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

    const slider = (id, label, min, max, step, val, unit) =>
      `<div class="stk-row">
        <span class="stk-row-lbl">${label}</span>
        <div class="stk-slider-row">
          <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">
          <span class="stk-val" id="${id}-val">${val}${unit}</span>
        </div>
      </div>`;

    const colorPick = (id, label, val) =>
      `<div class="stk-row">
        <span class="stk-row-lbl">${label}</span>
        <div class="stk-color-row">
          <input type="color" id="${id}" value="${val}" class="stk-color">
          <span class="stk-val" id="${id}-val">${val}</span>
        </div>
      </div>`;

    return `
    <div id="stk-tweaks-overlay"></div>
    <div id="stk-tweaks-panel">
      <div class="stk-header">
        <span class="stk-title">⚙ 화면 설정</span>
        <button class="stk-close" id="stk-close-btn">✕</button>
      </div>

      <!-- 탭 -->
      <div class="stk-tabs">
        <button class="stk-tab on" data-tab="ui">🎨 화면 꾸미기</button>
        <button class="stk-tab" data-tab="theme">🌙 테마·폰트</button>
      </div>

      <!-- 화면 꾸미기 탭 -->
      <div class="stk-tab-content" id="stk-tab-ui">

        <div class="stk-group-title">── 상단 바 ──</div>
        ${colorPick('stk-hdrBg', '배경색', state.hdrBg)}
        ${slider('stk-hdrH', '높이', 56, 160, 4, state.hdrH, 'px')}
        ${slider('stk-logoSize', '로고 크기', 24, 72, 2, state.logoSize, 'px')}

        <div class="stk-group-title">── 왼쪽 메뉴 ──</div>
        ${colorPick('stk-sideBg', '배경색', state.sideBg)}
        ${slider('stk-sideW', '메뉴 폭', 160, 320, 8, state.sideW, 'px')}
        ${slider('stk-menuSize', '글자 크기', 10, 18, 1, state.menuSize, 'px')}

        <div class="stk-group-title">── 목록 화면 ──</div>
        ${colorPick('stk-mainBg', '배경색', state.mainBg)}
        ${colorPick('stk-tblHdBg', '표 머리글 색', state.tblHdBg)}
        ${slider('stk-tblHdSize', '머리글 글자', 10, 16, 1, state.tblHdSize, 'px')}
        ${slider('stk-rowH', '행 높이', 6, 28, 2, state.rowH, 'px')}

        <div class="stk-section">
          <button class="stk-reset-btn" id="stk-reset-ui-btn">↩ 화면 기본값으로</button>
        </div>
      </div>

      <!-- 테마·폰트 탭 -->
      <div class="stk-tab-content" id="stk-tab-theme" style="display:none">

        <div class="stk-section">
          <div class="stk-label">밝기 모드</div>
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
          <div class="stk-label">강조색</div>
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
          <button class="stk-reset-btn" id="stk-reset-btn">↩ 전체 기본값으로</button>
        </div>
      </div>

    </div>
`;
  }

  /* ── 9. 패널 스타일 ── */
  function injectPanelStyle() {
    if (document.getElementById('stk-style')) return;
    const s = document.createElement('style');
    s.id = 'stk-style';
    s.textContent = `
#stk-tweaks-overlay {
        display: none; position: fixed; inset: 0; z-index: 9997;
      }
      #stk-tweaks-overlay.open { display: block; }

      #stk-tweaks-panel {
        display: none; position: fixed; bottom: 76px; right: 24px; z-index: 9999;
        width: 300px; border-radius: 14px;
        background: #fff;
        border: 1px solid #ddd;
        box-shadow: 0 20px 50px -10px rgba(0,0,0,0.25);
        font-family: 'Noto Sans KR', sans-serif;
        font-size: 13px; color: #1a1612;
        overflow: hidden; max-height: 80vh; overflow-y: auto;
      }
      #stk-tweaks-panel.open { display: block; animation: stk-slide-up 0.18s ease; }

      @keyframes stk-slide-up {
        from { opacity:0; transform: translateY(10px); }
        to   { opacity:1; transform: translateY(0); }
      }

      .stk-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px 12px;
        border-bottom: 1px solid #eee;
        position: sticky; top: 0; background: #fff; z-index: 1;
      }
      .stk-title { font-size: 13px; font-weight: 700; color: #1a1612; }
      .stk-close {
        background: none; border: none; cursor: pointer;
        color: #aaa; font-size: 14px; line-height: 1;
        padding: 2px 6px; border-radius: 4px;
      }
      .stk-close:hover { background: #f0f0f0; color: #333; }

      /* 탭 */
      .stk-tabs {
        display: flex; border-bottom: 2px solid #eee;
        background: #fafafa;
      }
      .stk-tab {
        flex: 1; padding: 10px 4px; border: none; background: none;
        font-size: 11px; font-weight: 500; color: #999;
        cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
        border-bottom: 2px solid transparent; margin-bottom: -2px;
        transition: all .15s;
      }
      .stk-tab.on { color: #c8001e; border-bottom-color: #c8001e; font-weight: 700; background: #fff; }
      .stk-tab:hover:not(.on) { color: #555; background: #f0ede8; }

      .stk-tab-content { padding: 4px 0 8px; }

      /* 그룹 타이틀 */
      .stk-group-title {
        font-size: 10px; font-weight: 700; color: #b0a090;
        letter-spacing: 1px; padding: 10px 16px 4px;
        font-family: 'Share Tech Mono', monospace;
      }

      /* 행 레이아웃 */
      .stk-row {
        display: flex; align-items: center;
        padding: 7px 16px; gap: 8px;
        border-bottom: 1px solid #f5f2ee;
      }
      .stk-row-lbl {
        font-size: 12px; color: #5a5048; white-space: nowrap;
        width: 90px; flex-shrink: 0;
      }

      .stk-section {
        padding: 10px 16px;
        border-bottom: 1px solid #eee;
      }
      .stk-section:last-child { border-bottom: none; }

      .stk-label {
        font-size: 10px; font-weight: 600; letter-spacing: 0.13em;
        text-transform: uppercase; color: #999;
        margin-bottom: 7px;
      }

      .stk-seg {
        display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
        background: #f5f2ee; border: 1px solid #ddd; border-radius: 6px;
        padding: 2px; gap: 2px;
      }
      .stk-seg button {
        border: none; background: transparent; cursor: pointer;
        padding: 6px 0; font-size: 12px; border-radius: 4px;
        color: #555; font-family: inherit; transition: background 0.12s;
      }
      .stk-seg button.on { background: #c8001e; color: #fff; font-weight: 600; }

      /* 슬라이더 */
      .stk-slider-row { display: flex; align-items: center; gap: 8px; flex: 1; }
      .stk-slider-row input[type="range"] {
        flex: 1; -webkit-appearance: none; appearance: none;
        height: 4px; border-radius: 3px;
        background: #e8e4de; border: none; outline: none;
      }
      .stk-slider-row input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
        background: #c8001e; border: 2px solid #fff; cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,.2);
      }
      .stk-val {
        font-family: 'Share Tech Mono', monospace; font-size: 10px;
        color: #999; width: 44px; text-align: right; flex-shrink: 0;
      }

      /* 컬러 피커 */
      .stk-color-row { display: flex; align-items: center; gap: 8px; flex: 1; }
      .stk-color {
        width: 32px; height: 28px; border: 1px solid #ddd; border-radius: 6px;
        padding: 2px; cursor: pointer; background: none; flex-shrink: 0;
      }

      /* 강조색 스와치 */
      .stk-swatches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
      .stk-swatch {
        aspect-ratio: 1; border-radius: 6px; cursor: pointer;
        border: 2px solid transparent; position: relative; transition: transform 0.1s;
      }
      .stk-swatch:hover { transform: scale(1.1); }
      .stk-swatch.on { border-color: #1a1612; }
      .stk-swatch.on::after {
        content: "✓"; position: absolute; inset: 0;
        display: grid; place-items: center;
        color: #fff; font-size: 13px; font-weight: 700;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }

      .stk-sel {
        width: 100%; padding: 6px 8px; border-radius: 6px;
        border: 1px solid #ddd; background: #f5f2ee; color: #1a1612;
        font-size: 12px; font-family: inherit; cursor: pointer; outline: none;
      }
      .stk-sel:focus { border-color: #c8001e; }

      .stk-reset-btn {
        width: 100%; padding: 8px; border-radius: 6px;
        border: 1px solid #ddd; background: transparent; color: #999;
        font-size: 11px; font-family: inherit; cursor: pointer;
        transition: background 0.12s, color 0.12s;
      }
      .stk-reset-btn:hover { background: #c8001e; color: #fff; border-color: transparent; }
    `;
    document.head.appendChild(s);
  }

  /* ── 10. 패널 UI 동기화 ── */
  function syncPanelUI() {
    const panel = document.getElementById('stk-tweaks-panel');
    if (!panel) return;

    // theme seg
    panel.querySelectorAll('#stk-theme button').forEach(b =>
      b.classList.toggle('on', b.dataset.v === state.theme));

    const darkRow  = document.getElementById('stk-dark-bright');
    const lightRow = document.getElementById('stk-light-bright');
    if (darkRow)  darkRow.style.display  = state.theme === 'dark'  ? '' : 'none';
    if (lightRow) lightRow.style.display = state.theme === 'light' ? '' : 'none';

    const dIn = document.getElementById('stk-darkL');
    const lIn = document.getElementById('stk-lightL');
    if (dIn) { dIn.value = state.darkL;  document.getElementById('stk-darkL-val').textContent  = (state.darkL/100).toFixed(2); }
    if (lIn) { lIn.value = state.lightL; document.getElementById('stk-lightL-val').textContent = (state.lightL/100).toFixed(2); }

    panel.querySelectorAll('.stk-swatch').forEach(s =>
      s.classList.toggle('on', String(s.dataset.hue) === String(state.accent)));

    ['fontKo','fontEn','fontMono'].forEach(k => {
      const el = document.getElementById(`stk-${k}`);
      if (el) el.value = state[k];
    });

    // 화면 꾸미기 슬라이더 동기화
    const uiFields = [
      {id:'stk-hdrH',      key:'hdrH',      unit:'px'},
      {id:'stk-logoSize',  key:'logoSize',  unit:'px'},
      {id:'stk-sideW',     key:'sideW',     unit:'px'},
      {id:'stk-menuSize',  key:'menuSize',  unit:'px'},
      {id:'stk-tblHdSize', key:'tblHdSize', unit:'px'},
      {id:'stk-rowH',      key:'rowH',      unit:'px'},
    ];
    uiFields.forEach(({id, key, unit}) => {
      const el = document.getElementById(id);
      const val = document.getElementById(id+'-val');
      if (el) el.value = state[key];
      if (val) val.textContent = state[key] + unit;
    });

    const colorFields = [
      {id:'stk-hdrBg',   key:'hdrBg'},
      {id:'stk-sideBg',  key:'sideBg'},
      {id:'stk-mainBg',  key:'mainBg'},
      {id:'stk-tblHdBg', key:'tblHdBg'},
    ];
    colorFields.forEach(({id, key}) => {
      const el = document.getElementById(id);
      const val = document.getElementById(id+'-val');
      if (el) el.value = state[key];
      if (val) val.textContent = state[key];
    });
  }

  /* ── 11. 이벤트 바인딩 ── */
  function bindEvents() {
    const panel   = document.getElementById('stk-tweaks-panel');
    const overlay = document.getElementById('stk-tweaks-overlay');

    function closePanel() {
      panel.classList.remove('open');
      overlay.classList.remove('open');
    }

    overlay.addEventListener('click', closePanel);
    document.getElementById('stk-close-btn').addEventListener('click', closePanel);

    // 탭 전환
    document.querySelectorAll('.stk-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stk-tab').forEach(t => t.classList.remove('on'));
        document.querySelectorAll('.stk-tab-content').forEach(c => c.style.display = 'none');
        tab.classList.add('on');
        document.getElementById('stk-tab-' + tab.dataset.tab).style.display = '';
      });
    });

    // theme
    document.querySelectorAll('#stk-theme button').forEach(b => {
      b.addEventListener('click', () => { state.theme = b.dataset.v; applyState(); });
    });

    document.getElementById('stk-darkL').addEventListener('input', e => {
      state.darkL = +e.target.value; applyState();
    });
    document.getElementById('stk-lightL').addEventListener('input', e => {
      state.lightL = +e.target.value; applyState();
    });

    document.querySelectorAll('.stk-swatch').forEach(s => {
      s.addEventListener('click', () => { state.accent = s.dataset.hue; applyState(); });
    });

    ['fontKo','fontEn','fontMono'].forEach(k => {
      document.getElementById(`stk-${k}`).addEventListener('change', e => {
        state[k] = e.target.value; applyState();
      });
    });

    // 화면 꾸미기 슬라이더
    const uiSliders = [
      {id:'stk-hdrH',      key:'hdrH',      unit:'px'},
      {id:'stk-logoSize',  key:'logoSize',  unit:'px'},
      {id:'stk-sideW',     key:'sideW',     unit:'px'},
      {id:'stk-menuSize',  key:'menuSize',  unit:'px'},
      {id:'stk-tblHdSize', key:'tblHdSize', unit:'px'},
      {id:'stk-rowH',      key:'rowH',      unit:'px'},
    ];
    uiSliders.forEach(({id, key, unit}) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', e => {
        state[key] = +e.target.value;
        const val = document.getElementById(id+'-val');
        if (val) val.textContent = state[key] + unit;
        applyState();
      });
    });

    // 컬러 피커
    const colorPickers = [
      {id:'stk-hdrBg',   key:'hdrBg'},
      {id:'stk-sideBg',  key:'sideBg'},
      {id:'stk-mainBg',  key:'mainBg'},
      {id:'stk-tblHdBg', key:'tblHdBg'},
    ];
    colorPickers.forEach(({id, key}) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', e => {
        state[key] = e.target.value;
        const val = document.getElementById(id+'-val');
        if (val) val.textContent = state[key];
        applyState();
      });
    });

    // 초기화
    document.getElementById('stk-reset-ui-btn').addEventListener('click', () => {
      if (!confirm('화면 꾸미기를 기본값으로 초기화할까요?')) return;
      ['hdrH','hdrBg','sideBg','sideW','logoSize','menuSize','tblHdSize','rowH','mainBg','tblHdBg']
        .forEach(k => { state[k] = DEFAULTS[k]; });
      applyState();
    });

    document.getElementById('stk-reset-btn').addEventListener('click', () => {
      if (!confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) return;
      state = { ...DEFAULTS };
      applyState();
    });
  }

  /* ── 12. 초기화 ── */
  function init() {
    ensureTokens();
    injectPanelStyle();
    [state.fontKo, state.fontEn, state.fontMono].forEach(loadFont);
    const wrap = document.createElement('div');
    wrap.innerHTML = buildPanel();
    document.body.appendChild(wrap);
    bindEvents();
    applyState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
