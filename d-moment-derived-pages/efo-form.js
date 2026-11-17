/*!
 * EFO Form Embed v1.0
 * 使い方:
 *   <div data-efo-form="contact"></div>
 *   <script src="efo-form.js" data-endpoint="https://script.google.com/macros/s/XXXX/exec" defer></script>
 * オプション（data-efo-form の要素に指定）:
 *   data-efo-color="#0b6e4f"   … メインカラー
 *   data-efo-endpoint="..."    … このフォームだけ別の送信先を使う場合
 * イベント:
 *   要素で "efo:submitted" (detail: {formId, id}) を発火。window.dataLayer があれば
 *   {event: 'efo_submit', efo_form_id} を push（個人情報は含めません）。
 */
(function () {
  'use strict';

  var currentScript = document.currentScript;
  var DEFAULT_ENDPOINT = currentScript ? currentScript.getAttribute('data-endpoint') : '';
  var uid = 0;

  /* ---------- スタイル ---------- */
  var CSS = [
    '.efo{--efo-primary:#2a4b8d;--efo-ok:#1f7a4d;--efo-error:#c0362c;--efo-text:#1d2433;--efo-muted:#5d6577;--efo-line:#c9cfdb;--efo-field:#fff;--efo-soft:#f3f5f9;',
    'font-family:inherit;color:var(--efo-text);max-width:640px;line-height:1.7;box-sizing:border-box}',
    '.efo *,.efo *::before,.efo *::after{box-sizing:inherit}',
    '.efo-head h2{font-size:1.4em;margin:0 0 .25em;line-height:1.4}',
    '.efo-head p{margin:0 0 1.25em;color:var(--efo-muted)}',
    /* 進捗：入力中ずっと見える位置に固定 */
    '.efo-progress{position:sticky;top:0;z-index:2;background:var(--efo-field);padding:.75em 0 .6em;margin-bottom:.5em;border-bottom:1px solid var(--efo-line)}',
    '.efo-progress-text{display:flex;justify-content:space-between;align-items:baseline;font-size:.875em;color:var(--efo-muted)}',
    '.efo-progress-text strong{font-size:1.15em;color:var(--efo-text)}',
    '.efo-progress-bar{height:6px;border-radius:3px;background:var(--efo-soft);margin-top:.4em;overflow:hidden}',
    '.efo-progress-bar span{display:block;height:100%;width:0;background:var(--efo-primary);transition:width .3s ease}',
    '.efo-progress.is-done .efo-progress-bar span{background:var(--efo-ok)}',
    '.efo-field{padding:1em 0;border:0;margin:0;min-width:0}',
    '.efo-label{display:flex;align-items:center;gap:.5em;font-weight:700;margin-bottom:.4em;padding:0}',
    '.efo-badge{font-size:.72em;font-weight:700;padding:.1em .55em;border-radius:3px;line-height:1.6;white-space:nowrap}',
    '.efo-badge.req{background:var(--efo-error);color:#fff}',
    '.efo-badge.opt{background:var(--efo-soft);color:var(--efo-muted)}',
    '.efo-check{margin-left:auto;color:var(--efo-ok);font-size:.85em;font-weight:700;opacity:0;transition:opacity .2s}',
    '.efo-field.is-valid .efo-check{opacity:1}',
    '.efo input[type=text],.efo input[type=email],.efo input[type=tel],.efo select,.efo textarea{width:100%;font:inherit;font-size:16px;color:inherit;',
    'background:var(--efo-field);border:1px solid var(--efo-line);border-radius:6px;padding:.7em .8em;min-height:48px;transition:border-color .15s,box-shadow .15s}',
    '.efo textarea{min-height:9em;resize:vertical}',
    '.efo input:focus,.efo select:focus,.efo textarea:focus{outline:none;border-color:var(--efo-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--efo-primary) 22%,transparent)}',
    '.efo-field.is-invalid input,.efo-field.is-invalid select,.efo-field.is-invalid textarea{border-color:var(--efo-error);background:color-mix(in srgb,var(--efo-error) 5%,var(--efo-field))}',
    '.efo-field.is-valid input,.efo-field.is-valid select,.efo-field.is-valid textarea{border-color:var(--efo-ok)}',
    '.efo-zip{display:flex;gap:.6em;align-items:center;flex-wrap:wrap}',
    '.efo-zip input{max-width:11em}',
    '.efo-zip-status{font-size:.85em;color:var(--efo-muted)}',
    '.efo-sub{margin-top:.6em}',
    '.efo-sub label{display:block;font-size:.875em;color:var(--efo-muted);margin-bottom:.25em}',
    '.efo-help{font-size:.85em;color:var(--efo-muted);margin:.35em 0 0}',
    '.efo-msg{font-size:.875em;color:var(--efo-error);margin:.35em 0 0;min-height:0}',
    '.efo-msg:empty{display:none}',
    '.efo-suggest{font-size:.875em;margin:.35em 0 0}',
    '.efo-suggest button{font:inherit;color:var(--efo-primary);background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}',
    '.efo-count{font-size:.8em;color:var(--efo-muted);text-align:right;margin-top:.25em}',
    '.efo-count.is-over{color:var(--efo-error);font-weight:700}',
    '.efo-options{display:grid;gap:.4em}',
    '.efo-option{display:flex;align-items:center;gap:.6em;padding:.6em .8em;border:1px solid var(--efo-line);border-radius:6px;cursor:pointer;background:var(--efo-field);min-height:48px}',
    '.efo-option:has(input:checked){border-color:var(--efo-primary);background:color-mix(in srgb,var(--efo-primary) 6%,var(--efo-field))}',
    '.efo-option:has(input:focus-visible){outline:2px solid var(--efo-primary);outline-offset:2px}',
    '.efo-option input{width:1.2em;height:1.2em;margin:0;accent-color:var(--efo-primary);flex:none}',
    '.efo-consent a{color:var(--efo-primary)}',
    '.efo-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}',
    '.efo-actions{padding-top:1.25em}',
    '.efo-submit{display:block;width:100%;font:inherit;font-weight:700;font-size:1.05em;padding:.95em 1em;border:0;border-radius:6px;cursor:pointer;',
    'background:var(--efo-primary);color:#fff;transition:background .2s,opacity .2s}',
    '.efo-submit.is-pending{background:var(--efo-muted)}',
    '.efo-submit:focus-visible{outline:3px solid var(--efo-text);outline-offset:2px}',
    '.efo-submit[disabled]{opacity:.7;cursor:progress}',
    '.efo-alert{margin-top:.8em;padding:.75em 1em;border-radius:6px;background:color-mix(in srgb,var(--efo-error) 8%,var(--efo-field));color:var(--efo-error);font-size:.9em}',
    '.efo-alert:empty{display:none}',
    '.efo-thanks{padding:2em 1.5em;border:1px solid var(--efo-ok);border-radius:8px;text-align:center}',
    '.efo-thanks h2{font-size:1.3em;margin:0 0 .5em;color:var(--efo-ok)}',
    '.efo-thanks p{margin:.3em 0}',
    '.efo-thanks .efo-id{font-size:.85em;color:var(--efo-muted)}',
    '.efo-loading,.efo-error-box{padding:1.5em;color:var(--efo-muted)}',
    '@media (prefers-reduced-motion:reduce){.efo *{transition:none!important}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('efo-form-style')) return;
    var s = document.createElement('style');
    s.id = 'efo-form-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- ユーティリティ ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function toHalf(s) {
    return String(s)
      .replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/\u3000/g, ' ')
      .replace(/[ー－―‐−]/g, '-');
  }
  function digits(s) { return toHalf(s).replace(/\D/g, ''); }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var DOMAIN_FIX = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmali.com': 'gmail.com',
    'yahoo.co.jo': 'yahoo.co.jp', 'yahoo.cojp': 'yahoo.co.jp', 'yaho.co.jp': 'yahoo.co.jp',
    'docomo.ne.co': 'docomo.ne.jp', 'ezweb.ne.co': 'ezweb.ne.jp', 'icloud.co': 'icloud.com',
    'outlook.co': 'outlook.com', 'hotmail.co': 'hotmail.com'
  };

  /* ---------- 通信 ---------- */
  function createApi(endpoint) {
    if (endpoint === 'mock') return mockApi();
    function getJson(url) {
      return fetch(url, { credentials: 'omit' }).then(function (r) { return r.json(); });
    }
    return {
      schema: function (id) { return getJson(endpoint + '?formId=' + encodeURIComponent(id)); },
      zip: function (zip) { return getJson(endpoint + '?action=zip&zipcode=' + encodeURIComponent(zip)); },
      // Content-Type を付けない（text/plain）ことで CORS のプリフライトを回避
      submit: function (payload) {
        return fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), credentials: 'omit' }).then(function (r) { return r.json(); });
      }
    };
  }

  function mockApi() {
    var wait = function (ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); };
    var forms = window.EFO_MOCK_FORMS || {};
    var zips = window.EFO_MOCK_ZIPS || {};
    return {
      schema: function (id) { return wait(150, forms[id] ? { ok: true, form: forms[id] } : { ok: false, message: 'フォームが見つかりません。' }); },
      zip: function (zip) { return wait(250, zips[zip] ? Object.assign({ ok: true }, zips[zip]) : { ok: false }); },
      submit: function (payload) {
        console.info('[EFO mock] 送信データ', payload);
        return wait(700, { ok: true, id: 'MOCK-' + Math.random().toString(36).slice(2, 8).toUpperCase() });
      }
    };
  }

  /* ---------- フォーム本体 ---------- */
  function EfoForm(root) {
    this.root = root;
    this.formId = root.getAttribute('data-efo-form');
    this.api = createApi(root.getAttribute('data-efo-endpoint') || DEFAULT_ENDPOINT);
    this.uid = 'efo' + (++uid);
    this.fields = [];
    this.byName = {};
    this.dirty = false;
    this.done = false;
    this.sending = false;
  }

  EfoForm.prototype.load = function () {
    var self = this;
    var color = this.root.getAttribute('data-efo-color');
    this.root.classList.add('efo');
    if (color && /^#[0-9a-f]{3,8}$/i.test(color)) this.root.style.setProperty('--efo-primary', color);
    this.root.replaceChildren(el('div', { class: 'efo-loading', text: 'フォームを読み込んでいます…' }));

    this.api.schema(this.formId).then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.message);
      self.schema = res.form;
      self.render();
    }).catch(function (err) {
      console.error('[EFO]', err);
      self.root.replaceChildren(el('div', { class: 'efo-error-box', role: 'alert',
        text: 'フォームを表示できませんでした。ページを再読み込みしてください。' }));
    });
  };

  EfoForm.prototype.render = function () {
    var self = this, s = this.schema;
    this.startedAt = Date.now();

    var head = el('div', { class: 'efo-head' }, [
      s.title ? el('h2', { text: s.title }) : null,
      s.description ? el('p', { text: s.description }) : null
    ]);

    this.progressText = el('strong');
    this.progressBar = el('span');
    this.progress = el('div', { class: 'efo-progress', 'aria-live': 'polite' }, [
      el('div', { class: 'efo-progress-text' }, [el('span', { text: '必須項目' }), this.progressText]),
      el('div', { class: 'efo-progress-bar', 'aria-hidden': 'true' }, [this.progressBar])
    ]);

    this.form = el('form', { novalidate: true, 'aria-label': s.title || 'フォーム' });
    this.form.appendChild(this.progress);
    s.fields.forEach(function (f) {
      var fld = self.buildField(f);
      self.fields.push(fld);
      self.byName[f.name] = fld;
      self.form.appendChild(fld.wrap);
    });

    // ハニーポット（人には見えない入力欄）
    this.hp = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' });
    this.form.appendChild(el('div', { class: 'efo-hp', 'aria-hidden': 'true' }, [el('label', { text: 'Website' }, [this.hp])]));

    this.submitBtn = el('button', { type: 'submit', class: 'efo-submit' });
    this.alert = el('div', { class: 'efo-alert', role: 'alert' });
    this.form.appendChild(el('div', { class: 'efo-actions' }, [this.submitBtn, this.alert]));

    this.form.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
    this.form.addEventListener('input', function () { self.dirty = true; self.updateProgress(); });
    this.form.addEventListener('change', function () { self.dirty = true; self.updateProgress(); });

    window.addEventListener('beforeunload', function (e) {
      if (self.dirty && !self.done) { e.preventDefault(); e.returnValue = ''; }
    });

    this.root.replaceChildren(head, this.form);
    this.updateProgress();
  };

  /* ---------- 項目生成 ---------- */
  EfoForm.prototype.buildField = function (f) {
    var self = this;
    var id = this.uid + '-' + f.name;
    var group = f.type === 'radio' || f.type === 'checkbox' || f.type === 'consent';
    var fld = { def: f, touched: false, inputs: [] };

    var msg = el('p', { class: 'efo-msg', id: id + '-msg' });
    var help = f.help ? el('p', { class: 'efo-help', id: id + '-help', text: f.help }) : null;
    var describedBy = [help ? id + '-help' : '', id + '-msg'].join(' ').trim();

    var labelChildren = [
      f.label,
      el('span', { class: 'efo-badge ' + (f.required ? 'req' : 'opt'), text: f.required ? '必須' : '任意' }),
      el('span', { class: 'efo-check', 'aria-hidden': 'true', text: '✓ OK' })
    ];
    var label = group ? el('legend', { class: 'efo-label' }, labelChildren) : el('label', { class: 'efo-label', for: id }, labelChildren);
    var wrap = el(group ? 'fieldset' : 'div', { class: 'efo-field', 'data-name': f.name });
    wrap.appendChild(label);

    var common = { id: id, name: f.name, 'aria-describedby': describedBy, 'aria-required': f.required ? 'true' : null };
    var control;

    switch (f.type) {
      case 'textarea': {
        control = el('textarea', Object.assign({ placeholder: f.placeholder, rows: '6' }, common));
        fld.inputs.push(control);
        wrap.appendChild(control);
        var max = f.maxLength || 5000;
        fld.counter = el('div', { class: 'efo-count', 'aria-live': 'polite' });
        wrap.appendChild(fld.counter);
        var upd = function () {
          var n = control.value.length;
          fld.counter.textContent = n + ' / ' + max + '文字';
          fld.counter.classList.toggle('is-over', n > max);
        };
        control.addEventListener('input', upd); upd();
        break;
      }
      case 'select': {
        control = el('select', Object.assign({ autocomplete: f.autocomplete }, common),
          [el('option', { value: '', text: '選択してください' })].concat(f.options.map(function (o) { return el('option', { value: o, text: o }); })));
        fld.inputs.push(control);
        wrap.appendChild(control);
        break;
      }
      case 'radio':
      case 'checkbox': {
        var box = el('div', { class: 'efo-options', 'aria-describedby': describedBy });
        f.options.forEach(function (o, i) {
          var inp = el('input', { type: f.type, name: f.name, value: o, id: id + '-' + i });
          fld.inputs.push(inp);
          box.appendChild(el('label', { class: 'efo-option', for: id + '-' + i }, [inp, el('span', { text: o })]));
        });
        wrap.appendChild(box);
        break;
      }
      case 'consent': {
        var cb = el('input', { type: 'checkbox', name: f.name, id: id, 'aria-describedby': describedBy });
        fld.inputs.push(cb);
        var text = el('span', { class: 'efo-consent' });
        if (f.linkUrl) {
          text.appendChild(el('a', { href: f.linkUrl, target: '_blank', rel: 'noopener noreferrer', text: f.linkText || '規約' }));
          text.appendChild(document.createTextNode('に同意する'));
        } else {
          text.textContent = '同意する';
        }
        wrap.appendChild(el('div', { class: 'efo-options' }, [el('label', { class: 'efo-option', for: id }, [cb, text])]));
        break;
      }
      default: {
        var t = { text: 'text', email: 'email', tel: 'tel', zip: 'text' }[f.type] || 'text';
        var attrs = Object.assign({ type: t, placeholder: f.placeholder, maxlength: f.type === 'zip' ? '8' : null }, common);
        if (f.type === 'email') Object.assign(attrs, { inputmode: 'email', autocomplete: f.autocomplete || 'email', autocapitalize: 'off', spellcheck: 'false' });
        else if (f.type === 'tel') Object.assign(attrs, { inputmode: 'tel', autocomplete: f.autocomplete || 'tel' });
        else if (f.type === 'zip') Object.assign(attrs, { inputmode: 'numeric', autocomplete: f.autocomplete || 'postal-code' });
        else attrs.autocomplete = f.autocomplete || null;
        control = el('input', attrs);
        fld.inputs.push(control);

        if (f.type === 'zip') {
          fld.zipStatus = el('span', { class: 'efo-zip-status', 'aria-live': 'polite' });
          wrap.appendChild(el('div', { class: 'efo-zip' }, [control, fld.zipStatus]));
          this.bindZip(fld, control);
        } else {
          wrap.appendChild(control);
        }

        if (f.type === 'email') {
          fld.suggest = el('p', { class: 'efo-suggest', 'aria-live': 'polite' });
          wrap.appendChild(fld.suggest);
          if (f.confirm) {
            fld.confirmInput = el('input', { type: 'email', id: id + '-confirm', name: f.name + '__confirm', inputmode: 'email',
              autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '確認のためもう一度入力してください',
              'aria-describedby': id + '-msg' });
            wrap.appendChild(el('div', { class: 'efo-sub' }, [el('label', { for: id + '-confirm', text: '確認用' }), fld.confirmInput]));
            fld.inputs.push(fld.confirmInput);
          }
        }
      }
    }

    if (help) wrap.appendChild(help);
    wrap.appendChild(msg);
    fld.wrap = wrap;
    fld.msg = msg;

    // 離脱時に検証・整形、以降は入力のたびに再検証
    fld.inputs.forEach(function (inp) {
      inp.addEventListener('blur', function () {
        // 同じ項目内（確認欄・選択肢）を移動中は検証しない
        setTimeout(function () {
          if (fld.wrap.contains(document.activeElement)) return;
          self.normalizeView(fld);
          fld.touched = true;
          self.check(fld, true);
        }, 0);
      });
      var ev = (inp.type === 'checkbox' || inp.type === 'radio' || inp.tagName === 'SELECT') ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        if (ev === 'change') fld.touched = true;
        if (fld.touched) self.check(fld, true);
        if (f.type === 'email') self.suggestEmail(fld);
      });
    });

    return fld;
  };

  /* 全角→半角などの表示上の整形（離脱時のみ。入力中はIMEを妨げない） */
  EfoForm.prototype.normalizeView = function (fld) {
    var f = fld.def, inp = fld.inputs[0];
    if (f.type === 'email') {
      inp.value = toHalf(inp.value).replace(/\s/g, '');
      if (fld.confirmInput) fld.confirmInput.value = toHalf(fld.confirmInput.value).replace(/\s/g, '');
    } else if (f.type === 'tel') {
      inp.value = toHalf(inp.value).replace(/[^\d-]/g, '');
    } else if (f.type === 'zip') {
      var d = digits(inp.value);
      inp.value = d.length === 7 ? d.slice(0, 3) + '-' + d.slice(3) : toHalf(inp.value).trim();
    }
  };

  EfoForm.prototype.value = function (fld) {
    var f = fld.def;
    switch (f.type) {
      case 'radio': {
        var c = fld.inputs.filter(function (i) { return i.checked; })[0];
        return c ? c.value : '';
      }
      case 'checkbox': return fld.inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      case 'consent': return fld.inputs[0].checked;
      case 'email': return toHalf(fld.inputs[0].value).replace(/\s/g, '');
      case 'tel':
      case 'zip': return digits(fld.inputs[0].value);
      default: return fld.inputs[0].value.trim();
    }
  };

  /* 検証（サーバー側の validate_ と同じルール） */
  EfoForm.prototype.validate = function (fld) {
    var f = fld.def, v = this.value(fld);
    if (f.type === 'checkbox') return f.required && !v.length ? '1つ以上選択してください。' : '';
    if (f.type === 'consent') return f.required && !v ? '同意いただく必要があります。' : '';
    if (!v) return f.required ? ((f.type === 'select' || f.type === 'radio') ? '選択してください。' : '入力してください。') : '';
    var max = f.maxLength || (f.type === 'textarea' ? 5000 : 200);
    if (v.length > max) return max + '文字以内で入力してください。';
    if (f.type === 'email') {
      if (!EMAIL_RE.test(v)) return 'メールアドレスの形式で入力してください（例: taro@example.com）。';
      if (fld.confirmInput) {
        var c = toHalf(fld.confirmInput.value).replace(/\s/g, '');
        if (!c) return '確認用のメールアドレスも入力してください。';
        if (c !== v) return '確認用メールアドレスと一致しません。';
      }
    }
    if (f.type === 'tel' && !/^0\d{9,10}$/.test(v)) return '電話番号は0から始まる10〜11桁で入力してください。';
    if (f.type === 'zip' && !/^\d{7}$/.test(v)) return '郵便番号は7桁で入力してください。';
    return '';
  };

  EfoForm.prototype.check = function (fld, show) {
    var err = this.validate(fld);
    if (show) {
      var hasValue = (function (v) { return Array.isArray(v) ? v.length > 0 : !!v; })(this.value(fld));
      fld.msg.textContent = err;
      fld.wrap.classList.toggle('is-invalid', !!err);
      fld.wrap.classList.toggle('is-valid', !err && hasValue);
      fld.inputs.forEach(function (i) { i.setAttribute('aria-invalid', err ? 'true' : 'false'); });
    }
    return !err;
  };

  /* メールドメインのタイプミス候補 */
  EfoForm.prototype.suggestEmail = function (fld) {
    var self = this;
    var v = toHalf(fld.inputs[0].value).replace(/\s/g, '');
    var at = v.lastIndexOf('@');
    fld.suggest.replaceChildren();
    if (at < 1) return;
    var fix = DOMAIN_FIX[v.slice(at + 1).toLowerCase()];
    if (!fix) return;
    var fixed = v.slice(0, at + 1) + fix;
    var btn = el('button', { type: 'button', text: fixed });
    btn.addEventListener('click', function () {
      fld.inputs[0].value = fixed;
      fld.suggest.replaceChildren();
      fld.touched = true;
      self.check(fld, true);
      self.updateProgress();
      fld.inputs[0].focus();
    });
    fld.suggest.append('もしかして ', btn, ' ですか？');
  };

  /* 郵便番号→住所の自動入力 */
  EfoForm.prototype.bindZip = function (fld, input) {
    var self = this, last = '', timer;
    var run = function () {
      var z = digits(input.value);
      if (z.length !== 7 || z === last) return;
      last = z;
      var target = fld.def.addressTarget || {};
      fld.zipStatus.textContent = '住所を検索中…';
      self.api.zip(z).then(function (r) {
        if (digits(input.value) !== z) return; // 検索中に書き換えられた
        if (!r || !r.ok) { fld.zipStatus.textContent = '該当する住所が見つかりませんでした'; return; }
        fld.zipStatus.textContent = '住所を自動入力しました';
        var pref = self.byName[target.pref], addr = self.byName[target.address];
        if (pref && pref.inputs[0].tagName === 'SELECT') {
          pref.inputs[0].value = r.pref;
          pref.touched = true; self.check(pref, true);
        }
        if (addr) {
          var a = addr.inputs[0];
          // 利用者が手入力した住所は上書きしない
          if (!a.value || a.dataset.efoAuto === a.value) {
            var text = (pref ? '' : r.pref) + r.city + r.town;
            a.value = text;
            a.dataset.efoAuto = text;
          }
          addr.touched = true; self.check(addr, true);
          // 番地を続けて入力できるよう住所欄の末尾へカーソル移動
          a.focus();
          try { a.setSelectionRange(a.value.length, a.value.length); } catch (_) { /* noop */ }
        }
        self.updateProgress();
      }).catch(function () {
        last = '';
        fld.zipStatus.textContent = '住所を検索できませんでした。手入力してください';
      });
    };
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 250); });
    input.addEventListener('compositionend', function () { clearTimeout(timer); timer = setTimeout(run, 50); });
  };

  /* 進捗表示と送信ボタンの状態 */
  EfoForm.prototype.updateProgress = function () {
    var self = this;
    var req = this.fields.filter(function (f) { return f.def.required; });
    var ok = req.filter(function (f) { return self.check(f, false); }).length;
    var left = req.length - ok;
    var allOk = this.fields.every(function (f) { return self.check(f, false); });

    this.progressText.textContent = left ? 'あと' + left + '項目' : 'すべて入力済み';
    this.progressBar.style.width = (req.length ? Math.round(ok / req.length * 100) : 100) + '%';
    this.progress.classList.toggle('is-done', !left);

    if (!this.sending) {
      this.submitBtn.textContent = allOk ? (this.schema.submitLabel || '送信する') :
        (left ? '必須項目をあと' + left + 'つ入力してください' : '入力内容をご確認ください');
      this.submitBtn.classList.toggle('is-pending', !allOk);
    }
  };

  EfoForm.prototype.focusFirstError = function () {
    var first = this.fields.filter(function (f) { return f.wrap.classList.contains('is-invalid'); })[0];
    if (!first) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    first.wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    first.inputs[0].focus({ preventScroll: true });
  };

  /* 送信 */
  EfoForm.prototype.submit = function () {
    var self = this;
    if (this.sending) return;
    this.alert.textContent = '';

    var valid = true;
    this.fields.forEach(function (f) { f.touched = true; if (!self.check(f, true)) valid = false; });
    if (!valid) { this.updateProgress(); this.focusFirstError(); return; }

    var data = {};
    this.fields.forEach(function (f) {
      data[f.def.name] = self.value(f);
      if (f.confirmInput) data[f.def.name + '__confirm'] = toHalf(f.confirmInput.value).replace(/\s/g, '');
    });

    this.sending = true;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = '送信しています…';

    this.api.submit({ formId: this.formId, data: data, _hp: this.hp.value, _t: Date.now() - this.startedAt })
      .then(function (res) {
        if (res && res.ok) return self.finish(res.id);
        if (res && res.errors) {
          Object.keys(res.errors).forEach(function (name) {
            var f = self.byName[name];
            if (!f) return;
            f.msg.textContent = res.errors[name];
            f.wrap.classList.add('is-invalid');
            f.wrap.classList.remove('is-valid');
          });
          self.focusFirstError();
        }
        self.alert.textContent = (res && res.message) || '送信できませんでした。時間をおいて再度お試しください。';
      })
      .catch(function (err) {
        console.error('[EFO]', err);
        self.alert.textContent = '通信できませんでした。接続を確認して、もう一度「送信する」を押してください。入力内容は保持されています。';
      })
      .then(function () {
        if (self.done) return;
        self.sending = false;
        self.submitBtn.disabled = false;
        self.updateProgress();
      });
  };

  EfoForm.prototype.finish = function (id) {
    var s = this.schema;
    this.done = true;
    var box = el('div', { class: 'efo-thanks', tabindex: '-1', role: 'status' }, [
      el('h2', { text: s.thanksTitle || '送信が完了しました' }),
      s.thanksMessage ? el('p', { text: s.thanksMessage }) : null,
      id && id !== '-' ? el('p', { class: 'efo-id', text: '受付番号: ' + id }) : null
    ]);
    this.root.replaceChildren(box);
    box.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'center' });

    this.root.dispatchEvent(new CustomEvent('efo:submitted', { bubbles: true, detail: { formId: this.formId, id: id } }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'efo_submit', efo_form_id: this.formId });
  };

  /* ---------- 起動 ---------- */
  function init() {
    injectStyle();
    document.querySelectorAll('[data-efo-form]').forEach(function (root) {
      if (root.__efo) return;
      root.__efo = new EfoForm(root);
      root.__efo.load();
    });
  }

  window.EfoForm = { init: init }; // 動的に要素を追加した場合は EfoForm.init() を呼ぶ
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
