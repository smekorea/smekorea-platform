/* ================================================================
   SMERP Mobile — 휴대폰 화면 공통 보정
   smerp-mobile.js  v1.0  2026-10-08
   폭 768px 이하에서만 동작합니다. PC 화면에서는 아무 것도 하지 않습니다.
     1) 표 → 카드형 변환 (칸마다 머리글을 항목명으로 붙임)
     2) 12px 미만 글자 → 12px
   표별 예외:  <table data-mobile="scroll"> 가로 스크롤 유지
              <table data-mobile="off">    손대지 않음
   열 이름 바꾸기 <th data-m-label="이름">, 카드에서 열 빼기 <th data-m-hide>
   작은 글자 유지: <body data-m-keepfont=".lunar,.event-chip"> (선택자에 포함된 규칙 제외)
   ================================================================ */
(function () {
  'use strict';
  if (window.__smerpMobile) return;
  window.__smerpMobile = true;

  var MQ = window.matchMedia('(max-width:768px)');
  var MIN_FONT = 12;
  var LONG_TEXT = 20;
  /* 월·주·일자가 열로 나열된 집계표는 카드로 풀지 않는다 */
  var PERIOD = /^(\d{1,2}\s*월|\d{2,4}[-.\/년]\s*\d{1,2}월?|M[-+]?\d+|W\d+|\d{1,2}\s*주차?|\d{1,2}[\/.]\d{1,2}(\s*\(.\))?|\d{1,2}일)$/i;
  var WEEKDAY = /^(일|월|화|수|목|금|토|SUN|MON|TUE|WED|THU|FRI|SAT|日|一|二|三|四|五|六)$/i;

  function clean(el) {
    return (el.textContent || '').replace(/[↑↓▲▼⇅↕⬍]/g, '').replace(/\s+/g, ' ').trim();
  }

  /* ── 머리글(병합·2단 포함) → 열별 항목명 ── */
  function readHeader(table) {
    var thead = table.tHead;
    if (!thead || !thead.rows.length) return null;
    var grid = [], r, c, i, j, k;
    for (r = 0; r < thead.rows.length; r++) {
      grid[r] = grid[r] || [];
      var cells = thead.rows[r].cells;
      c = 0;
      for (k = 0; k < cells.length; k++) {
        while (grid[r][c]) c++;
        var rs = cells[k].rowSpan || 1, cs = cells[k].colSpan || 1;
        for (i = 0; i < rs; i++) {
          grid[r + i] = grid[r + i] || [];
          for (j = 0; j < cs; j++) grid[r + i][c + j] = cells[k];
        }
        c += cs;
      }
    }
    var n = 0;
    for (r = 0; r < grid.length; r++) n = Math.max(n, grid[r].length);
    var labels = [], hidden = [];
    for (c = 0; c < n; c++) {
      var parts = [], last = null;
      for (r = 0; r < grid.length; r++) {
        var cell = grid[r][c];
        if (!cell || cell === last) continue;
        last = cell;
        var s = cell.hasAttribute('data-m-label') ? cell.getAttribute('data-m-label') : clean(cell);
        if (s && parts[parts.length - 1] !== s) parts.push(s);
      }
      labels[c] = parts.join(' · ');
      hidden[c] = !!last && (last.hasAttribute('data-m-hide') || getComputedStyle(last).display === 'none');
    }
    return { labels: labels, hidden: hidden, sig: labels.join('|') + '#' + hidden.join('') };
  }

  function hasScrollParent(table) {
    var p = table.parentElement, depth = 0;
    while (p && p !== document.body && depth < 4) {
      var ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
      p = p.parentElement; depth++;
    }
    return false;
  }

  /* ── 표 1개의 처리 방식 결정: card / scroll / off ── */
  function decide(table, head) {
    var forced = table.getAttribute('data-mobile');
    if (forced === 'off' || forced === 'scroll' || forced === 'card') return forced;
    if (table.closest('[data-mobile="off"]')) return 'off';
    if (!head) return 'off';
    var named = head.labels.filter(function (s) { return s; });
    if (named.length < 2) return 'off';
    var period = 0, week = 0;
    named.forEach(function (s) {
      var tail = s.split(' · ').pop();
      if (PERIOD.test(tail)) period++;
      if (WEEKDAY.test(tail)) week++;
    });
    if (week >= 5 && week >= named.length - 1) return 'off';      /* 달력 */
    if (period >= 5) return 'scroll';                             /* 기간 집계표 */
    return 'card';
  }

  function isEmptyCell(cell) {
    if (clean(cell)) return false;
    return !cell.querySelector('input,select,textarea,button,img,svg,canvas,a,[class*="badge"],[class*="dot"],[class*="chip"]');
  }

  function labelRows(table, head) {
    var n = head.labels.length;
    var sections = [];
    var b;
    for (b = 0; b < table.tBodies.length; b++) sections.push(table.tBodies[b]);
    if (table.tFoot) sections.push(table.tFoot);
    sections.forEach(function (sec) {
      var carry = [];                       /* rowspan 으로 아래 행까지 차지하는 열 */
      var carryText = [];
      for (var r = 0; r < sec.rows.length; r++) {
        var tr = sec.rows[r];
        var cells = tr.cells;
        var stamp = head.sig + '~' + cells.length + '~' + tr.textContent.length;
        var skip = tr.__mStamp === stamp && !carry.some(function (v) { return v > 0; });
        var c = 0, shown = 0, ctx = [];
        for (var k = 0; k < cells.length; k++) {
          while (carry[c] > 0) { if (carryText[c] && ctx.length < 2 && ctx.indexOf(carryText[c]) < 0) ctx.push(carryText[c]); carry[c]--; c++; }
          var cell = cells[k];
          var cs = cell.colSpan || 1, rs = cell.rowSpan || 1;
          if (rs > 1) for (var j = 0; j < cs; j++) { carry[c + j] = (carry[c + j] || 0) + rs - 1; carryText[c + j] = j === 0 ? clean(cell).slice(0, 40) : ''; }
          if (!skip) {
            var full = cells.length === 1 || (cs > 1 && cs >= n - 1);
            var label = full ? '' : (head.labels[c] || '');
            if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
            var text = clean(cell);
            var ctl = !!cell.querySelector('input:not([type=checkbox]):not([type=radio]),select,textarea,table');
            cell.classList.toggle('m-full', full);
            cell.classList.toggle('m-long', !full && (ctl || text.length >= LONG_TEXT || cs > 1));
            cell.classList.toggle('m-hide', !full && cs === 1 && !!head.hidden[c]);
            cell.classList.toggle('m-empty', isEmptyCell(cell));
          }
          if (!cell.classList.contains('m-empty') && !cell.classList.contains('m-hide')) shown++;
          c += cs;
        }
        if (!skip) {
          tr.classList.toggle('m-solo', shown <= 1);
          tr.__mStamp = stamp;
        }
        /* 이 행에서 소비되지 않은 rowspan 잔여분 정리 */
        for (; c < carry.length; c++) if (carry[c] > 0) { if (carryText[c] && ctx.length < 2 && ctx.indexOf(carryText[c]) < 0) ctx.push(carryText[c]); carry[c]--; }
        var ctxText = ctx.join(' · ');
        if (ctxText) { if (tr.getAttribute('data-m-ctx') !== ctxText) tr.setAttribute('data-m-ctx', ctxText); }
        else if (tr.hasAttribute('data-m-ctx')) tr.removeAttribute('data-m-ctx');
      }
    });
  }

  function processTable(table) {
    if (table.closest('table') !== table && table.parentElement && table.parentElement.closest('table.m-card')) {
      /* 카드 안에 들어 있는 표는 가로 스크롤만 */
      table.classList.add('m-scroll'); table.classList.remove('m-card'); return;
    }
    var head = readHeader(table);
    var mode = decide(table, head);
    if (mode === 'card' && head) {
      table.classList.add('m-card'); table.classList.remove('m-scroll');
      labelRows(table, head);
    } else if (mode === 'scroll') {
      table.classList.remove('m-card');
      table.classList.toggle('m-scroll', !hasScrollParent(table));
    } else {
      table.classList.remove('m-card', 'm-scroll');
    }
  }

  /* ── 표가 아닌 격자형 목록: data-m-head / data-m-row 로 지정 ── */
  function processGrids() {
    var boxes = document.querySelectorAll('[data-m-row]');
    for (var b = 0; b < boxes.length; b++) {
      var box = boxes[b];
      var headSel = box.getAttribute('data-m-head');
      var head = headSel ? (box.querySelector(headSel) || document.querySelector(headSel)) : null;
      var labels = [];
      if (head) {
        head.classList.add('m-ghead');
        for (var h = 0; h < head.children.length; h++) labels.push(clean(head.children[h]));
      }
      var rows = box.querySelectorAll(box.getAttribute('data-m-row'));
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        row.classList.add('m-gcard');
        for (var c = 0; c < row.children.length; c++) {
          var cell = row.children[c];
          var label = labels[c] || '';
          if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
          cell.classList.toggle('m-long', clean(cell).length >= LONG_TEXT);
          cell.classList.toggle('m-empty', isEmptyCell(cell));
        }
      }
    }
  }

  function processAll() {
    if (!MQ.matches) return;
    try { processGrids(); } catch (e) {}
    var tables = document.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      try { processTable(tables[i]); } catch (e) { /* 한 표의 오류가 다른 표에 번지지 않게 */ }
    }
  }

  function reset() {
    var tables = document.querySelectorAll('table.m-card,table.m-scroll');
    for (var i = 0; i < tables.length; i++) tables[i].classList.remove('m-card', 'm-scroll');
    var g = document.querySelectorAll('.m-gcard,.m-ghead');
    for (var k = 0; k < g.length; k++) g[k].classList.remove('m-gcard', 'm-ghead');
  }

  /* ── 12px 미만 글자 규칙을 찾아 12px 로 올리는 스타일 생성 ── */
  function fixSmallFonts() {
    var out = [];
    var keep = (document.body.getAttribute('data-m-keepfont') || '').split(',')
      .map(function (x) { return x.trim(); }).filter(function (x) { return x; });
    function kept(sel) { for (var q = 0; q < keep.length; q++) if (sel.indexOf(keep[q]) >= 0) return true; return false; }
    function walk(rules) {
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (rule.type === 1) {
          var fs = rule.style && rule.style.fontSize;
          if (fs && /px$/.test(fs)) {
            var v = parseFloat(fs);
            if (v > 0 && v < MIN_FONT && !kept(rule.selectorText)) out.push(rule.selectorText + '{font-size:' + MIN_FONT + 'px!important}');
          }
        } else if (rule.type === 4) {
          var m = rule.media && rule.media.mediaText;
          if (m && /print/i.test(m)) continue;
          var ok = true;
          try { ok = window.matchMedia(m).matches; } catch (e) { ok = false; }
          if (ok) walk(rule.cssRules);
        }
      }
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
      var sheet = document.styleSheets[s];
      if (sheet.ownerNode && sheet.ownerNode.id === 'smerp-mobile-font') continue;
      var rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }   /* 외부 글꼴 CSS 는 건너뜀 */
      if (rules) walk(rules);
    }
    var css = out.length ? '@media screen and (max-width:768px){' + out.join('') + '}' : '';
    var el = document.getElementById('smerp-mobile-font');
    if (!el) {
      el = document.createElement('style'); el.id = 'smerp-mobile-font';
      document.head.appendChild(el);
    } else if (el !== document.head.lastElementChild) {
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  /* ── 실행 ── */
  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; processAll(); }, 60);
  }
  function touchesTable(m) {
    var t = m.target;
    if (t.nodeType === 3) t = t.parentNode;
    if (t && t.nodeType === 1 && (t.tagName === 'TABLE' || t.closest('table,[data-m-row],[data-m-head]'))) return true;
    for (var i = 0; i < m.addedNodes.length; i++) {
      var nd = m.addedNodes[i];
      if (nd.nodeType === 1 && (nd.tagName === 'TABLE' || nd.querySelector('table,[data-m-row]'))) return true;
    }
    return false;
  }
  function start() {
    document.documentElement.classList.toggle('m-on', MQ.matches);
    if (MQ.matches) { fixSmallFonts(); processAll(); }
    new MutationObserver(function (list) {
      if (!MQ.matches) return;
      for (var i = 0; i < list.length; i++) if (touchesTable(list[i])) { schedule(); return; }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    var onChange = function () {
      document.documentElement.classList.toggle('m-on', MQ.matches);
      if (MQ.matches) { fixSmallFonts(); processAll(); } else { reset(); }
    };
    if (MQ.addEventListener) MQ.addEventListener('change', onChange); else MQ.addListener(onChange);
    window.addEventListener('load', function () { if (MQ.matches) { fixSmallFonts(); processAll(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.smerpMobile = { refresh: function () { if (MQ.matches) { fixSmallFonts(); processAll(); } } };
})();
