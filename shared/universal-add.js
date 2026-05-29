/**
 * universal-add.js — MIE Universal Add Modal
 *
 * 사용법 (각 index.html 하단):
 *   <script src="/shared/universal-add.js"></script>
 *
 * 의존성:
 *   - window.BACKEND  : 각 페이지에서 선언되어 있어야 함 (없으면 내부 fallback 사용)
 *   - window.loadFinanceData() / loadTasks() / loadHealthTasks() : 저장 후 콜백 (optional)
 *   - window.cal.refetchEvents()                                  : 이벤트 저장 후 콜백 (optional)
 *
 * 공개 API:
 *   window.openUniversalAdd(preselect?)  — 모달 열기 (preselect: 'health'|'finance'|'task'|'event')
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   * 0. BACKEND 해결
   * ───────────────────────────────────────────── */
  function _backend() {
    return (typeof window.BACKEND === 'string' && window.BACKEND)
      ? window.BACKEND
      : 'https://api.mie.today';
  }

  /* ─────────────────────────────────────────────
   * 1. MET 테이블 (20+ 종목)
   * ───────────────────────────────────────────── */
  var MET_TABLE = {
    'running':        8.0,
    'jogging':        7.0,
    'walking':        3.5,
    'brisk walk':     4.3,
    'hiking':         5.3,
    'cycling':        6.8,
    'cycling (fast)': 10.0,
    'swimming':       6.0,
    'swimming (fast)':9.8,
    'hiit':           8.0,
    'jump rope':      11.8,
    'rowing':         7.0,
    'yoga':           3.0,
    'pilates':        3.5,
    'stretching':     2.3,
    'weight training':5.0,
    'crossfit':       8.0,
    'basketball':     6.5,
    'soccer':         7.0,
    'tennis':         7.3,
    'badminton':      5.5,
    'dancing':        5.0,
    'elliptical':     5.0,
    'stair climbing': 9.0,
    'boxing':         7.8,
    'martial arts':   10.0,
    'skiing':         7.0,
    'skating':        7.0,
    'golf':           4.5,
    'baseball':       5.0,
  };

  function _metSuggest(typeStr) {
    if (!typeStr) return null;
    var k = typeStr.toLowerCase().trim();
    if (MET_TABLE[k] !== undefined) return MET_TABLE[k];
    // partial match
    var keys = Object.keys(MET_TABLE);
    for (var i = 0; i < keys.length; i++) {
      if (k.indexOf(keys[i]) !== -1 || keys[i].indexOf(k) !== -1) return MET_TABLE[keys[i]];
    }
    return null;
  }

  /* ─────────────────────────────────────────────
   * 2. CSS 주입 (한 번만)
   * ───────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ua-styles')) return;
    var s = document.createElement('style');
    s.id = 'ua-styles';
    s.textContent = [
      '#ua-overlay{position:fixed;inset:0;background:rgba(32,33,36,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px;animation:uaFadeIn .15s ease;}',
      '@keyframes uaFadeIn{from{opacity:0}to{opacity:1}}',
      '#ua-modal{background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);width:100%;max-width:460px;animation:uaSlideUp .18s cubic-bezier(.4,0,.2,1);overflow:hidden;font-family:"DM Sans",sans-serif;}',
      '@keyframes uaSlideUp{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
      '#ua-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 0;}',
      '#ua-header-title{font-size:15px;font-weight:600;color:#202124;display:flex;align-items:center;gap:7px;}',
      '#ua-header-title svg{width:16px;height:16px;color:#1a73e8;flex-shrink:0;}',
      '#ua-back-btn{display:none;align-items:center;gap:4px;background:none;border:none;cursor:pointer;color:#1a73e8;font-size:12px;font-weight:600;font-family:"DM Sans",sans-serif;padding:4px 8px;border-radius:6px;transition:background .12s;}',
      '#ua-back-btn:hover{background:#e8f0fe;}',
      '#ua-close-btn{background:none;border:none;cursor:pointer;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#5f6368;transition:background .12s;flex-shrink:0;}',
      '#ua-close-btn:hover{background:#f1f3f4;color:#202124;}',
      '#ua-close-btn svg{width:16px;height:16px;}',
      '#ua-divider{height:1px;background:#f1f3f4;margin:0 18px;}',
      '#ua-pill-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px 18px 20px;}',
      '.ua-pill{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 8px;border:1.5px solid #e8eaed;border-radius:12px;cursor:pointer;background:#fff;font-family:"DM Sans",sans-serif;transition:all .15s;user-select:none;}',
      '.ua-pill:hover{border-color:#1a73e8;background:#f0f5ff;transform:translateY(-1px);box-shadow:0 3px 10px rgba(26,115,232,.12);}',
      '.ua-pill.active{border-color:#1a73e8;background:#e8f0fe;}',
      '.ua-pill-icon{font-size:22px;line-height:1;}',
      '.ua-pill-label{font-size:12px;font-weight:600;color:#3c4043;}',
      '.ua-pill:hover .ua-pill-label,.ua-pill.active .ua-pill-label{color:#1a73e8;}',
      '#ua-form-area{padding:16px 18px 18px;max-height:60vh;overflow-y:auto;}',
      '#ua-form-area::-webkit-scrollbar{width:4px;}',
      '#ua-form-area::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:2px;}',
      '.ua-type-toggle{display:flex;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:12px;}',
      '.ua-type-btn{flex:1;padding:7px 4px;font-size:12px;font-weight:500;border:none;background:#f8f9fa;cursor:pointer;font-family:"DM Sans",sans-serif;color:#5f6368;transition:all .12s;white-space:nowrap;}',
      '.ua-type-btn.ua-active-income{background:#e6f4ea;color:#137333;}',
      '.ua-type-btn.ua-active-expense{background:#fce8e6;color:#c5221f;}',
      '.ua-type-btn.ua-active-saving{background:#e8f0fe;color:#1a56b0;}',
      '.ua-field{margin-bottom:10px;}',
      '.ua-lbl{font-size:10px;font-weight:600;color:#5f6368;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:3px;}',
      '.ua-input{width:100%;border:1px solid #dadce0;border-radius:6px;padding:7px 10px;font-size:13px;font-family:"DM Sans",sans-serif;color:#202124;background:#f8f9fa;outline:none;transition:border-color .12s,background .12s;box-sizing:border-box;}',
      '.ua-input:focus{border-color:#1a73e8;background:#fff;}',
      '.ua-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.ua-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}',
      '#ua-actions{display:flex;gap:8px;margin-top:14px;}',
      '#ua-cancel-form{flex:1;background:#f1f3f4;color:#3c4043;border:1px solid #dadce0;border-radius:6px;padding:8px;font-size:13px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;}',
      '#ua-cancel-form:hover{background:#e0e0e0;}',
      '#ua-save-btn{flex:2;background:#1a73e8;color:#fff;border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:"DM Sans",sans-serif;transition:background .15s;}',
      '#ua-save-btn:hover:not(:disabled){background:#1765cc;}',
      '#ua-save-btn:disabled{background:#a8c7fa;cursor:not-allowed;}',
      '#ua-status{font-size:11px;text-align:center;margin-top:6px;min-height:13px;color:#5f6368;}',
      /* MET suggest label */
      '.ua-met-hint{font-size:10px;color:#1a73e8;margin-top:2px;min-height:13px;font-style:italic;}',
      /* Food search */
      '.ua-fname-wrap{position:relative;}',
      '.ua-fname-wrap .ua-input{padding-right:34px;}',
      '.ua-search-btn{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;line-height:1;padding:2px;}',
      '.ua-food-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid #dadce0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:10000;max-height:200px;overflow-y:auto;display:none;}',
      '.ua-food-dropdown.open{display:block;}',
      '.ua-food-result{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;cursor:pointer;border-bottom:1px solid #f1f3f4;transition:background .1s;}',
      '.ua-food-result:last-child{border-bottom:none;}',
      '.ua-food-result:hover{background:#e8f0fe;}',
      '.ua-food-result-name{font-size:13px;font-weight:600;color:#202124;}',
      '.ua-food-result-sub{font-size:11px;color:#5f6368;margin-top:1px;}',
      '.ua-food-result-cal{font-size:13px;font-weight:700;color:#1a73e8;white-space:nowrap;margin-left:8px;flex-shrink:0;}',
      '.ua-food-msg{font-size:12px;color:#5f6368;font-style:italic;padding:10px;text-align:center;}',
      '@media(max-width:480px){',
      '#ua-modal{max-width:100%;border-radius:16px 16px 0 0;position:fixed;bottom:0;left:0;right:0;margin:0;}',
      '#ua-overlay{align-items:flex-end;padding:0;}',
      '.ua-row2,.ua-row3{grid-template-columns:1fr;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ─────────────────────────────────────────────
   * 3. 상태
   * ───────────────────────────────────────────── */
  var _state = {
    open: false, step: 1, pill: null,
    finType: 'Income', healthType: null,
    _sleepQ: 0, _mood: '', _energy: 0,
    calendars: [], taskLists: [], loaded: false,
  };

  /* ─────────────────────────────────────────────
   * 4. 유틸
   * ───────────────────────────────────────────── */
  var _toastTmr = null;

  function _toast(msg, type) {
    var existing = document.getElementById('toast');
    if (existing && typeof window.toast === 'function') { window.toast(msg, type); return; }
    var t = document.getElementById('ua-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ua-toast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#202124;color:#fff;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .25s ease,opacity .25s;opacity:0;z-index:9999;white-space:nowrap;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = type === 'success' ? '#1e8e3e' : type === 'error' ? '#d93025' : '#202124';
    setTimeout(function () { t.style.transform = 'translateX(-50%) translateY(0)'; t.style.opacity = '1'; }, 10);
    if (_toastTmr) clearTimeout(_toastTmr);
    _toastTmr = setTimeout(function () { t.style.transform = 'translateX(-50%) translateY(80px)'; t.style.opacity = '0'; }, 2800);
  }

  function _val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function _setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v;
  }

  function _escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function _todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function detectPage() {
    var p = window.location.pathname.replace(/\/$/, '').toLowerCase();
    if (p === '' || p === '/dashboard') return 'event';
    if (p.startsWith('/finance')) return 'finance';
    if (p.startsWith('/health')) return 'health';
    if (p.startsWith('/task')) return 'task';
    return 'event';
  }

  /* ─────────────────────────────────────────────
   * 5. Finance 카테고리
   * ───────────────────────────────────────────── */
  var FIN_CATEGORIES = {
    Income: ['Salary', 'Freelance', 'Sales', 'Other Income'],
    Expenses: ['Rent / Mortgage', 'Groceries', 'Household Essentials', "Renter's / Home Insurance",
      'Gas & Electricity', 'Water / Sewer', 'Internet', 'Cell Phone', 'Health Insurance',
      'Car Payment', 'Car Insurance', 'Tax', 'Credit Card Payment',
      'Transportation - Public Transit', 'Transportation - Rideshare',
      'Transportation - Gas / EV', 'Transportation - Parking',
      'Medical / Co-payment', 'Pharmacy', 'Gym / Fitness', 'Education',
      'Gift / Donation', 'Beauty & Personal Care', 'Shopping - Clothing',
      'Shopping - Electronics', 'Snacks & Coffee', 'Dining Out', 'Entertainment',
      'Subscriptions', 'Hobby', 'Travel', 'Other - Needs', 'Other - Wants'],
    Savings: ['Savings Transfer', 'Emergency Fund', 'Retirement', 'Investment'],
  };

  function _finCatOpts(type) {
    return (FIN_CATEGORIES[type] || []).map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }

  /* ─────────────────────────────────────────────
   * 6. 모달 DOM 생성
   * ───────────────────────────────────────────── */
  function _buildModal() {
    var wrap = document.createElement('div');
    wrap.id = 'ua-overlay';
    var PILLS = [
      { id: 'event',   icon: '📅', label: 'Event'   },
      { id: 'finance', icon: '💰', label: 'Finance'  },
      { id: 'health',  icon: '💪', label: 'Health'   },
      { id: 'task',    icon: '✅', label: 'Task'     },
      { id: 'tracker', icon: '📊', label: 'Tracker'  },
      { id: 'notes',   icon: '📝', label: 'Notes'    },
    ];
    wrap.innerHTML =
      '<div id="ua-modal" role="dialog" aria-modal="true">' +
        '<div id="ua-header">' +
          '<div id="ua-header-title">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="2" x2="8" y2="14" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke-linecap="round"/></svg>' +
            '<span id="ua-header-text">Add New</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px;">' +
            '<button id="ua-back-btn" onclick="window.__uaBack()">' +
              '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="10,3 5,8 10,13"/></svg>Back' +
            '</button>' +
            '<button id="ua-close-btn" onclick="window.__uaClose()">' +
              '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div id="ua-divider"></div>' +
        '<div id="ua-pill-grid">' +
          PILLS.map(function (p) {
            return '<button class="ua-pill" data-pill="' + p.id + '" onclick="window.__uaSelectPill(\'' + p.id + '\')" aria-label="Add ' + p.label + '">' +
              '<span class="ua-pill-icon">' + p.icon + '</span>' +
              '<span class="ua-pill-label">' + p.label + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div id="ua-form-area" style="display:none;"></div>' +
      '</div>';
    return wrap;
  }

  /* ─────────────────────────────────────────────
   * 7. Form 빌더들
   * ───────────────────────────────────────────── */
  function _formEvent() {
    var calOpts = (_state.calendars || []).map(function (c) {
      return '<option value="' + c.id + '">' + _escHtml(c.summary || c.id) + '</option>';
    }).join('');
    if (!calOpts) calOpts = '<option value="primary">My Calendar</option>';
    return '' +
      '<div class="ua-field"><label class="ua-lbl">Title *</label><input class="ua-input" type="text" id="ua-ev-title" placeholder="Event title…"/></div>' +
      '<div class="ua-row2"><div class="ua-field"><label class="ua-lbl">Date</label><input class="ua-input" type="date" id="ua-ev-date"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Start Time</label><input class="ua-input" type="time" id="ua-ev-time"/></div></div>' +
      '<div class="ua-row2"><div class="ua-field"><label class="ua-lbl">End Date</label><input class="ua-input" type="date" id="ua-ev-end-date"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">End Time</label><input class="ua-input" type="time" id="ua-ev-end-time"/></div></div>' +
      '<div class="ua-field"><label class="ua-lbl">Location</label><input class="ua-input" type="text" id="ua-ev-location" placeholder="Add a location…"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Calendar</label><select class="ua-input" id="ua-ev-cal">' + calOpts + '</select></div>';
  }

  function _formFinance() {
    return '' +
      '<div class="ua-type-toggle">' +
        '<button class="ua-type-btn ua-active-income" id="ua-fin-inc" onclick="window.__uaFinType(\'Income\')">💵 Income</button>' +
        '<button class="ua-type-btn" id="ua-fin-exp" onclick="window.__uaFinType(\'Expenses\')">💸 Expense</button>' +
        '<button class="ua-type-btn" id="ua-fin-sav" onclick="window.__uaFinType(\'Savings\')">🏦 Saving</button>' +
      '</div>' +
      '<div class="ua-row2"><div class="ua-field"><label class="ua-lbl">Amount *</label><input class="ua-input" type="number" id="ua-fin-amount" placeholder="0.00" min="0" step="0.01"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Date</label><input class="ua-input" type="date" id="ua-fin-date"/></div></div>' +
      '<div class="ua-field"><label class="ua-lbl">Category *</label><select class="ua-input" id="ua-fin-cat">' + _finCatOpts('Income') + '</select></div>' +
      '<div class="ua-field"><label class="ua-lbl">Sub-label</label><input class="ua-input" type="text" id="ua-fin-sublabel" placeholder="e.g. Parent Support…"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Notes</label><input class="ua-input" type="text" id="ua-fin-notes" placeholder="Optional…"/></div>';
  }

  function _formHealth() {
    var SUB = [
      { id: 'activity', icon: '🏃', label: 'Activity' },
      { id: 'food',     icon: '🍽️', label: 'Food'     },
      { id: 'body',     icon: '⚖️', label: 'Body'     },
      { id: 'mood',     icon: '😊', label: 'Mood'     },
      { id: 'sleep',    icon: '🌙', label: 'Sleep'    },
      { id: 'womens',   icon: '🌸', label: "Women's"  },
    ];
    var pillsHtml = '<div id="ua-h-sub-pills" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
    SUB.forEach(function (s) {
      pillsHtml += '<button class="ua-pill" id="ua-hsub-' + s.id + '" data-hsub="' + s.id +
        '" onclick="window.__uaHealthSub(\'' + s.id + '\')" style="padding:10px 4px;border-radius:10px;">' +
        '<span class="ua-pill-icon">' + s.icon + '</span>' +
        '<span class="ua-pill-label">' + s.label + '</span></button>';
    });
    pillsHtml += '</div>';
    return pillsHtml + '<div id="ua-h-form-wrap"></div>';
  }

  /* ── Activity: MET 자동 계산 포함 ── */
  function _formHealthActivity() {
    return '' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Activity Type *</label>' +
          '<input class="ua-input" id="ua-ha-type" type="text" placeholder="e.g. Running"' +
          ' oninput="window.__uaActivityTypeInput(this.value)"/>' +
          '<div class="ua-met-hint" id="ua-ha-met-hint"></div>' +
        '</div>' +
        '<div class="ua-field"><label class="ua-lbl">Duration (min)</label>' +
          '<input class="ua-input" id="ua-ha-dur" type="number" placeholder="0" min="0"' +
          ' oninput="window.__uaCalcBurned()"/>' +
        '</div>' +
      '</div>' +
      '<div class="ua-row3">' +
        '<div class="ua-field"><label class="ua-lbl">Sets</label><input class="ua-input" id="ua-ha-sets" type="number" placeholder="—" min="0"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Reps</label><input class="ua-input" id="ua-ha-reps" type="number" placeholder="—" min="0"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Weight (kg)</label><input class="ua-input" id="ua-ha-wkg" type="number" placeholder="—" min="0" step="0.5"/></div>' +
      '</div>' +
      '<div class="ua-row3">' +
        '<div class="ua-field"><label class="ua-lbl">MET Value</label>' +
          '<input class="ua-input" id="ua-ha-met" type="number" placeholder="e.g. 8.0" step="0.1" min="0"' +
          ' oninput="window.__uaCalcBurned()"/>' +
        '</div>' +
        '<div class="ua-field"><label class="ua-lbl">Cal Burned <span style="font-weight:400;color:#1a73e8;">(auto)</span></label>' +
          '<input class="ua-input" id="ua-ha-cal" type="number" placeholder="—" min="0"' +
          ' style="background:#f8f9fa;" readonly/>' +
        '</div>' +
        '<div class="ua-field"><label class="ua-lbl">Steps</label><input class="ua-input" id="ua-ha-steps" type="number" placeholder="0" min="0"/></div>' +
      '</div>' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Distance (km)</label><input class="ua-input" id="ua-ha-dist" type="number" placeholder="0" step="0.01" min="0"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Notes</label><input class="ua-input" id="ua-ha-notes" type="text" placeholder="Optional"/></div>' +
      '</div>';
  }

  /* ── Food: 🔍 검색 포함 ── */
  function _formHealthFood() {
    var h = new Date().getHours();
    var dm = (h >= 5 && h < 15) ? 'AM' : 'PM';
    return '' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Meal Time</label>' +
          '<select class="ua-input" id="ua-hf-meal">' +
            '<option value="AM"' + (dm === 'AM' ? ' selected' : '') + '>AM (Breakfast / Morning)</option>' +
            '<option value="PM"' + (dm === 'PM' ? ' selected' : '') + '>PM (Lunch / Dinner / Late)</option>' +
          '</select>' +
        '</div>' +
        '<div class="ua-field"><label class="ua-lbl">Food Name *</label>' +
          '<div class="ua-fname-wrap">' +
            '<input class="ua-input" id="ua-hf-name" type="text" placeholder=\'e.g. Chicken salad\'' +
            ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.__uaFoodSearch();}" />' +
            '<button class="ua-search-btn" type="button" onclick="window.__uaFoodSearch()" title="Search nutrition">🔍</button>' +
            '<div class="ua-food-dropdown" id="ua-hf-dropdown"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">' +
        '<div class="ua-field"><label class="ua-lbl">Calories</label><input class="ua-input" id="ua-hf-cal" type="number" placeholder="0" min="0"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Protein (g)</label><input class="ua-input" id="ua-hf-pro" type="number" placeholder="0" min="0" step="0.1"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Carbs (g)</label><input class="ua-input" id="ua-hf-carb" type="number" placeholder="0" min="0" step="0.1"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Fat (g)</label><input class="ua-input" id="ua-hf-fat" type="number" placeholder="0" min="0" step="0.1"/></div>' +
      '</div>' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Fiber (g)</label><input class="ua-input" id="ua-hf-fiber" type="number" placeholder="0" min="0" step="0.1"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Notes</label><input class="ua-input" id="ua-hf-notes" type="text" placeholder="Optional"/></div>' +
      '</div>';
  }

  function _formHealthBody() {
    return '' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Weight (kg)</label><input class="ua-input" id="ua-hb-weight" type="number" placeholder="70.4" step="0.1"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Heart Rate (bpm)</label><input class="ua-input" id="ua-hb-hr" type="number" placeholder="72" min="0"/></div>' +
      '</div>' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">BP Systolic</label><input class="ua-input" id="ua-hb-bpsys" type="number" placeholder="120" min="0"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">BP Diastolic</label><input class="ua-input" id="ua-hb-bpdia" type="number" placeholder="80" min="0"/></div>' +
      '</div>' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">SpO2 (%)</label><input class="ua-input" id="ua-hb-spo2" type="number" placeholder="98" min="0" max="100"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Glucose (mg/dL)</label><input class="ua-input" id="ua-hb-glu" type="number" placeholder="95" min="0"/></div>' +
      '</div>' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Temp (°C)</label><input class="ua-input" id="ua-hb-temp" type="number" placeholder="36.6" step="0.1"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Notes</label><input class="ua-input" id="ua-hb-notes" type="text" placeholder="Optional"/></div>' +
      '</div>';
  }

  function _formHealthSleep() {
    var qLabels = [['😴', 'Poor'], ['😐', 'Fair'], ['🙂', 'Good'], ['😊', 'Great'], ['🌟', 'Excellent']];
    var qPicker = '<div class="ua-field" style="margin-bottom:10px;"><label class="ua-lbl">Sleep Quality</label>' +
      '<div id="ua-hs-quality-row" style="display:flex;gap:6px;margin-top:4px;">';
    qLabels.forEach(function (q, i) {
      qPicker += '<button type="button" class="ua-pill" data-q="' + (i + 1) + '" id="ua-hs-q' + (i + 1) + '" ' +
        'onclick="window.__uaHealthSleepQ(' + (i + 1) + ')" style="flex:1;padding:6px 2px;border-radius:8px;">' +
        '<span style="font-size:18px;display:block;">' + q[0] + '</span>' +
        '<span style="font-size:10px;display:block;margin-top:2px;">' + q[1] + '</span></button>';
    });
    qPicker += '</div></div>';
    return '' +
      '<div class="ua-row2">' +
        '<div class="ua-field"><label class="ua-lbl">Bedtime</label><input class="ua-input" id="ua-hs-bed" type="time" oninput="window.__uaHealthSleepCalc()"/></div>' +
        '<div class="ua-field"><label class="ua-lbl">Wake Time</label><input class="ua-input" id="ua-hs-wake" type="time" oninput="window.__uaHealthSleepCalc()"/></div>' +
      '</div>' +
      '<div class="ua-field" style="margin-bottom:10px;"><label class="ua-lbl">Duration <span style="font-weight:400;color:#1a73e8;">(auto)</span></label>' +
        '<input class="ua-input" id="ua-hs-dur" type="text" placeholder="—" readonly style="background:#f8f9fa;color:#5f6368;"/>' +
      '</div>' +
      qPicker +
      '<div class="ua-field"><label class="ua-lbl">Notes</label><input class="ua-input" id="ua-hs-notes" type="text" placeholder="Optional…"/></div>';
  }

  function _formHealthMood() {
    var moods = [
      { m: 'Amazing', e: '🤩' }, { m: 'Happy', e: '😊' }, { m: 'Calm', e: '😌' },
      { m: 'Neutral', e: '😐' }, { m: 'Tired', e: '😴' }, { m: 'Anxious', e: '😰' },
      { m: 'Sad', e: '😢' }, { m: 'Angry', e: '😠' }, { m: 'Stressed', e: '😫' }, { m: 'Grateful', e: '🙏' },
    ];
    var moodGrid = '<div class="ua-field" style="margin-bottom:10px;"><label class="ua-lbl">Mood *</label>' +
      '<div id="ua-hm-mood-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:4px;">';
    moods.forEach(function (m) {
      moodGrid += '<button type="button" class="ua-pill" data-mood="' + m.m + '" ' +
        'onclick="window.__uaHealthMoodSel(\'' + m.m + '\')" style="padding:6px 2px;border-radius:8px;">' +
        '<span style="font-size:20px;display:block;">' + m.e + '</span>' +
        '<span style="font-size:10px;display:block;margin-top:2px;color:#5f6368;">' + m.m + '</span></button>';
    });
    moodGrid += '</div></div>';
    var eLabels = [['⚡', 'Very Low'], ['🔋', 'Low'], ['⚡', 'Medium'], ['🔥', 'High'], ['💥', 'Peak']];
    var energyRow = '<div class="ua-field" style="margin-bottom:10px;"><label class="ua-lbl">Energy Level</label>' +
      '<div id="ua-hm-energy-row" style="display:flex;gap:5px;margin-top:4px;">';
    eLabels.forEach(function (e, i) {
      energyRow += '<button type="button" class="ua-pill" data-energy="' + (i + 1) + '" id="ua-hm-e' + (i + 1) + '" ' +
        'onclick="window.__uaHealthEnergySet(' + (i + 1) + ')" style="flex:1;padding:5px 2px;border-radius:8px;">' +
        '<span style="font-size:16px;display:block;">' + e[0] + '</span>' +
        '<span style="font-size:10px;display:block;margin-top:2px;">' + e[1] + '</span></button>';
    });
    energyRow += '</div></div>';
    return moodGrid + energyRow +
      '<div class="ua-field"><label class="ua-lbl">Notes</label>' +
        '<input class="ua-input" id="ua-hm-notes" type="text" placeholder="What\'s on your mind?"/>' +
      '</div>';
  }

  function _formHealthWomens() {
    return '<div style="text-align:center;padding:24px 0 12px;">' +
      '<div style="font-size:48px;margin-bottom:12px;">🌸</div>' +
      '<div style="font-size:14px;font-weight:600;color:#202124;margin-bottom:8px;">Women\'s Health</div>' +
      '<div style="font-size:12px;color:#5f6368;margin-bottom:20px;line-height:1.6;">' +
        'Period tracking, pregnancy mode, symptoms, cervical mucus and more.</div>' +
      '<a href="/health" style="display:inline-block;background:#1a73e8;color:#fff;border-radius:20px;' +
        'padding:9px 24px;font-size:13px;font-weight:600;text-decoration:none;font-family:\'DM Sans\',sans-serif;">' +
        'Open Women\'s Health →</a></div>';
  }

  function _formTask() {
    var listOpts = (_state.taskLists || []).map(function (l) {
      return '<option value="' + _escHtml(l.id) + '">' + _escHtml(l.title || l.id) + '</option>';
    }).join('');
    if (!listOpts) listOpts = '<option value="@default">My Tasks</option>';
    return '' +
      '<div class="ua-field"><label class="ua-lbl">Title *</label><input class="ua-input" type="text" id="ua-task-title" placeholder="What needs to be done?"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Notes</label><textarea class="ua-input" id="ua-task-notes" placeholder="Optional notes…" style="min-height:56px;resize:vertical;"></textarea></div>' +
      '<div class="ua-row2"><div class="ua-field"><label class="ua-lbl">Due Date</label><input class="ua-input" type="date" id="ua-task-due"/></div>' +
      '<div class="ua-field"><label class="ua-lbl">Task List</label><select class="ua-input" id="ua-task-list">' + listOpts + '</select></div></div>';
  }

  function _formTracker() {
    return '<div style="text-align:center;padding:20px 0 10px;">' +
      '<div style="font-size:36px;margin-bottom:10px;">📊</div>' +
      '<div style="font-size:14px;font-weight:600;color:#202124;margin-bottom:6px;">Trackers</div>' +
      '<div style="font-size:12px;color:#5f6368;margin-bottom:16px;line-height:1.6;">Manage all your trackers from the dedicated Trackers page.</div>' +
      '<a href="/trackers" style="display:inline-block;background:#1a73e8;color:#fff;border-radius:20px;padding:7px 20px;font-size:13px;font-weight:600;text-decoration:none;">Go to Trackers</a></div>';
  }

  function _formNotes() {
    return '<div style="text-align:center;padding:16px 0 8px;">' +
      '<div style="font-size:36px;margin-bottom:8px;">📝</div>' +
      '<div style="font-size:14px;font-weight:600;color:#202124;margin-bottom:6px;">Notes</div>' +
      '<div style="font-size:12px;color:#5f6368;margin-bottom:14px;line-height:1.6;">Notes page coming soon.</div></div>' +
      '<div style="background:#f8f9fa;border:1px solid #e8eaed;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:10px;font-weight:600;color:#9aa0a6;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Quick Note</div>' +
        '<textarea class="ua-input" id="ua-notes-text" placeholder="Jot something down…" style="min-height:72px;resize:vertical;"></textarea>' +
      '</div>';
  }

  /* ─────────────────────────────────────────────
   * 8. 모달 열기 / 닫기 / 네비게이션
   * ───────────────────────────────────────────── */
  function _prefetch() {
    if (_state.loaded) return;
    _state.loaded = true;
    var B = _backend();
    fetch(B + '/api/me/calendars', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var items = d.calendars || d.items || [];
        _state.calendars = items.map(function (c) { return { id: c.id, summary: c.summary || c.id }; });
      }).catch(function () {});
    fetch(B + '/api/me/tasks', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        _state.taskLists = Array.isArray(d.lists) ? d.lists : [];
      }).catch(function () {});
  }

  function _escHandler(e) { if (e.key === 'Escape') _close(); }

  function _open(preselect) {
    if (_state.open) return;
    _injectStyles();
    _prefetch();
    var overlay = _buildModal();
    document.body.appendChild(overlay);
    _state.open = true;
    var defaultPill = preselect || detectPage();
    var btn = overlay.querySelector('[data-pill="' + defaultPill + '"]');
    if (btn) btn.classList.add('active');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _close(); });
    document.addEventListener('keydown', _escHandler);
    /* 외부 클릭 시 Food 드롭다운 닫기 */
    document.addEventListener('click', _foodDropdownOutsideHandler);
    if (preselect) _selectPill(preselect);
    setTimeout(function () {
      var first = overlay.querySelector('.ua-pill');
      if (first) first.focus();
    }, 180);
  }

  function _close() {
    var overlay = document.getElementById('ua-overlay');
    if (overlay) overlay.remove();
    _state.open = false;
    _state.step = 1;
    _state.pill = null;
    _state.healthType = null;
    _state._sleepQ = 0;
    _state._mood = '';
    _state._energy = 0;
    document.removeEventListener('keydown', _escHandler);
    document.removeEventListener('click', _foodDropdownOutsideHandler);
  }

  function _goBack() {
    _state.step = 1; _state.pill = null; _state.healthType = null;
    var ht = document.getElementById('ua-header-text');
    if (ht) ht.textContent = 'Add New';
    var backBtn = document.getElementById('ua-back-btn');
    var pillGrid = document.getElementById('ua-pill-grid');
    var formArea = document.getElementById('ua-form-area');
    if (backBtn) backBtn.style.display = 'none';
    if (pillGrid) pillGrid.style.display = 'grid';
    if (formArea) { formArea.style.display = 'none'; formArea.innerHTML = ''; }
  }

  function _selectPill(pillId) {
    _state.pill = pillId;
    _state.step = 2;
    var labels = {
      event: '📅 Add Event', finance: '💰 Add Finance',
      health: '💪 Add Health Entry', task: '✅ Add Task',
      tracker: '📊 Tracker', notes: '📝 Notes',
    };
    var ht = document.getElementById('ua-header-text');
    if (ht) ht.textContent = labels[pillId] || 'Add';
    var backBtn = document.getElementById('ua-back-btn');
    var pillGrid = document.getElementById('ua-pill-grid');
    var formArea = document.getElementById('ua-form-area');
    if (backBtn) backBtn.style.display = 'flex';
    if (pillGrid) pillGrid.style.display = 'none';
    if (formArea) formArea.style.display = 'block';
    var formHtml = '';
    if (pillId === 'event')        formHtml = _formEvent();
    else if (pillId === 'finance') formHtml = _formFinance();
    else if (pillId === 'health')  formHtml = _formHealth();
    else if (pillId === 'task')    formHtml = _formTask();
    else if (pillId === 'tracker') formHtml = _formTracker();
    else if (pillId === 'notes')   formHtml = _formNotes();
    var isPlaceholder = (pillId === 'tracker' || pillId === 'notes');
    var isHealthTop   = (pillId === 'health');
    formArea.innerHTML = formHtml + (isPlaceholder || isHealthTop ? '' :
      '<div id="ua-actions"><button id="ua-cancel-form" onclick="window.__uaClose()">Cancel</button>' +
      '<button id="ua-save-btn" onclick="window.__uaSave()">Save</button></div>' +
      '<div id="ua-status"></div>');
    var today = _todayStr();
    ['ua-ev-date', 'ua-ev-end-date', 'ua-fin-date'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = today;
    });
    setTimeout(function () {
      var first = formArea.querySelector('input[type=text],input[type=number],textarea');
      if (first) first.focus();
    }, 60);
  }

  /* ─────────────────────────────────────────────
   * 9. Health 서브카테고리 선택
   * ───────────────────────────────────────────── */
  window.__uaHealthSub = function (sub) {
    _state.healthType = sub;
    _state._sleepQ = 0; _state._mood = ''; _state._energy = 0;
    document.querySelectorAll('[data-hsub]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-hsub') === sub);
    });
    var wrap = document.getElementById('ua-h-form-wrap');
    if (!wrap) return;
    var html = '';
    if (sub === 'activity')    html = _formHealthActivity();
    else if (sub === 'food')   html = _formHealthFood();
    else if (sub === 'body')   html = _formHealthBody();
    else if (sub === 'sleep')  html = _formHealthSleep();
    else if (sub === 'mood')   html = _formHealthMood();
    else if (sub === 'womens') html = _formHealthWomens();
    var isPlaceholder = (sub === 'womens');
    wrap.innerHTML = html + (isPlaceholder ? '' :
      '<div id="ua-actions"><button id="ua-cancel-form" onclick="window.__uaClose()">Cancel</button>' +
      '<button id="ua-save-btn" onclick="window.__uaSave()">Save</button></div>' +
      '<div id="ua-status"></div>');
    setTimeout(function () {
      var first = wrap.querySelector('input[type=text],input[type=number],input[type=time]');
      if (first) first.focus();
    }, 60);
  };

  /* ─────────────────────────────────────────────
   * 10. Activity: MET 자동 계산
   * ───────────────────────────────────────────── */
  window.__uaActivityTypeInput = function (typeStr) {
    var hint = document.getElementById('ua-ha-met-hint');
    var metEl = document.getElementById('ua-ha-met');
    var suggested = _metSuggest(typeStr);
    if (suggested !== null) {
      if (hint) hint.textContent = 'Suggested MET: ' + suggested;
      if (metEl && !metEl.value) {
        metEl.value = suggested;
        window.__uaCalcBurned();
      }
    } else {
      if (hint) hint.textContent = '';
    }
  };

  window.__uaCalcBurned = function () {
    var met = parseFloat(document.getElementById('ua-ha-met') ? document.getElementById('ua-ha-met').value : '');
    var dur = parseFloat(document.getElementById('ua-ha-dur') ? document.getElementById('ua-ha-dur').value : '');
    var calEl = document.getElementById('ua-ha-cal');
    if (!calEl) return;
    if (met > 0 && dur > 0) {
      calEl.value = Math.round(met * 70 * dur / 60);
    } else {
      calEl.value = '';
    }
  };

  /* ─────────────────────────────────────────────
   * 11. Food: 영양정보 검색
   * ───────────────────────────────────────────── */
  function _foodDropdownOutsideHandler(e) {
    var wrap = document.querySelector('.ua-fname-wrap');
    if (wrap && !wrap.contains(e.target)) _foodCloseDropdown();
  }

  function _foodCloseDropdown() {
    var dd = document.getElementById('ua-hf-dropdown');
    if (dd) { dd.innerHTML = ''; dd.classList.remove('open'); }
  }

  function _foodFill(f) {
    _setVal('ua-hf-name',  f.food_name || '');
    _setVal('ua-hf-cal',   Math.round(f.calories_kcal || 0));
    _setVal('ua-hf-pro',   f.protein_g || 0);
    _setVal('ua-hf-carb',  f.carbs_g || 0);
    _setVal('ua-hf-fat',   f.fat_g || 0);
    _setVal('ua-hf-fiber', f.fiber_g || 0);
  }

  window.__uaFoodSearch = function () {
    var q = _val('ua-hf-name');
    if (!q) return;
    var dd = document.getElementById('ua-hf-dropdown');
    if (!dd) return;
    dd.innerHTML = '<div class="ua-food-msg">Searching…</div>';
    dd.classList.add('open');
    fetch(_backend() + '/api/health/food/search', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var foods = d.foods || [];
        dd.innerHTML = '';
        if (!foods.length) { dd.innerHTML = '<div class="ua-food-msg">No results.</div>'; return; }
        foods.forEach(function (f) {
          var item = document.createElement('div');
          item.className = 'ua-food-result';
          item.innerHTML =
            '<div>' +
              '<div class="ua-food-result-name">' + _escHtml(f.food_name || '') + '</div>' +
              '<div class="ua-food-result-sub">' + _escHtml(f.brand_name || f.serving_unit || f.source || '') + '</div>' +
            '</div>' +
            '<span class="ua-food-result-cal">' + Math.round(f.calories_kcal || 0) + ' kcal</span>';
          item.onclick = function () { _foodFill(f); _foodCloseDropdown(); };
          dd.appendChild(item);
        });
      })
      .catch(function () { dd.innerHTML = '<div class="ua-food-msg">Search failed.</div>'; });
  };

  /* ─────────────────────────────────────────────
   * 12. Sleep / Mood / Energy 헬퍼
   * ───────────────────────────────────────────── */
  window.__uaHealthSleepCalc = function () {
    var bed = document.getElementById('ua-hs-bed');
    var wake = document.getElementById('ua-hs-wake');
    var dur = document.getElementById('ua-hs-dur');
    if (!bed || !wake || !dur) return;
    var b = bed.value, w = wake.value;
    if (!b || !w) { dur.value = ''; return; }
    var bp = b.split(':').map(Number), wp = w.split(':').map(Number);
    var mins = (wp[0] * 60 + wp[1]) - (bp[0] * 60 + bp[1]);
    if (mins < 0) mins += 1440;
    dur.value = Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
  };

  window.__uaHealthSleepQ = function (q) {
    _state._sleepQ = q;
    document.querySelectorAll('[data-q]').forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-q')) === q);
    });
  };

  window.__uaHealthMoodSel = function (m) {
    _state._mood = m;
    document.querySelectorAll('[data-mood]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mood') === m);
    });
  };

  window.__uaHealthEnergySet = function (e) {
    _state._energy = e;
    document.querySelectorAll('[data-energy]').forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-energy')) === e);
    });
  };

  /* ─────────────────────────────────────────────
   * 13. Finance 타입 전환
   * ───────────────────────────────────────────── */
  window.__uaFinType = function (type) {
    _state.finType = type;
    var map = { Income: 'ua-fin-inc', Expenses: 'ua-fin-exp', Savings: 'ua-fin-sav' };
    var cls = { Income: 'ua-active-income', Expenses: 'ua-active-expense', Savings: 'ua-active-saving' };
    Object.keys(map).forEach(function (t) {
      var btn = document.getElementById(map[t]);
      if (btn) btn.className = 'ua-type-btn' + (t === type ? ' ' + cls[t] : '');
    });
    var sel = document.getElementById('ua-fin-cat');
    if (sel) sel.innerHTML = _finCatOpts(type);
  };

  /* ─────────────────────────────────────────────
   * 14. Save 상태 관리
   * ───────────────────────────────────────────── */
  function _setSaveState(loading) {
    var btn = document.getElementById('ua-save-btn');
    var st = document.getElementById('ua-status');
    if (btn) btn.disabled = loading;
    if (st) { st.textContent = loading ? 'Saving…' : ''; st.style.color = '#5f6368'; }
  }

  function _onSuccess(msg) {
    var st = document.getElementById('ua-status');
    if (st) { st.style.color = '#1e8e3e'; st.textContent = '✅ ' + msg; }
    _toast(msg, 'success');
    var pill = _state.pill;
    setTimeout(function () {
      if (pill === 'finance' && typeof window.loadFinanceData === 'function') window.loadFinanceData();
      if (pill === 'task'    && typeof window.loadTasks === 'function') window.loadTasks();
      if (pill === 'event'   && typeof window.cal !== 'undefined' && window.cal && window.cal.refetchEvents) window.cal.refetchEvents();
      if (pill === 'health'  && typeof window.loadHealthTasks === 'function') window.loadHealthTasks();
      _close();
    }, 700);
  }

  function _onError(msg) {
    var st = document.getElementById('ua-status');
    if (st) { st.style.color = '#d93025'; st.textContent = '❌ ' + msg; }
    var btn = document.getElementById('ua-save-btn');
    if (btn) btn.disabled = false;
  }

  /* ─────────────────────────────────────────────
   * 15. 저장 로직
   * ───────────────────────────────────────────── */
  function _save() {
    var pill = _state.pill;
    if (!pill || pill === 'tracker' || pill === 'notes') return;
    _setSaveState(true);
    if (pill === 'event')        _saveEvent();
    else if (pill === 'finance') _saveFinance();
    else if (pill === 'health')  _saveHealth();
    else if (pill === 'task')    _saveTask();
  }

  function _saveEvent() {
    var title = _val('ua-ev-title');
    if (!title) { _onError('Title is required.'); return; }
    var date = _val('ua-ev-date'), time = _val('ua-ev-time');
    var endDate = _val('ua-ev-end-date'), endTime = _val('ua-ev-end-time');
    var start = time ? date + 'T' + time + ':00' : date;
    var end = endDate ? (endTime ? endDate + 'T' + endTime + ':00' : endDate) : null;
    fetch(_backend() + '/api/me/events/create', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarId: _val('ua-ev-cal') || 'primary', title: title, start: start, end: end, location: _val('ua-ev-location') }),
    }).then(function (r) { if (r.ok) _onSuccess('Event added!'); else _onError('Failed to save event.'); })
      .catch(function () { _onError('Network error.'); });
  }

  function _saveFinance() {
    var amount = parseFloat(_val('ua-fin-amount'));
    if (!amount || amount <= 0) { _onError('Enter a valid amount.'); return; }
    fetch(_backend() + '/api/me/finance/transaction', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: _state.finType, amount: amount, category: _val('ua-fin-cat'),
        sublabel: _val('ua-fin-sublabel'), notes: _val('ua-fin-notes'),
        date: _val('ua-fin-date'), createCalendarEvent: false,
      }),
    }).then(function (r) { if (r.ok) _onSuccess('Finance entry saved!'); else _onError('Failed to save.'); })
      .catch(function () { _onError('Network error.'); });
  }

  function _saveHealth() {
    var sub = _state.healthType;
    if (!sub) { _onError('Please select a health category.'); return; }
    var tab, data, apiLegacy;
    if (sub === 'activity') {
      var atype = _val('ua-ha-type');
      if (!atype) { _onError('Activity type is required.'); return; }
      var amet = parseFloat(_val('ua-ha-met')) || null;
      var adur = parseFloat(_val('ua-ha-dur')) || null;
      var acal = parseFloat(_val('ua-ha-cal')) || null;
      if (!acal && amet && adur) acal = Math.round(amet * 70 * adur / 60);
      tab = 'activity';
      data = {
        type: atype, category: 'General', duration_min: adur,
        sets: parseInt(_val('ua-ha-sets')) || null, reps: parseInt(_val('ua-ha-reps')) || null,
        weight_kg: parseFloat(_val('ua-ha-wkg')) || null, met_value: amet,
        calories_burned_kcal: acal, steps: parseInt(_val('ua-ha-steps')) || null,
        distance_km: parseFloat(_val('ua-ha-dist')) || null, notes: _val('ua-ha-notes'),
      };
      apiLegacy = Object.assign({ type: 'activity' }, data);
    } else if (sub === 'food') {
      var fname = _val('ua-hf-name');
      if (!fname) { _onError('Food name is required.'); return; }
      tab = 'food';
      data = {
        meal_time: _val('ua-hf-meal') || 'AM', food_name: fname,
        calories_kcal: parseFloat(_val('ua-hf-cal')) || 0,
        protein_g: parseFloat(_val('ua-hf-pro')) || 0,
        carbs_g: parseFloat(_val('ua-hf-carb')) || 0,
        fat_g: parseFloat(_val('ua-hf-fat')) || 0,
        fiber_g: parseFloat(_val('ua-hf-fiber')) || 0,
        notes: _val('ua-hf-notes'), source: 'Manual',
      };
      apiLegacy = Object.assign({ type: 'food' }, data);
    } else if (sub === 'body') {
      var bw = parseFloat(_val('ua-hb-weight'));
      var bhr = parseFloat(_val('ua-hb-hr'));
      var bsys = parseFloat(_val('ua-hb-bpsys'));
      var bspo = parseFloat(_val('ua-hb-spo2'));
      var bglu = parseFloat(_val('ua-hb-glu'));
      var btemp = parseFloat(_val('ua-hb-temp'));
      if (!bw && !bhr && !bsys && !bspo && !bglu && !btemp) { _onError('Enter at least one value.'); return; }
      tab = 'health';
      data = {
        weight_kg: bw || null, heart_rate_bpm: bhr || null,
        blood_pressure_sys: bsys || null, blood_pressure_dia: parseFloat(_val('ua-hb-bpdia')) || null,
        spo2_pct: bspo || null, glucose_mgdl: bglu || null, temperature_c: btemp || null,
        notes: _val('ua-hb-notes'),
      };
      apiLegacy = Object.assign({ type: 'body' }, data);
    } else if (sub === 'sleep') {
      var sbed = _val('ua-hs-bed'), swake = _val('ua-hs-wake');
      if (!sbed || !swake) { _onError('Bedtime and wake time required.'); return; }
      tab = 'sleep';
      data = { bedtime: sbed, wake_time: swake, quality_1to5: _state._sleepQ || null, notes: _val('ua-hs-notes') };
      apiLegacy = Object.assign({ type: 'sleep' }, data);
    } else if (sub === 'mood') {
      if (!_state._mood) { _onError('Please select a mood.'); return; }
      tab = 'mood';
      data = { mood: _state._mood, energy_level: _state._energy || null, notes: _val('ua-hm-notes') };
      apiLegacy = Object.assign({ type: 'mood' }, data);
    } else {
      _close(); return;
    }
    var B = _backend();
    fetch(B + '/api/me/health', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiLegacy),
    }).catch(function () {});
    fetch(B + '/api/me/health/log', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab: tab, data: data, unit_pref: 'metric' }),
    })
      .then(function (r) { if (r.ok) return r.json(); throw new Error('HTTP ' + r.status); })
      .then(function () { _onSuccess(sub.charAt(0).toUpperCase() + sub.slice(1) + ' logged!'); })
      .catch(function (err) { _onError('Save failed: ' + err.message); });
  }

  function _saveTask() {
    var title = _val('ua-task-title');
    if (!title) { _onError('Title is required.'); return; }
    var due = _val('ua-task-due');
    var payload = { title: title, notes: _val('ua-task-notes'), listId: _val('ua-task-list') || '@default' };
    if (due) payload.due = due + 'T00:00:00.000Z';
    fetch(_backend() + '/api/me/tasks/create', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) { if (r.ok) _onSuccess('Task added!'); else _onError('Failed to save.'); })
      .catch(function () { _onError('Network error.'); });
  }

  /* ─────────────────────────────────────────────
   * 16. 공개 API
   * ───────────────────────────────────────────── */
  window.__uaClose      = _close;
  window.__uaBack       = _goBack;
  window.__uaSelectPill = _selectPill;
  window.__uaSave       = _save;

  window.openUniversalAdd = function (preselect) {
    if (_state.open) { _close(); return; }
    _open(preselect || null);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _prefetch);
  } else {
    _prefetch();
  }
})();
