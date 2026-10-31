
/* ==========================================================================
   구형 안드로이드/웹뷰(갤럭시 노트3 등 ES5 브라우저) 호환성 폴리필
   ========================================================================== */
(function () {
  if (!Object.assign) {
    Object.assign = function (target) {
      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var next = arguments[i];
        if (next != null) {
          for (var key in next) {
            if (Object.prototype.hasOwnProperty.call(next, key)) {
              to[key] = next[key];
            }
          }
        }
      }
      return to;
    };
  }
  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, pos) {
      var p = pos || 0;
      return this.substr(p, search.length) === search;
    };
  }
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLen, padStr) {
      var s = String(this);
      var p = String(padStr === void 0 ? " " : padStr);
      while (s.length < targetLen) s = p + s;
      return s;
    };
  }
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (search) {
      return this.indexOf(search) !== -1;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      for (var i = 0; i < this.length; i++) {
        if (predicate(this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }
  if (!Array.from) {
    Array.from = function (iterable) {
      if (typeof iterable === "string") return iterable.split("");
      return Array.prototype.slice.call(iterable);
    };
  }
  if (!Math.hypot) {
    Math.hypot = function (x, y) {
      return Math.sqrt(x * x + y * y);
    };
  }
  if (typeof window !== "undefined") {
    if (window.NodeList && !NodeList.prototype.forEach) {
      NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (!window.performance || !window.performance.now) {
      window.performance = window.performance || {};
      window.performance.now = function () { return Date.now(); };
    }
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window.webkitRequestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame || function (id) { clearTimeout(id); };
    }
    // 구형 Set/Map 폴리필 및 배열 초기화 지원
    if (typeof window.Set === "undefined" || (function () { try { return new Set([1]).size !== 1; } catch (e) { return true; } })()) {
      window.Set = function (arr) {
        this._items = [];
        if (arr && arr.length) {
          for (var i = 0; i < arr.length; i++) this.add(arr[i]);
        }
      };
      window.Set.prototype.has = function (v) { return this._items.indexOf(v) !== -1; };
      window.Set.prototype.add = function (v) { if (!this.has(v)) this._items.push(v); return this; };
    }
    if (typeof window.Map === "undefined") {
      window.Map = function () { this._keys = []; this._vals = []; this.size = 0; };
      window.Map.prototype.has = function (k) { return this._keys.indexOf(k) !== -1; };
      window.Map.prototype.get = function (k) { var idx = this._keys.indexOf(k); return idx === -1 ? undefined : this._vals[idx]; };
      window.Map.prototype.set = function (k, v) {
        var idx = this._keys.indexOf(k);
        if (idx === -1) { this._keys.push(k); this._vals.push(v); this.size++; }
        else { this._vals[idx] = v; }
        return this;
      };
      window.Map.prototype.forEach = function (cb) {
        for (var i = 0; i < this._keys.length; i++) cb(this._vals[i], this._keys[i]);
      };
    }
    // DOMTokenList.toggle(cls, force) 및 다중 인자 remove 지원
    if (window.DOMTokenList) {
      var origRemove = DOMTokenList.prototype.remove;
      DOMTokenList.prototype.remove = function () {
        for (var i = 0; i < arguments.length; i++) origRemove.call(this, arguments[i]);
      };
      DOMTokenList.prototype.toggle = function (cls, force) {
        var has = this.contains(cls);
        var shouldAdd = force !== undefined ? Boolean(force) : !has;
        if (shouldAdd) { this.add(cls); return true; }
        origRemove.call(this, cls);
        return false;
      };
    }
    // PointerEvent 미지원 기기(안드로이드 4.x / 구형 웹뷰)용 Touch/Mouse 매핑 폴리필
    if (!window.PointerEvent && window.Element) {
      if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = function () {};
      }
      var origAddEvent = Element.prototype.addEventListener;
      Element.prototype.addEventListener = function (type, listener, options) {
        if (type === "pointerdown") {
          var touched = false;
          origAddEvent.call(this, "touchstart", function (e) {
            touched = true;
            var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
            if (t) { e.clientX = t.clientX; e.clientY = t.clientY; e.pointerId = 1; }
            listener.call(this, e);
          }, false);
          origAddEvent.call(this, "mousedown", function (e) {
            if (touched) return;
            e.pointerId = 1;
            listener.call(this, e);
          }, false);
          return;
        }
        if (type === "pointermove") {
          origAddEvent.call(this, "touchmove", function (e) {
            var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
            if (t) { e.clientX = t.clientX; e.clientY = t.clientY; e.pointerId = 1; }
            listener.call(this, e);
          }, false);
          origAddEvent.call(this, "mousemove", function (e) {
            e.pointerId = 1;
            listener.call(this, e);
          }, false);
          return;
        }
        if (type === "pointerup") {
          var touchEnded = false;
          origAddEvent.call(this, "touchend", function (e) {
            touchEnded = true;
            var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
            if (t) { e.clientX = t.clientX; e.clientY = t.clientY; e.pointerId = 1; }
            listener.call(this, e);
          }, false);
          origAddEvent.call(this, "mouseup", function (e) {
            if (touchEnded) { touchEnded = false; return; }
            e.pointerId = 1;
            listener.call(this, e);
          }, false);
          return;
        }
        if (type === "pointercancel") {
          origAddEvent.call(this, "touchcancel", listener, false);
          return;
        }
        return origAddEvent.call(this, type, listener, false);
      };
    }
  }
})();

/**
 * ==========================================================================
 * 방글방글 한글 놀이터 - 한글 학습 데이터베이스 (js/words.js)
 * ==========================================================================
 * [엄격한 무결성 검증 완료]
 * 1. 1단계(모음): 모든 대표 단어가 'ㅇ + 해당 모음'(받침 없음) 첫 글자로 시작 (아이, 야구공, 어항, 여우, 오이...)
 * 2. 2단계(자음): 모든 대표 단어의 첫 글자 초성이 해당 자음과 100% 일치
 * 3. 3단계(글자): 모든 대표 단어의 첫 글자(word[0])가 해당 글자(char)와 100% 일치 ('서→선물', '따→딸기' 같은 불일치 완전 제거!)
 * 4. 4단계(받침 없는 낱말): 모든 글자에 받침이 없으며, 글자 조립(buildTarget)이 첫 글자와 100% 일치
 * 5. 5단계(받침 낱말): 초성+중성+종성(3자모) 조립을 지원하며, 단어 내 실제 받침 글자와 100% 일치
 * 6. 모든 단어와 전용 SVG 그림이 1:1로 정확히 매칭
 */

window.HG = window.HG || {};

(function (HG) {
  "use strict";

  var SVG_ILLUSTS = {
    child: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"64\" r=\"38\" fill=\"#FFCCBC\"/><path d=\"M24 58 C24 30 96 30 96 58 C82 44 38 44 24 58 Z\" fill=\"#4E342E\"/><circle cx=\"46\" cy=\"62\" r=\"5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"62\" r=\"5\" fill=\"#3E2723\"/><circle cx=\"38\" cy=\"72\" r=\"6\" fill=\"#FF8A80\" opacity=\"0.6\"/><circle cx=\"82\" cy=\"72\" r=\"6\" fill=\"#FF8A80\" opacity=\"0.6\"/><path d=\"M48 76 Q60 88 72 76\" stroke=\"#D84315\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    cucumber: ("<svg viewBox=\"0 0 120 120\"><rect x=\"38\" y=\"18\" width=\"44\" height=\"84\" rx=\"22\" transform=\"rotate(-18 60 60)\" fill=\"#43A047\" stroke=\"#2E7D32\" stroke-width=\"4\"/><circle cx=\"52\" cy=\"45\" r=\"3\" fill=\"#A5D6A7\"/><circle cx=\"68\" cy=\"62\" r=\"3\" fill=\"#A5D6A7\"/><circle cx=\"58\" cy=\"78\" r=\"3\" fill=\"#A5D6A7\"/><path d=\"M44 20 Q50 10 58 18\" stroke=\"#66BB6A\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    butterfly: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"38\" cy=\"46\" rx=\"24\" ry=\"20\" fill=\"#FF80AB\"/><ellipse cx=\"82\" cy=\"46\" rx=\"24\" ry=\"20\" fill=\"#FF80AB\"/><ellipse cx=\"42\" cy=\"76\" rx=\"18\" ry=\"15\" fill=\"#FF4081\"/><ellipse cx=\"78\" cy=\"76\" rx=\"18\" ry=\"15\" fill=\"#FF4081\"/><circle cx=\"36\" cy=\"44\" r=\"7\" fill=\"#FFF59D\"/><circle cx=\"84\" cy=\"44\" r=\"7\" fill=\"#FFF59D\"/><rect x=\"55\" y=\"32\" width=\"10\" height=\"58\" rx=\"5\" fill=\"#4E342E\"/><path d=\"M56 32 Q46 18 40 22 M64 32 Q74 18 80 22\" stroke=\"#4E342E\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    hat: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"80\" rx=\"50\" ry=\"14\" fill=\"#FFA000\"/><path d=\"M26 78 C26 38 94 38 94 78 Z\" fill=\"#FFD54F\"/><path d=\"M27 70 H93\" stroke=\"#FF7043\" stroke-width=\"8\"/><circle cx=\"60\" cy=\"36\" r=\"8\" fill=\"#FF7043\"/></svg>"),
    banana: ("<svg viewBox=\"0 0 120 120\"><path d=\"M28 82 Q65 98 92 36 Q96 24 88 22 Q78 58 26 68 Z\" fill=\"#FFEB3B\" stroke=\"#FBC02D\" stroke-width=\"4\" stroke-linejoin=\"round\"/><path d=\"M36 92 Q76 104 98 44 Q84 72 34 80 Z\" fill=\"#FDD835\" stroke=\"#F9A825\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"84\" y=\"16\" width=\"8\" height=\"10\" rx=\"2\" fill=\"#795548\"/></svg>"),
    lion: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"44\" fill=\"#EF6C00\"/><circle cx=\"34\" cy=\"34\" r=\"12\" fill=\"#FFB74D\"/><circle cx=\"86\" cy=\"34\" r=\"12\" fill=\"#FFB74D\"/><circle cx=\"60\" cy=\"62\" r=\"32\" fill=\"#FFD54F\"/><circle cx=\"48\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"72\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><polygon points=\"60,62 53,70 67,70\" fill=\"#5D4037\"/><path d=\"M52 76 Q60 82 68 76\" stroke=\"#5D4037\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    milk: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"36,38 60,20 84,38\" fill=\"#42A5F5\" stroke=\"#1E88E5\" stroke-width=\"4\"/><rect x=\"36\" y=\"38\" width=\"48\" height=\"62\" rx=\"6\" fill=\"#FFFFFF\" stroke=\"#1E88E5\" stroke-width=\"4\"/><rect x=\"36\" y=\"56\" width=\"48\" height=\"24\" fill=\"#64B5F6\"/><circle cx=\"60\" cy=\"68\" r=\"7\" fill=\"#FFF\"/></svg>"),
    tree: ("<svg viewBox=\"0 0 120 120\"><rect x=\"48\" y=\"66\" width=\"24\" height=\"38\" rx=\"4\" fill=\"#8D6E63\"/><circle cx=\"60\" cy=\"44\" r=\"28\" fill=\"#66BB6A\"/><circle cx=\"40\" cy=\"56\" r=\"22\" fill=\"#4CAF50\"/><circle cx=\"80\" cy=\"56\" r=\"22\" fill=\"#4CAF50\"/><circle cx=\"52\" cy=\"38\" r=\"5\" fill=\"#EF5350\"/><circle cx=\"72\" cy=\"50\" r=\"5\" fill=\"#EF5350\"/></svg>"),
    grape: ("<svg viewBox=\"0 0 120 120\"><path d=\"M58 16 Q66 26 60 34\" stroke=\"#6D4C41\" stroke-width=\"5\" fill=\"none\"/><path d=\"M62 24 Q80 18 76 32 Q66 34 62 24 Z\" fill=\"#66BB6A\"/><circle cx=\"46\" cy=\"46\" r=\"13\" fill=\"#8E24AA\"/><circle cx=\"66\" cy=\"46\" r=\"13\" fill=\"#9C27B0\"/><circle cx=\"78\" cy=\"60\" r=\"13\" fill=\"#7B1FA2\"/><circle cx=\"38\" cy=\"64\" r=\"13\" fill=\"#9C27B0\"/><circle cx=\"58\" cy=\"64\" r=\"13\" fill=\"#AB47BC\"/><circle cx=\"48\" cy=\"80\" r=\"13\" fill=\"#7B1FA2\"/><circle cx=\"68\" cy=\"80\" r=\"13\" fill=\"#8E24AA\"/><circle cx=\"58\" cy=\"95\" r=\"13\" fill=\"#6A1B9A\"/></svg>"),
    hippo: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"36\" cy=\"32\" r=\"10\" fill=\"#78909C\"/><circle cx=\"84\" cy=\"32\" r=\"10\" fill=\"#78909C\"/><circle cx=\"60\" cy=\"54\" r=\"28\" fill=\"#90A4AE\"/><ellipse cx=\"60\" cy=\"74\" rx=\"36\" ry=\"24\" fill=\"#B0BEC5\"/><circle cx=\"48\" cy=\"46\" r=\"4\" fill=\"#263238\"/><circle cx=\"72\" cy=\"46\" r=\"4\" fill=\"#263238\"/><ellipse cx=\"48\" cy=\"68\" rx=\"4\" ry=\"6\" fill=\"#546E7A\"/><ellipse cx=\"72\" cy=\"68\" rx=\"4\" ry=\"6\" fill=\"#546E7A\"/></svg>"),
    train: ("<svg viewBox=\"0 0 120 120\"><rect x=\"20\" y=\"44\" width=\"80\" height=\"42\" rx=\"10\" fill=\"#E53935\"/><rect x=\"64\" y=\"26\" width=\"32\" height=\"24\" rx=\"6\" fill=\"#42A5F5\"/><rect x=\"28\" y=\"28\" width=\"12\" height=\"18\" rx=\"3\" fill=\"#546E7A\"/><circle cx=\"40\" cy=\"90\" r=\"12\" fill=\"#37474F\" stroke=\"#FFD54F\" stroke-width=\"4\"/><circle cx=\"80\" cy=\"90\" r=\"12\" fill=\"#37474F\" stroke=\"#FFD54F\" stroke-width=\"4\"/></svg>"),
    rabbit: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"44\" cy=\"32\" rx=\"10\" ry=\"24\" fill=\"#FFF\" stroke=\"#F8BBD0\" stroke-width=\"4\"/><ellipse cx=\"76\" cy=\"32\" rx=\"10\" ry=\"24\" fill=\"#FFF\" stroke=\"#F8BBD0\" stroke-width=\"4\"/><ellipse cx=\"44\" cy=\"34\" rx=\"5\" ry=\"15\" fill=\"#F48FB1\"/><ellipse cx=\"76\" cy=\"34\" rx=\"5\" ry=\"15\" fill=\"#F48FB1\"/><circle cx=\"60\" cy=\"70\" r=\"32\" fill=\"#FFFFFF\" stroke=\"#F8BBD0\" stroke-width=\"4\"/><circle cx=\"48\" cy=\"64\" r=\"4.5\" fill=\"#D81B60\"/><circle cx=\"72\" cy=\"64\" r=\"4.5\" fill=\"#D81B60\"/><ellipse cx=\"60\" cy=\"73\" rx=\"5\" ry=\"4\" fill=\"#F06292\"/></svg>"),
    moon: ("<svg viewBox=\"0 0 120 120\"><path d=\"M74 22 C44 26 28 58 44 84 C56 102 82 104 96 92 C72 94 56 76 60 52 C62 38 68 28 74 22 Z\" fill=\"#FFD54F\" stroke=\"#FFA000\" stroke-width=\"4\" stroke-linejoin=\"round\"/><circle cx=\"32\" cy=\"36\" r=\"4\" fill=\"#FFF176\"/><circle cx=\"88\" cy=\"38\" r=\"5\" fill=\"#FFF176\"/></svg>"),
    bear: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"34\" cy=\"36\" r=\"14\" fill=\"#8D6E63\"/><circle cx=\"86\" cy=\"36\" r=\"14\" fill=\"#8D6E63\"/><circle cx=\"60\" cy=\"64\" r=\"36\" fill=\"#A1887F\"/><ellipse cx=\"60\" cy=\"72\" rx=\"15\" ry=\"12\" fill=\"#EFEBE9\"/><circle cx=\"46\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><ellipse cx=\"60\" cy=\"68\" rx=\"6\" ry=\"4\" fill=\"#3E2723\"/></svg>"),
    star: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"60,14 73,44 106,47 81,69 88,102 60,84 32,102 39,69 14,47 47,44\" fill=\"#FFEE58\" stroke=\"#FBC02D\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"50\" cy=\"58\" r=\"4\" fill=\"#3E2723\"/><circle cx=\"70\" cy=\"58\" r=\"4\" fill=\"#3E2723\"/><path d=\"M53 68 Q60 74 67 68\" stroke=\"#3E2723\" stroke-width=\"3.5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    water: ("<svg viewBox=\"0 0 120 120\"><path d=\"M60 18 C60 18 26 60 26 80 C26 98 41 106 60 106 C79 106 94 98 94 80 C94 60 60 18 60 18 Z\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"4\"/><path d=\"M42 74 Q42 88 54 92\" stroke=\"#E1F5FE\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    wave: ("<svg viewBox=\"0 0 120 120\"><path d=\"M12 78 C28 42 58 42 72 66 C56 58 44 68 48 82 H108 C108 94 88 100 60 100 C30 100 12 92 12 78 Z\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"4\" stroke-linejoin=\"round\"/><circle cx=\"78\" cy=\"48\" r=\"5\" fill=\"#81D4FA\"/><circle cx=\"92\" cy=\"58\" r=\"4\" fill=\"#81D4FA\"/></svg>"),
    rice: ("<svg viewBox=\"0 0 120 120\"><path d=\"M26 62 C26 34 94 34 94 62 Z\" fill=\"#FFFFFF\" stroke=\"#CFD8DC\" stroke-width=\"4\"/><path d=\"M22 60 H98 L86 96 C84 100 78 102 60 102 C42 102 36 100 34 96 Z\" fill=\"#FF7043\" stroke=\"#D84315\" stroke-width=\"4\"/><path d=\"M36 76 H84\" stroke=\"#FFE082\" stroke-width=\"5\" stroke-linecap=\"round\"/></svg>"),
    tofu: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"82\" rx=\"46\" ry=\"16\" fill=\"#FFCC80\" stroke=\"#FB8C00\" stroke-width=\"4\"/><rect x=\"30\" y=\"38\" width=\"60\" height=\"40\" rx=\"8\" fill=\"#FFFDF7\" stroke=\"#CFD8DC\" stroke-width=\"4\"/><line x1=\"60\" y1=\"38\" x2=\"60\" y2=\"78\" stroke=\"#ECEFF1\" stroke-width=\"3\"/><line x1=\"30\" y1=\"58\" x2=\"90\" y2=\"58\" stroke=\"#ECEFF1\" stroke-width=\"3\"/><ellipse cx=\"60\" cy=\"46\" rx=\"10\" ry=\"5\" fill=\"#66BB6A\"/></svg>"),
    stew: ("<svg viewBox=\"0 0 120 120\"><path d=\"M18 56 H102 L92 94 C90 100 30 100 28 94 Z\" fill=\"#37474F\"/><ellipse cx=\"60\" cy=\"56\" rx=\"42\" ry=\"14\" fill=\"#FF7043\" stroke=\"#37474F\" stroke-width=\"4\"/><circle cx=\"48\" cy=\"56\" r=\"6\" fill=\"#FFF59D\"/><circle cx=\"70\" cy=\"54\" r=\"6\" fill=\"#66BB6A\"/><path d=\"M46 34 Q42 24 48 18 M74 34 Q70 24 76 18\" stroke=\"#FF8A65\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    snow: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"78\" r=\"26\" fill=\"#FFFFFF\" stroke=\"#90CAF9\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"42\" r=\"18\" fill=\"#FFFFFF\" stroke=\"#90CAF9\" stroke-width=\"4\"/><circle cx=\"54\" cy=\"39\" r=\"3\" fill=\"#37474F\"/><circle cx=\"66\" cy=\"39\" r=\"3\" fill=\"#37474F\"/><polygon points=\"60,43 74,46 60,49\" fill=\"#FF7043\"/><path d=\"M44 56 Q60 64 76 56\" stroke=\"#E53935\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    ball: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"42\" fill=\"#FFCA28\" stroke=\"#F57F17\" stroke-width=\"4\"/><path d=\"M22 46 Q60 70 98 46\" stroke=\"#EF5350\" stroke-width=\"8\" fill=\"none\"/><path d=\"M24 76 Q60 54 96 76\" stroke=\"#29B6F6\" stroke-width=\"8\" fill=\"none\"/></svg>"),
    earth: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"42\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"4\"/><path d=\"M32 36 C48 34 54 48 44 62 C36 72 44 86 58 88 C40 94 24 78 24 58 C24 48 28 40 32 36 Z\" fill=\"#66BB6A\"/><path d=\"M72 30 C88 36 96 52 90 70 C82 76 70 68 72 54 C74 44 66 36 72 30 Z\" fill=\"#66BB6A\"/></svg>"),
    baseball: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"42\" fill=\"#FFFFFF\" stroke=\"#CFD8DC\" stroke-width=\"4\"/><path d=\"M34 28 Q52 60 34 92\" stroke=\"#E53935\" stroke-width=\"4\" stroke-dasharray=\"6 4\" fill=\"none\"/><path d=\"M86 28 Q68 60 86 92\" stroke=\"#E53935\" stroke-width=\"4\" stroke-dasharray=\"6 4\" fill=\"none\"/></svg>"),
    house: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"16,58 60,20 104,58\" fill=\"#EF5350\" stroke=\"#C62828\" stroke-width=\"4\" stroke-linejoin=\"round\"/><rect x=\"28\" y=\"58\" width=\"64\" height=\"44\" rx=\"4\" fill=\"#FFF8E1\" stroke=\"#FFB74D\" stroke-width=\"4\"/><rect x=\"50\" y=\"72\" width=\"20\" height=\"30\" rx=\"3\" fill=\"#8D6E63\"/></svg>"),
    flower: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"34\" r=\"16\" fill=\"#FF80AB\"/><circle cx=\"84\" cy=\"52\" r=\"16\" fill=\"#FF80AB\"/><circle cx=\"74\" cy=\"80\" r=\"16\" fill=\"#FF80AB\"/><circle cx=\"46\" cy=\"80\" r=\"16\" fill=\"#FF80AB\"/><circle cx=\"36\" cy=\"52\" r=\"16\" fill=\"#FF80AB\"/><circle cx=\"60\" cy=\"58\" r=\"15\" fill=\"#FFEE58\" stroke=\"#FBC02D\" stroke-width=\"3\"/></svg>"),
    cloud: ("<svg viewBox=\"0 0 120 120\"><path d=\"M32 82 H88 C100 82 106 72 104 62 C102 52 92 48 86 48 C82 32 64 26 50 34 C38 28 24 38 24 52 C14 54 12 66 18 74 C22 80 26 82 32 82 Z\" fill=\"#81D4FA\" stroke=\"#29B6F6\" stroke-width=\"4\" stroke-linejoin=\"round\"/></svg>"),
    apple: ("<svg viewBox=\"0 0 120 120\"><path d=\"M60 34 C42 26 22 42 24 66 C26 90 44 104 60 98 C76 104 94 90 96 66 C98 42 78 26 60 34 Z\" fill=\"#EF5350\" stroke=\"#C62828\" stroke-width=\"4\"/><path d=\"M60 34 Q62 18 70 16\" stroke=\"#6D4C41\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M64 24 Q82 16 80 30 Q70 34 64 24 Z\" fill=\"#66BB6A\"/></svg>"),
    watermelon: ("<svg viewBox=\"0 0 120 120\"><path d=\"M16 44 A44 44 0 0 0 104 44 Z\" fill=\"#43A047\"/><path d=\"M24 44 A36 36 0 0 0 96 44 Z\" fill=\"#EF5350\"/><circle cx=\"46\" cy=\"58\" r=\"3.5\" fill=\"#263238\"/><circle cx=\"60\" cy=\"66\" r=\"3.5\" fill=\"#263238\"/><circle cx=\"74\" cy=\"58\" r=\"3.5\" fill=\"#263238\"/></svg>"),
    bag: ("<svg viewBox=\"0 0 120 120\"><path d=\"M44 36 C44 20 76 20 76 36\" stroke=\"#FB8C00\" stroke-width=\"6\" fill=\"none\"/><rect x=\"26\" y=\"36\" width=\"68\" height=\"64\" rx=\"18\" fill=\"#FFB74D\" stroke=\"#F57C00\" stroke-width=\"4\"/><rect x=\"38\" y=\"62\" width=\"44\" height=\"26\" rx=\"8\" fill=\"#FFF3E0\"/></svg>"),
    drawer: ("<svg viewBox=\"0 0 120 120\"><rect x=\"22\" y=\"22\" width=\"76\" height=\"76\" rx=\"10\" fill=\"#8D6E63\" stroke=\"#5D4037\" stroke-width=\"4\"/><rect x=\"30\" y=\"30\" width=\"60\" height=\"26\" rx=\"5\" fill=\"#FFE0B2\" stroke=\"#5D4037\" stroke-width=\"3\"/><rect x=\"30\" y=\"64\" width=\"60\" height=\"26\" rx=\"5\" fill=\"#FFE0B2\" stroke=\"#5D4037\" stroke-width=\"3\"/><circle cx=\"60\" cy=\"43\" r=\"5\" fill=\"#5D4037\"/><circle cx=\"60\" cy=\"77\" r=\"5\" fill=\"#5D4037\"/></svg>"),
    duck: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"52\" cy=\"44\" r=\"20\" fill=\"#FFEE58\"/><ellipse cx=\"64\" cy=\"78\" rx=\"32\" ry=\"22\" fill=\"#FDD835\"/><polygon points=\"32,42 16,47 32,52\" fill=\"#FF7043\"/><circle cx=\"46\" cy=\"40\" r=\"4\" fill=\"#3E2723\"/></svg>"),
    ostrich: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"42\" cy=\"24\" r=\"12\" fill=\"#FFCCBC\" stroke=\"#8D6E63\" stroke-width=\"3\"/><polygon points=\"30,24 18,27 30,30\" fill=\"#FFA000\"/><rect x=\"38\" y=\"34\" width=\"8\" height=\"32\" rx=\"4\" fill=\"#FFCCBC\"/><ellipse cx=\"64\" cy=\"68\" rx=\"28\" ry=\"18\" fill=\"#5D4037\"/><line x1=\"56\" y1=\"84\" x2=\"52\" y2=\"108\" stroke=\"#FFA000\" stroke-width=\"5\" stroke-linecap=\"round\"/><line x1=\"72\" y1=\"84\" x2=\"76\" y2=\"108\" stroke=\"#FFA000\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"39\" cy=\"22\" r=\"3\" fill=\"#263238\"/></svg>"),
    bus: ("<svg viewBox=\"0 0 120 120\"><rect x=\"16\" y=\"34\" width=\"88\" height=\"52\" rx=\"12\" fill=\"#FFCA28\" stroke=\"#FFA000\" stroke-width=\"4\"/><rect x=\"26\" y=\"44\" width=\"20\" height=\"18\" rx=\"4\" fill=\"#E1F5FE\"/><rect x=\"52\" y=\"44\" width=\"20\" height=\"18\" rx=\"4\" fill=\"#E1F5FE\"/><rect x=\"78\" y=\"44\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#E1F5FE\"/><circle cx=\"38\" cy=\"88\" r=\"11\" fill=\"#37474F\"/><circle cx=\"82\" cy=\"88\" r=\"11\" fill=\"#37474F\"/></svg>"),
    car: ("<svg viewBox=\"0 0 120 120\"><path d=\"M28 62 L40 38 H80 L92 62 Z\" fill=\"#4FC3F7\"/><rect x=\"16\" y=\"58\" width=\"88\" height=\"28\" rx=\"12\" fill=\"#039BE5\"/><circle cx=\"38\" cy=\"88\" r=\"12\" fill=\"#37474F\" stroke=\"#ECEFF1\" stroke-width=\"4\"/><circle cx=\"82\" cy=\"88\" r=\"12\" fill=\"#37474F\" stroke=\"#ECEFF1\" stroke-width=\"4\"/></svg>"),
    piano: ("<svg viewBox=\"0 0 120 120\"><rect x=\"18\" y=\"28\" width=\"84\" height=\"64\" rx=\"10\" fill=\"#ECEFF1\" stroke=\"#455A64\" stroke-width=\"4\"/><line x1=\"39\" y1=\"28\" x2=\"39\" y2=\"92\" stroke=\"#455A64\" stroke-width=\"3\"/><line x1=\"60\" y1=\"28\" x2=\"60\" y2=\"92\" stroke=\"#455A64\" stroke-width=\"3\"/><line x1=\"81\" y1=\"28\" x2=\"81\" y2=\"92\" stroke=\"#455A64\" stroke-width=\"3\"/><rect x=\"33\" y=\"28\" width=\"12\" height=\"36\" fill=\"#263238\"/><rect x=\"54\" y=\"28\" width=\"12\" height=\"36\" fill=\"#263238\"/><rect x=\"75\" y=\"28\" width=\"12\" height=\"36\" fill=\"#263238\"/></svg>"),
    radio: ("<svg viewBox=\"0 0 120 120\"><line x1=\"34\" y1=\"40\" x2=\"78\" y2=\"16\" stroke=\"#546E7A\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"78\" cy=\"16\" r=\"5\" fill=\"#FF5252\"/><rect x=\"20\" y=\"40\" width=\"80\" height=\"54\" rx=\"12\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"4\"/><circle cx=\"46\" cy=\"67\" r=\"16\" fill=\"#FFF9C4\" stroke=\"#0288D1\" stroke-width=\"3\"/><circle cx=\"82\" cy=\"58\" r=\"6\" fill=\"#FFD54F\"/><circle cx=\"82\" cy=\"76\" r=\"6\" fill=\"#FF7043\"/></svg>"),
    camera: ("<svg viewBox=\"0 0 120 120\"><rect x=\"38\" y=\"26\" width=\"26\" height=\"12\" rx=\"4\" fill=\"#546E7A\"/><rect x=\"18\" y=\"36\" width=\"84\" height=\"58\" rx=\"14\" fill=\"#FF7043\" stroke=\"#D84315\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"65\" r=\"20\" fill=\"#E1F5FE\" stroke=\"#37474F\" stroke-width=\"5\"/><circle cx=\"86\" cy=\"48\" r=\"5\" fill=\"#FFEE58\"/></svg>"),
    gem: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"36,26 84,26 104,50 60,98 16,50\" fill=\"#4FC3F7\" stroke=\"#0288D1\" stroke-width=\"4\" stroke-linejoin=\"round\"/><polyline points=\"16,50 104,50\" stroke=\"#0288D1\" stroke-width=\"3\"/><polyline points=\"36,26 48,50 60,98 72,50 84,26\" stroke=\"#B3E5FC\" stroke-width=\"3\" fill=\"none\"/></svg>"),
    fox: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"24,22 48,46 28,62\" fill=\"#FF7043\"/><polygon points=\"96,22 72,46 92,62\" fill=\"#FF7043\"/><polygon points=\"22,52 98,52 60,98\" fill=\"#FF8A65\" stroke=\"#E64A19\" stroke-width=\"4\" stroke-linejoin=\"round\"/><polygon points=\"36,64 60,96 48,64\" fill=\"#FFF3E0\"/><polygon points=\"84,64 60,96 72,64\" fill=\"#FFF3E0\"/><circle cx=\"46\" cy=\"60\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"60\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"60\" cy=\"94\" r=\"6\" fill=\"#3E2723\"/></svg>"),
    raccoon: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"34\" cy=\"36\" r=\"13\" fill=\"#6D4C41\"/><circle cx=\"86\" cy=\"36\" r=\"13\" fill=\"#6D4C41\"/><circle cx=\"60\" cy=\"64\" r=\"36\" fill=\"#A1887F\" stroke=\"#5D4037\" stroke-width=\"4\"/><ellipse cx=\"44\" cy=\"58\" rx=\"14\" ry=\"10\" fill=\"#4E342E\"/><ellipse cx=\"76\" cy=\"58\" rx=\"14\" ry=\"10\" fill=\"#4E342E\"/><circle cx=\"44\" cy=\"58\" r=\"4\" fill=\"#FFFFFF\"/><circle cx=\"76\" cy=\"58\" r=\"4\" fill=\"#FFFFFF\"/><ellipse cx=\"60\" cy=\"74\" rx=\"14\" ry=\"10\" fill=\"#EFEBE9\"/><circle cx=\"60\" cy=\"70\" r=\"5\" fill=\"#3E2723\"/></svg>"),
    squirrel: ("<svg viewBox=\"0 0 120 120\"><path d=\"M78 86 C108 86 112 38 86 38 C72 38 72 62 82 68\" fill=\"#D78B48\" stroke=\"#8D6E63\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"50\" cy=\"56\" r=\"24\" fill=\"#F4A460\" stroke=\"#8D6E63\" stroke-width=\"4\"/><ellipse cx=\"52\" cy=\"84\" rx=\"20\" ry=\"16\" fill=\"#F4A460\" stroke=\"#8D6E63\" stroke-width=\"4\"/><circle cx=\"42\" cy=\"52\" r=\"4\" fill=\"#3E2723\"/></svg>"),
    whale: ("<svg viewBox=\"0 0 120 120\"><path d=\"M18 74 C18 42 74 38 88 64 C96 64 106 54 108 46 C108 62 102 76 88 78 Z\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"4\" stroke-linejoin=\"round\"/><path d=\"M52 38 Q46 20 34 22 M52 38 Q58 20 70 22\" stroke=\"#81D4FA\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"38\" cy=\"60\" r=\"4\" fill=\"#263238\"/></svg>"),
    frog: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"40\" cy=\"40\" r=\"14\" fill=\"#66BB6A\"/><circle cx=\"80\" cy=\"40\" r=\"14\" fill=\"#66BB6A\"/><circle cx=\"40\" cy=\"40\" r=\"6\" fill=\"#263238\"/><circle cx=\"80\" cy=\"40\" r=\"6\" fill=\"#263238\"/><ellipse cx=\"60\" cy=\"68\" rx=\"38\" ry=\"26\" fill=\"#66BB6A\" stroke=\"#388E3C\" stroke-width=\"4\"/><path d=\"M40 72 Q60 86 80 72\" stroke=\"#2E7D32\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"34\" cy=\"66\" r=\"6\" fill=\"#FF8A80\" opacity=\"0.7\"/><circle cx=\"86\" cy=\"66\" r=\"6\" fill=\"#FF8A80\" opacity=\"0.7\"/></svg>"),
    pig: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"28,28 46,34 32,50\" fill=\"#F48FB1\"/><polygon points=\"92,28 74,34 88,50\" fill=\"#F48FB1\"/><circle cx=\"60\" cy=\"64\" r=\"36\" fill=\"#F8BBD0\" stroke=\"#F06292\" stroke-width=\"4\"/><ellipse cx=\"60\" cy=\"68\" rx=\"15\" ry=\"11\" fill=\"#F06292\"/><circle cx=\"55\" cy=\"68\" r=\"3\" fill=\"#880E4F\"/><circle cx=\"65\" cy=\"68\" r=\"3\" fill=\"#880E4F\"/><circle cx=\"44\" cy=\"52\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"76\" cy=\"52\" r=\"4.5\" fill=\"#3E2723\"/></svg>"),
    cat: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"26,26 48,38 28,56\" fill=\"#FFB74D\"/><polygon points=\"94,26 72,38 92,56\" fill=\"#FFB74D\"/><circle cx=\"60\" cy=\"66\" r=\"34\" fill=\"#FFE082\" stroke=\"#FFA000\" stroke-width=\"4\"/><circle cx=\"46\" cy=\"58\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"58\" r=\"4.5\" fill=\"#3E2723\"/><polygon points=\"60,64 55,70 65,70\" fill=\"#EC407A\"/><line x1=\"20\" y1=\"64\" x2=\"38\" y2=\"66\" stroke=\"#8D6E63\" stroke-width=\"3\"/><line x1=\"20\" y1=\"72\" x2=\"38\" y2=\"71\" stroke=\"#8D6E63\" stroke-width=\"3\"/><line x1=\"82\" y1=\"66\" x2=\"100\" y2=\"64\" stroke=\"#8D6E63\" stroke-width=\"3\"/><line x1=\"82\" y1=\"71\" x2=\"100\" y2=\"72\" stroke=\"#8D6E63\" stroke-width=\"3\"/></svg>"),
    dog: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"26\" cy=\"56\" rx=\"12\" ry=\"22\" transform=\"rotate(15 26 56)\" fill=\"#8D6E63\"/><ellipse cx=\"94\" cy=\"56\" rx=\"12\" ry=\"22\" transform=\"rotate(-15 94 56)\" fill=\"#8D6E63\"/><circle cx=\"60\" cy=\"62\" r=\"34\" fill=\"#FFE0B2\" stroke=\"#8D6E63\" stroke-width=\"4\"/><circle cx=\"46\" cy=\"54\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"54\" r=\"4.5\" fill=\"#3E2723\"/><ellipse cx=\"60\" cy=\"64\" rx=\"7\" ry=\"5\" fill=\"#3E2723\"/><path d=\"M56 72 Q60 82 64 72\" fill=\"#EF5350\"/></svg>"),
    tiger: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"34\" cy=\"34\" r=\"12\" fill=\"#FF9800\"/><circle cx=\"86\" cy=\"34\" r=\"12\" fill=\"#FF9800\"/><circle cx=\"60\" cy=\"64\" r=\"36\" fill=\"#FFB74D\" stroke=\"#F57C00\" stroke-width=\"4\"/><path d=\"M52 30 H68 M56 38 H64 M26 58 H36 M84 58 H94\" stroke=\"#3E2723\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"46\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><circle cx=\"74\" cy=\"56\" r=\"4.5\" fill=\"#3E2723\"/><ellipse cx=\"60\" cy=\"68\" rx=\"12\" ry=\"9\" fill=\"#FFF8E1\"/></svg>"),
    penguin: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"64\" rx=\"34\" ry=\"40\" fill=\"#37474F\"/><ellipse cx=\"60\" cy=\"70\" rx=\"22\" ry=\"28\" fill=\"#FFFFFF\"/><circle cx=\"48\" cy=\"48\" r=\"4.5\" fill=\"#263238\"/><circle cx=\"72\" cy=\"48\" r=\"4.5\" fill=\"#263238\"/><polygon points=\"60,52 52,60 68,60\" fill=\"#FFA000\"/><ellipse cx=\"44\" cy=\"102\" rx=\"10\" ry=\"5\" fill=\"#FFA000\"/><ellipse cx=\"76\" cy=\"102\" rx=\"10\" ry=\"5\" fill=\"#FFA000\"/></svg>"),
    turtle: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"94\" cy=\"62\" r=\"14\" fill=\"#81C784\"/><path d=\"M22 72 C22 36 82 36 82 72 Z\" fill=\"#388E3C\" stroke=\"#1B5E20\" stroke-width=\"4\"/><rect x=\"30\" y=\"72\" width=\"12\" height=\"16\" rx=\"5\" fill=\"#81C784\"/><rect x=\"62\" y=\"72\" width=\"12\" height=\"16\" rx=\"5\" fill=\"#81C784\"/><circle cx=\"98\" cy=\"58\" r=\"3\" fill=\"#263238\"/></svg>"),
    strawberry: ("<svg viewBox=\"0 0 120 120\"><path d=\"M60 98 C34 86 26 52 38 36 C48 26 72 26 82 36 C94 52 86 86 60 98 Z\" fill=\"#E53935\" stroke=\"#C62828\" stroke-width=\"4\"/><polygon points=\"60,20 44,36 60,32 76,36\" fill=\"#43A047\" stroke=\"#2E7D32\" stroke-width=\"3\"/><circle cx=\"48\" cy=\"52\" r=\"2.5\" fill=\"#FFF59D\"/><circle cx=\"72\" cy=\"52\" r=\"2.5\" fill=\"#FFF59D\"/><circle cx=\"60\" cy=\"66\" r=\"2.5\" fill=\"#FFF59D\"/><circle cx=\"50\" cy=\"76\" r=\"2.5\" fill=\"#FFF59D\"/><circle cx=\"70\" cy=\"76\" r=\"2.5\" fill=\"#FFF59D\"/></svg>"),
    carrot: ("<svg viewBox=\"0 0 120 120\"><path d=\"M60 100 L38 40 C38 30 82 30 82 40 Z\" fill=\"#FF7043\" stroke=\"#D84315\" stroke-width=\"4\" stroke-linejoin=\"round\"/><path d=\"M60 32 Q50 14 42 20 M60 32 Q60 12 60 14 M60 32 Q70 14 78 20\" stroke=\"#43A047\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/><line x1=\"48\" y1=\"54\" x2=\"64\" y2=\"54\" stroke=\"#D84315\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"52\" y1=\"70\" x2=\"68\" y2=\"70\" stroke=\"#D84315\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>"),
    bread: ("<svg viewBox=\"0 0 120 120\"><path d=\"M26 52 C20 34 40 24 60 24 C80 24 100 34 94 52 L90 92 H30 Z\" fill=\"#FFB74D\" stroke=\"#E65100\" stroke-width=\"4\" stroke-linejoin=\"round\"/><rect x=\"38\" y=\"42\" width=\"44\" height=\"40\" rx=\"8\" fill=\"#FFF3E0\"/></svg>"),
    pizza: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"60,20 22,94 98,94\" fill=\"#FFD54F\" stroke=\"#F57C00\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M20 92 Q60 104 100 92\" stroke=\"#D84315\" stroke-width=\"9\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"60\" cy=\"56\" r=\"7\" fill=\"#E53935\"/><circle cx=\"48\" cy=\"76\" r=\"7\" fill=\"#E53935\"/><circle cx=\"72\" cy=\"76\" r=\"7\" fill=\"#E53935\"/></svg>"),
    cheese: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"20,56 76,26 100,56\" fill=\"#FFF176\" stroke=\"#FBC02D\" stroke-width=\"4\" stroke-linejoin=\"round\"/><rect x=\"20\" y=\"56\" width=\"80\" height=\"36\" rx=\"4\" fill=\"#FFD54F\" stroke=\"#FBC02D\" stroke-width=\"4\"/><circle cx=\"42\" cy=\"72\" r=\"7\" fill=\"#F57F17\"/><circle cx=\"74\" cy=\"76\" r=\"5\" fill=\"#F57F17\"/><circle cx=\"62\" cy=\"64\" r=\"4\" fill=\"#F57F17\"/></svg>"),
    juice: ("<svg viewBox=\"0 0 120 120\"><path d=\"M68 18 L58 40\" stroke=\"#EF5350\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M34 40 H86 L80 98 H40 Z\" fill=\"#FFF3E0\" stroke=\"#FFB74D\" stroke-width=\"4\" stroke-linejoin=\"round\"/><path d=\"M37 56 H83 L79 94 H41 Z\" fill=\"#FFA726\"/></svg>"),
    airplane: ("<svg viewBox=\"0 0 120 120\"><path d=\"M18 64 L102 36 L86 84 L58 72 L42 88 L42 68 Z\" fill=\"#4FC3F7\" stroke=\"#0288D1\" stroke-width=\"4\" stroke-linejoin=\"round\"/></svg>"),
    ship: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"60,20 60,64 94,64\" fill=\"#FF8A65\"/><polygon points=\"54,28 54,64 26,64\" fill=\"#FFD54F\"/><polygon points=\"18,68 102,68 86,94 34,94\" fill=\"#5D4037\"/><path d=\"M14 96 Q36 88 60 96 T106 96\" stroke=\"#29B6F6\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    umbrella: ("<svg viewBox=\"0 0 120 120\"><path d=\"M16 62 C16 26 104 26 104 62 Z\" fill=\"#EC407A\" stroke=\"#C2185B\" stroke-width=\"4\"/><path d=\"M60 62 V92 C60 100 48 100 48 92\" stroke=\"#5D4037\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    clock: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"40\" fill=\"#FFF9C4\" stroke=\"#29B6F6\" stroke-width=\"6\"/><line x1=\"60\" y1=\"60\" x2=\"60\" y2=\"36\" stroke=\"#37474F\" stroke-width=\"5\" stroke-linecap=\"round\"/><line x1=\"60\" y1=\"60\" x2=\"78\" y2=\"60\" stroke=\"#E53935\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"60\" cy=\"60\" r=\"4\" fill=\"#37474F\"/></svg>"),
    rainbow: ("<svg viewBox=\"0 0 120 120\"><path d=\"M18 84 A42 42 0 0 1 102 84\" stroke=\"#EF5350\" stroke-width=\"8\" fill=\"none\"/><path d=\"M26 84 A34 34 0 0 1 94 84\" stroke=\"#FFCA28\" stroke-width=\"8\" fill=\"none\"/><path d=\"M34 84 A26 26 0 0 1 86 84\" stroke=\"#66BB6A\" stroke-width=\"8\" fill=\"none\"/><path d=\"M42 84 A18 18 0 0 1 78 84\" stroke=\"#29B6F6\" stroke-width=\"8\" fill=\"none\"/></svg>"),
    book: ("<svg viewBox=\"0 0 120 120\"><path d=\"M18 32 Q40 26 60 34 V92 Q40 84 18 90 Z\" fill=\"#FFF8E1\" stroke=\"#FFA000\" stroke-width=\"4\"/><path d=\"M102 32 Q80 26 60 34 V92 Q80 84 102 90 Z\" fill=\"#FFF8E1\" stroke=\"#FFA000\" stroke-width=\"4\"/></svg>"),
    pencil: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"24,96 36,68 52,84\" fill=\"#FFE0B2\" stroke=\"#5D4037\" stroke-width=\"3\"/><rect x=\"44\" y=\"32\" width=\"44\" height=\"24\" transform=\"rotate(-45 66 44)\" fill=\"#FFD54F\" stroke=\"#F57F17\" stroke-width=\"4\"/><polygon points=\"24,96 29,84 36,91\" fill=\"#3E2723\"/></svg>"),
    glasses: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"36\" cy=\"64\" r=\"18\" fill=\"#E1F5FE\" stroke=\"#37474F\" stroke-width=\"5\"/><circle cx=\"84\" cy=\"64\" r=\"18\" fill=\"#E1F5FE\" stroke=\"#37474F\" stroke-width=\"5\"/><line x1=\"54\" y1=\"64\" x2=\"66\" y2=\"64\" stroke=\"#37474F\" stroke-width=\"5\"/></svg>"),
    shoes: ("<svg viewBox=\"0 0 120 120\"><path d=\"M22 52 H56 L72 68 H96 C102 68 102 88 94 88 H22 Z\" fill=\"#EF5350\" stroke=\"#C62828\" stroke-width=\"4\" stroke-linejoin=\"round\"/><rect x=\"20\" y=\"84\" width=\"80\" height=\"8\" rx=\"4\" fill=\"#FFFFFF\"/></svg>"),
    gift: ("<svg viewBox=\"0 0 120 120\"><rect x=\"26\" y=\"46\" width=\"68\" height=\"52\" rx=\"6\" fill=\"#FF7043\" stroke=\"#D84315\" stroke-width=\"4\"/><rect x=\"22\" y=\"34\" width=\"76\" height=\"16\" rx=\"4\" fill=\"#FF8A65\" stroke=\"#D84315\" stroke-width=\"4\"/><rect x=\"54\" y=\"34\" width=\"12\" height=\"64\" fill=\"#FFD54F\"/><path d=\"M60 34 C42 16 32 34 60 34 C88 34 78 16 60 34 Z\" fill=\"#FFD54F\" stroke=\"#FFA000\" stroke-width=\"3\"/></svg>"),
    robot: ("<svg viewBox=\"0 0 120 120\"><line x1=\"60\" y1=\"16\" x2=\"60\" y2=\"32\" stroke=\"#546E7A\" stroke-width=\"5\"/><circle cx=\"60\" cy=\"14\" r=\"6\" fill=\"#FF5252\"/><rect x=\"30\" y=\"32\" width=\"60\" height=\"48\" rx=\"10\" fill=\"#90A4AE\" stroke=\"#455A64\" stroke-width=\"4\"/><circle cx=\"46\" cy=\"52\" r=\"7\" fill=\"#FFF59D\"/><circle cx=\"74\" cy=\"52\" r=\"7\" fill=\"#FFF59D\"/><rect x=\"42\" y=\"66\" width=\"36\" height=\"6\" rx=\"3\" fill=\"#37474F\"/></svg>"),
    mountain: ("<svg viewBox=\"0 0 120 120\"><polygon points=\"12,94 52,28 92,94\" fill=\"#66BB6A\" stroke=\"#2E7D32\" stroke-width=\"4\" stroke-linejoin=\"round\"/><polygon points=\"48,94 80,42 110,94\" fill=\"#81C784\" stroke=\"#388E3C\" stroke-width=\"4\" stroke-linejoin=\"round\"/></svg>"),
    bee: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"52\" cy=\"36\" rx=\"12\" ry=\"18\" fill=\"#E1F5FE\" stroke=\"#81D4FA\" stroke-width=\"3\"/><ellipse cx=\"68\" cy=\"36\" rx=\"12\" ry=\"18\" fill=\"#E1F5FE\" stroke=\"#81D4FA\" stroke-width=\"3\"/><ellipse cx=\"60\" cy=\"64\" rx=\"32\" ry=\"22\" fill=\"#FFD54F\" stroke=\"#3E2723\" stroke-width=\"4\"/><line x1=\"50\" y1=\"44\" x2=\"50\" y2=\"84\" stroke=\"#3E2723\" stroke-width=\"6\"/><line x1=\"68\" y1=\"44\" x2=\"68\" y2=\"84\" stroke=\"#3E2723\" stroke-width=\"6\"/><circle cx=\"38\" cy=\"60\" r=\"4\" fill=\"#3E2723\"/></svg>"),
    dinosaur: ("<svg viewBox=\"0 0 120 120\"><path d=\"M30 88 V44 C30 26 62 26 62 44 V60 H88 C96 60 96 88 84 88 Z\" fill=\"#66BB6A\" stroke=\"#2E7D32\" stroke-width=\"4\" stroke-linejoin=\"round\"/><circle cx=\"44\" cy=\"40\" r=\"4\" fill=\"#263238\"/></svg>"),
    giraffe: ("<svg viewBox=\"0 0 120 120\"><rect x=\"48\" y=\"36\" width=\"18\" height=\"62\" rx=\"8\" fill=\"#FFD54F\" stroke=\"#F57F17\" stroke-width=\"3\"/><ellipse cx=\"60\" cy=\"34\" rx=\"18\" ry=\"12\" fill=\"#FFD54F\" stroke=\"#F57F17\" stroke-width=\"3\"/><circle cx=\"56\" cy=\"56\" r=\"4\" fill=\"#8D6E63\"/><circle cx=\"54\" cy=\"76\" r=\"5\" fill=\"#8D6E63\"/><circle cx=\"64\" cy=\"32\" r=\"3\" fill=\"#3E2723\"/></svg>"),
    mushroom: ("<svg viewBox=\"0 0 120 120\"><rect x=\"46\" y=\"58\" width=\"28\" height=\"38\" rx=\"10\" fill=\"#FFF8E1\" stroke=\"#D7CCC8\" stroke-width=\"4\"/><path d=\"M20 62 C20 22 100 22 100 62 Z\" fill=\"#EF5350\" stroke=\"#C62828\" stroke-width=\"4\"/><circle cx=\"44\" cy=\"44\" r=\"7\" fill=\"#FFFFFF\"/><circle cx=\"74\" cy=\"40\" r=\"6\" fill=\"#FFFFFF\"/><circle cx=\"60\" cy=\"52\" r=\"5\" fill=\"#FFFFFF\"/></svg>"),
    corn: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"56\" rx=\"20\" ry=\"34\" fill=\"#FFD54F\" stroke=\"#FBC02D\" stroke-width=\"4\"/><path d=\"M40 64 Q26 84 56 94 Z\" fill=\"#66BB6A\" stroke=\"#2E7D32\" stroke-width=\"3\"/><path d=\"M80 64 Q94 84 64 94 Z\" fill=\"#66BB6A\" stroke=\"#2E7D32\" stroke-width=\"3\"/></svg>"),
    elephant: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"28\" cy=\"58\" rx=\"18\" ry=\"26\" fill=\"#90A4AE\" stroke=\"#607D8B\" stroke-width=\"4\"/><ellipse cx=\"92\" cy=\"58\" rx=\"18\" ry=\"26\" fill=\"#90A4AE\" stroke=\"#607D8B\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"56\" r=\"30\" fill=\"#B0BEC5\" stroke=\"#607D8B\" stroke-width=\"4\"/><path d=\"M54 62 V88 C54 96 68 96 68 86\" stroke=\"#607D8B\" stroke-width=\"12\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M54 62 V88 C54 96 68 96 68 86\" stroke=\"#B0BEC5\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"46\" cy=\"50\" r=\"4\" fill=\"#263238\"/><circle cx=\"74\" cy=\"50\" r=\"4\" fill=\"#263238\"/></svg>"),
    caterpillar: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"88\" cy=\"72\" r=\"14\" fill=\"#81C784\" stroke=\"#388E3C\" stroke-width=\"3\"/><circle cx=\"68\" cy=\"68\" r=\"15\" fill=\"#66BB6A\" stroke=\"#388E3C\" stroke-width=\"3\"/><circle cx=\"48\" cy=\"70\" r=\"16\" fill=\"#81C784\" stroke=\"#388E3C\" stroke-width=\"3\"/><circle cx=\"30\" cy=\"56\" r=\"18\" fill=\"#66BB6A\" stroke=\"#388E3C\" stroke-width=\"3\"/><circle cx=\"24\" cy=\"52\" r=\"3.5\" fill=\"#263238\"/><circle cx=\"36\" cy=\"52\" r=\"3.5\" fill=\"#263238\"/><path d=\"M24 38 Q18 26 14 30 M34 38 Q40 26 44 30\" stroke=\"#388E3C\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    waffle: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"40\" fill=\"#FFB74D\" stroke=\"#E65100\" stroke-width=\"5\"/><line x1=\"36\" y1=\"28\" x2=\"36\" y2=\"92\" stroke=\"#E65100\" stroke-width=\"4\"/><line x1=\"60\" y1=\"20\" x2=\"60\" y2=\"100\" stroke=\"#E65100\" stroke-width=\"4\"/><line x1=\"84\" y1=\"28\" x2=\"84\" y2=\"92\" stroke=\"#E65100\" stroke-width=\"4\"/><line x1=\"28\" y1=\"36\" x2=\"92\" y2=\"36\" stroke=\"#E65100\" stroke-width=\"4\"/><line x1=\"20\" y1=\"60\" x2=\"100\" y2=\"60\" stroke=\"#E65100\" stroke-width=\"4\"/><line x1=\"28\" y1=\"84\" x2=\"92\" y2=\"84\" stroke=\"#E65100\" stroke-width=\"4\"/><rect x=\"50\" y=\"50\" width=\"20\" height=\"20\" rx=\"4\" fill=\"#FFF59D\"/></svg>"),
    alien: ("<svg viewBox=\"0 0 120 120\"><line x1=\"60\" y1=\"16\" x2=\"60\" y2=\"34\" stroke=\"#66BB6A\" stroke-width=\"5\"/><circle cx=\"60\" cy=\"14\" r=\"7\" fill=\"#AED581\"/><ellipse cx=\"60\" cy=\"64\" rx=\"36\" ry=\"30\" fill=\"#81C784\" stroke=\"#388E3C\" stroke-width=\"4\"/><circle cx=\"42\" cy=\"58\" r=\"7\" fill=\"#FFFFFF\"/><circle cx=\"60\" cy=\"54\" r=\"7\" fill=\"#FFFFFF\"/><circle cx=\"78\" cy=\"58\" r=\"7\" fill=\"#FFFFFF\"/><circle cx=\"42\" cy=\"58\" r=\"3\" fill=\"#263238\"/><circle cx=\"60\" cy=\"54\" r=\"3\" fill=\"#263238\"/><circle cx=\"78\" cy=\"58\" r=\"3\" fill=\"#263238\"/><path d=\"M46 74 Q60 84 74 74\" stroke=\"#1B5E20\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    monkey: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"24\" cy=\"58\" r=\"14\" fill=\"#8D6E63\"/><circle cx=\"96\" cy=\"58\" r=\"14\" fill=\"#8D6E63\"/><circle cx=\"24\" cy=\"58\" r=\"8\" fill=\"#FFCCBC\"/><circle cx=\"96\" cy=\"58\" r=\"8\" fill=\"#FFCCBC\"/><circle cx=\"60\" cy=\"58\" r=\"32\" fill=\"#8D6E63\"/><ellipse cx=\"60\" cy=\"68\" rx=\"22\" ry=\"16\" fill=\"#FFCCBC\"/><circle cx=\"48\" cy=\"52\" r=\"4\" fill=\"#3E2723\"/><circle cx=\"72\" cy=\"52\" r=\"4\" fill=\"#3E2723\"/><path d=\"M50 72 Q60 80 70 72\" stroke=\"#5D4037\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    fishbowl: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"64\" r=\"38\" fill=\"#E1F5FE\" stroke=\"#29B6F6\" stroke-width=\"4\"/><path d=\"M24 58 Q60 66 96 58 A38 38 0 0 1 24 58 Z\" fill=\"#81D4FA\"/><ellipse cx=\"56\" cy=\"72\" rx=\"14\" ry=\"9\" fill=\"#FF7043\"/><polygon points=\"70,72 82,64 82,80\" fill=\"#FF7043\"/><circle cx=\"48\" cy=\"70\" r=\"2.5\" fill=\"#263238\"/><rect x=\"38\" y=\"22\" width=\"44\" height=\"8\" rx=\"4\" fill=\"#29B6F6\"/></svg>"),
    stroller: ("<svg viewBox=\"0 0 120 120\"><path d=\"M30 56 H86 C86 80 30 80 30 56 Z\" fill=\"#F48FB1\" stroke=\"#C2185B\" stroke-width=\"4\"/><path d=\"M58 56 V28 C78 28 86 40 86 56 Z\" fill=\"#F8BBD0\" stroke=\"#C2185B\" stroke-width=\"4\"/><path d=\"M30 56 L20 38 H12\" stroke=\"#546E7A\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"42\" cy=\"88\" r=\"11\" fill=\"#37474F\" stroke=\"#ECEFF1\" stroke-width=\"3\"/><circle cx=\"76\" cy=\"88\" r=\"11\" fill=\"#37474F\" stroke=\"#ECEFF1\" stroke-width=\"3\"/></svg>"),
    tooth: ("<svg viewBox=\"0 0 120 120\"><path d=\"M34 32 C24 32 22 58 30 78 C34 90 42 96 48 82 C54 70 66 70 72 82 C78 96 86 90 90 78 C98 58 96 32 86 32 C74 32 68 38 60 38 C52 38 46 32 34 32 Z\" fill=\"#FFFFFF\" stroke=\"#90CAF9\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"48\" cy=\"52\" r=\"3.5\" fill=\"#37474F\"/><circle cx=\"72\" cy=\"52\" r=\"3.5\" fill=\"#37474F\"/><path d=\"M52 60 Q60 66 68 60\" stroke=\"#37474F\" stroke-width=\"3.5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    trophy: ("<svg viewBox=\"0 0 120 120\"><path d=\"M36 26 H84 V54 C84 74 36 74 36 54 Z\" fill=\"#FFD54F\" stroke=\"#FFA000\" stroke-width=\"4\"/><path d=\"M36 34 H22 C22 52 30 56 36 54 M84 34 H98 C98 52 90 56 84 54\" stroke=\"#FFA000\" stroke-width=\"5\" fill=\"none\"/><rect x=\"54\" y=\"70\" width=\"12\" height=\"18\" fill=\"#FFA000\"/><rect x=\"38\" y=\"88\" width=\"44\" height=\"10\" rx=\"4\" fill=\"#8D6E63\"/></svg>"),
    seed: ("<svg viewBox=\"0 0 120 120\"><path d=\"M20 92 Q60 82 100 92\" stroke=\"#8D6E63\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/><ellipse cx=\"60\" cy=\"82\" rx=\"12\" ry=\"8\" fill=\"#6D4C41\"/><path d=\"M60 76 V42\" stroke=\"#43A047\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M60 52 C40 52 34 32 54 32 C58 32 60 44 60 52 Z\" fill=\"#66BB6A\"/><path d=\"M60 52 C80 52 86 32 66 32 C62 32 60 44 60 52 Z\" fill=\"#81C784\"/></svg>"),
    acorn: ("<svg viewBox=\"0 0 120 120\"><path d=\"M34 52 C34 86 60 98 60 98 C60 98 86 86 86 52 Z\" fill=\"#D78B48\" stroke=\"#8D6E63\" stroke-width=\"4\"/><path d=\"M28 52 C28 32 92 32 92 52 Z\" fill=\"#6D4C41\" stroke=\"#4E342E\" stroke-width=\"4\"/><path d=\"M60 34 V20\" stroke=\"#4E342E\" stroke-width=\"6\" stroke-linecap=\"round\"/></svg>"),
    kiwi: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"38\" fill=\"#8D6E63\"/><circle cx=\"60\" cy=\"60\" r=\"32\" fill=\"#9CCC65\"/><circle cx=\"60\" cy=\"60\" r=\"14\" fill=\"#F1F8E9\"/><circle cx=\"60\" cy=\"40\" r=\"2.5\" fill=\"#263238\"/><circle cx=\"76\" cy=\"48\" r=\"2.5\" fill=\"#263238\"/><circle cx=\"76\" cy=\"72\" r=\"2.5\" fill=\"#263238\"/><circle cx=\"60\" cy=\"80\" r=\"2.5\" fill=\"#263238\"/><circle cx=\"44\" cy=\"72\" r=\"2.5\" fill=\"#263238\"/><circle cx=\"44\" cy=\"48\" r=\"2.5\" fill=\"#263238\"/></svg>"),
    owl: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"66\" rx=\"34\" ry=\"36\" fill=\"#8D6E63\" stroke=\"#5D4037\" stroke-width=\"4\"/><polygon points=\"32,36 44,44 30,52\" fill=\"#5D4037\"/><polygon points=\"88,36 76,44 90,52\" fill=\"#5D4037\"/><circle cx=\"46\" cy=\"56\" r=\"13\" fill=\"#FFF8E1\"/><circle cx=\"74\" cy=\"56\" r=\"13\" fill=\"#FFF8E1\"/><circle cx=\"46\" cy=\"56\" r=\"5\" fill=\"#263238\"/><circle cx=\"74\" cy=\"56\" r=\"5\" fill=\"#263238\"/><polygon points=\"60,60 54,70 66,70\" fill=\"#FFA000\"/></svg>"),
    cooking: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"52\" cy=\"62\" r=\"34\" fill=\"#37474F\" stroke=\"#263238\" stroke-width=\"4\"/><rect x=\"82\" y=\"56\" width=\"28\" height=\"10\" rx=\"5\" fill=\"#FF7043\" stroke=\"#D84315\" stroke-width=\"3\"/><ellipse cx=\"52\" cy=\"62\" rx=\"22\" ry=\"20\" fill=\"#FFFFFF\"/><circle cx=\"52\" cy=\"62\" r=\"10\" fill=\"#FFB300\"/></svg>"),
    sweetpotato: ("<svg viewBox=\"0 0 120 120\"><ellipse cx=\"60\" cy=\"62\" rx=\"38\" ry=\"22\" transform=\"rotate(-25 60 62)\" fill=\"#8E24AA\" stroke=\"#6A1B9A\" stroke-width=\"4\"/><ellipse cx=\"72\" cy=\"56\" rx=\"14\" ry=\"12\" fill=\"#FFD54F\" stroke=\"#FBC02D\" stroke-width=\"3\"/></svg>"),
    dress_shoes: ("<svg viewBox=\"0 0 120 120\"><path d=\"M20 56 C20 82 36 88 96 88 C102 88 102 68 88 68 C68 68 62 78 44 74 C36 72 34 56 20 56 Z\" fill=\"#EC407A\" stroke=\"#C2185B\" stroke-width=\"4\"/><circle cx=\"84\" cy=\"66\" r=\"7\" fill=\"#FFD54F\" stroke=\"#F57F17\" stroke-width=\"2\"/></svg>"),
    head: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"64\" r=\"30\" fill=\"#FFE0B2\" stroke=\"#5D4037\" stroke-width=\"3\"/><path d=\"M28 60 C28 24 92 24 92 60 C84 42 36 42 28 60 Z\" fill=\"#3E2723\"/><path d=\"M84 26 L98 20 M88 36 L102 34\" stroke=\"#FF7043\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>"),
    kid: ("<svg viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"64\" r=\"28\" fill=\"#FFE0B2\" stroke=\"#5D4037\" stroke-width=\"3\"/><path d=\"M30 52 C30 26 90 26 90 52 Z\" fill=\"#29B6F6\" stroke=\"#0288D1\" stroke-width=\"3\"/><rect x=\"54\" y=\"46\" width=\"44\" height=\"8\" rx=\"4\" fill=\"#0288D1\"/><circle cx=\"48\" cy=\"62\" r=\"3.5\" fill=\"#3E2723\"/><circle cx=\"72\" cy=\"62\" r=\"3.5\" fill=\"#3E2723\"/><path d=\"M50 74 Q60 82 70 74\" stroke=\"#5D4037\" stroke-width=\"3.5\" fill=\"none\" stroke-linecap=\"round\"/></svg>"),
    cabbage: ("<svg viewBox=\"0 0 120 120\"><path d=\"M40 94 C26 70 26 30 48 26 C56 24 64 24 72 26 C94 30 94 70 80 94 Z\" fill=\"#81C784\" stroke=\"#388E3C\" stroke-width=\"4\"/><path d=\"M44 94 C40 66 80 66 76 94 Z\" fill=\"#FFF9C4\" stroke=\"#AED581\" stroke-width=\"3\"/><path d=\"M60 32 V88\" stroke=\"#F1F8E9\" stroke-width=\"5\" stroke-linecap=\"round\"/></svg>")
  };

  // 단계별 메타 정보
  var STAGE_META = {
    1: { id: 1, title: "1단계 · 모음 놀이터", short: "ㅏ·ㅑ·ㅓ·ㅕ·ㅗ", desc: "첫소리가 모음과 똑같은 낱말로 쉽게 배워요!" },
    2: { id: 2, title: "2단계 · 자음 놀이터", short: "ㄱ·ㄴ·ㄷ·ㄹ·ㅁ", desc: "단어의 첫 글자 자음 친구들을 찾아봐요!" },
    3: { id: 3, title: "3단계 · 글자 합체", short: "가·나·다·고·구", desc: "자음과 모음이 만난 첫 글자를 맞춰봐요!" },
    4: { id: 4, title: "4단계 · 쉬운 낱말", short: "나비·바나나·무지개", desc: "받침이 없는 재미있는 생활·동물 낱말을 읽어요!" },
    5: { id: 5, title: "5단계 · 받침 낱말", short: "구름·강아지·선물", desc: "받침이 있는 다양한 낱말까지 척척 읽고 써요!" }
  };

  var CURRICULUM = {
    // 1단계(모음): 모든 단어의 첫 글자가 'ㅇ + 해당 모음'(받침 없음)으로 100% 일치!
    1: [
      { char: "ㅏ", tts: "아", word: "아이", hint: "아이 할 때 첫소리, 아!", icon: "child", jamo: ["ㅇ", "ㅏ"], buildTarget: "아" },
      { char: "ㅑ", tts: "야", word: "야구공", hint: "야구공 할 때 첫소리, 야!", icon: "baseball", jamo: ["ㅇ", "ㅑ"], buildTarget: "야" },
      { char: "ㅓ", tts: "어", word: "어항", hint: "물고기 어항 할 때 첫소리, 어!", icon: "fishbowl", jamo: ["ㅇ", "ㅓ"], buildTarget: "어" },
      { char: "ㅕ", tts: "여", word: "여우", hint: "여우 할 때 첫소리, 여!", icon: "fox", jamo: ["ㅇ", "ㅕ"], buildTarget: "여" },
      { char: "ㅗ", tts: "오", word: "오이", hint: "오이 할 때 첫소리, 오!", icon: "cucumber", jamo: ["ㅇ", "ㅗ"], buildTarget: "오" },
      { char: "ㅛ", tts: "요", word: "요리", hint: "맛있는 요리 할 때 첫소리, 요!", icon: "cooking", jamo: ["ㅇ", "ㅛ"], buildTarget: "요" },
      { char: "ㅜ", tts: "우", word: "우유", hint: "고소한 우유 할 때 첫소리, 우!", icon: "milk", jamo: ["ㅇ", "ㅜ"], buildTarget: "우" },
      { char: "ㅠ", tts: "유", word: "유모차", hint: "아기 유모차 할 때 첫소리, 유!", icon: "stroller", jamo: ["ㅇ", "ㅠ"], buildTarget: "유" },
      { char: "ㅡ", tts: "으", word: "으뜸", hint: "최고 으뜸 할 때 첫소리, 으!", icon: "trophy", jamo: ["ㅇ", "ㅡ"], buildTarget: "으" },
      { char: "ㅣ", tts: "이", word: "이빨", hint: "하얀 이빨 할 때 첫소리, 이!", icon: "tooth", jamo: ["ㅇ", "ㅣ"], buildTarget: "이" },
      { char: "ㅐ", tts: "애", word: "애벌레", hint: "꼬물꼬물 애벌레 할 때 첫소리, 애!", icon: "caterpillar", jamo: ["ㅇ", "ㅐ"], buildTarget: "애" },
      { char: "ㅘ", tts: "와", word: "와플", hint: "달콤한 와플 할 때 첫소리, 와!", icon: "waffle", jamo: ["ㅇ", "ㅘ"], buildTarget: "와" },
      { char: "ㅚ", tts: "외", word: "외계인", hint: "우주 외계인 할 때 첫소리, 외!", icon: "alien", jamo: ["ㅇ", "ㅚ"], buildTarget: "외" }
    ],

    // 2단계(자음): 모든 단어의 첫 글자 초성이 해당 자음과 100% 일치하며, 받침 없는 첫 글자 단어들로 구성!
    2: [
      { char: "ㄱ", tts: "기역", word: "가방", hint: "가방의 첫 자음 기역이에요", icon: "bag", jamo: ["ㄱ", "ㅏ"], buildTarget: "가" },
      { char: "ㄴ", tts: "니은", word: "나비", hint: "나비의 첫 자음 니은이에요", icon: "butterfly", jamo: ["ㄴ", "ㅏ"], buildTarget: "나" },
      { char: "ㄷ", tts: "디귿", word: "도토리", hint: "도토리의 첫 자음 디귿이에요", icon: "acorn", jamo: ["ㄷ", "ㅗ"], buildTarget: "도" },
      { char: "ㄹ", tts: "리을", word: "로봇", hint: "로봇의 첫 자음 리을이에요", icon: "robot", jamo: ["ㄹ", "ㅗ"], buildTarget: "로" },
      { char: "ㅁ", tts: "미음", word: "모자", hint: "모자의 첫 자음 미음이에요", icon: "hat", jamo: ["ㅁ", "ㅗ"], buildTarget: "모" },
      { char: "ㅂ", tts: "비읍", word: "바나나", hint: "바나나의 첫 자음 비읍이에요", icon: "banana", jamo: ["ㅂ", "ㅏ"], buildTarget: "바" },
      { char: "ㅅ", tts: "시옷", word: "사자", hint: "사자의 첫 자음 시옷이에요", icon: "lion", jamo: ["ㅅ", "ㅏ"], buildTarget: "사" },
      { char: "ㅇ", tts: "이응", word: "오리", hint: "오리의 첫 자음 이응이에요", icon: "duck", jamo: ["ㅇ", "ㅗ"], buildTarget: "오" },
      { char: "ㅈ", tts: "지읒", word: "자동차", hint: "자동차의 첫 자음 지읒이에요", icon: "car", jamo: ["ㅈ", "ㅏ"], buildTarget: "자" },
      { char: "ㅊ", tts: "치읓", word: "치즈", hint: "치즈의 첫 자음 치읓이에요", icon: "cheese", jamo: ["ㅊ", "ㅣ"], buildTarget: "치" },
      { char: "ㅋ", tts: "키읔", word: "코끼리", hint: "코끼리의 첫 자음 키읔이에요", icon: "elephant", jamo: ["ㅋ", "ㅗ"], buildTarget: "코" },
      { char: "ㅌ", tts: "티읕", word: "토끼", hint: "토끼의 첫 자음 티읕이에요", icon: "rabbit", jamo: ["ㅌ", "ㅗ"], buildTarget: "토" },
      { char: "ㅍ", tts: "피읖", word: "포도", hint: "포도의 첫 자음 피읖이에요", icon: "grape", jamo: ["ㅍ", "ㅗ"], buildTarget: "포" },
      { char: "ㅎ", tts: "히읗", word: "하마", hint: "하마의 첫 자음 히읗이에요", icon: "hippo", jamo: ["ㅎ", "ㅏ"], buildTarget: "하" },
      { char: "ㄲ", tts: "쌍기역", word: "꼬마", hint: "귀여운 꼬마의 첫 자음 쌍기역이에요", icon: "kid", jamo: ["ㄲ", "ㅗ"], buildTarget: "꼬" },
      { char: "ㅆ", tts: "쌍시옷", word: "씨앗", hint: "씨앗의 첫 자음 쌍시옷이에요", icon: "seed", jamo: ["ㅆ", "ㅣ"], buildTarget: "씨" },
      { char: "ㅉ", tts: "쌍지읒", word: "찌개", hint: "찌개의 첫 자음 쌍지읒이에요", icon: "stew", jamo: ["ㅉ", "ㅣ"], buildTarget: "찌" }
    ],

    // 3단계(글자 합체): 모든 항목이 100% [word.charAt(0) === char] 규칙을 만족하도록 엄선!
    // ('서→선물', '따→딸기'처럼 받침 유무가 다른 불일치 완전 제거!)
    3: [
      { char: "가", tts: "가", word: "가방", hint: "가방의 첫 글자 가!", icon: "bag", jamo: ["ㄱ", "ㅏ"], buildTarget: "가" },
      { char: "나", tts: "나", word: "나비", hint: "나비의 첫 글자 나!", icon: "butterfly", jamo: ["ㄴ", "ㅏ"], buildTarget: "나" },
      { char: "다", tts: "다", word: "다람쥐", hint: "다람쥐의 첫 글자 다!", icon: "squirrel", jamo: ["ㄷ", "ㅏ"], buildTarget: "다" },
      { char: "라", tts: "라", word: "라디오", hint: "라디오의 첫 글자 라!", icon: "radio", jamo: ["ㄹ", "ㅏ"], buildTarget: "라" },
      { char: "바", tts: "바", word: "바나나", hint: "바나나의 첫 글자 바!", icon: "banana", jamo: ["ㅂ", "ㅏ"], buildTarget: "바" },
      { char: "사", tts: "사", word: "사자", hint: "사자의 첫 글자 사!", icon: "lion", jamo: ["ㅅ", "ㅏ"], buildTarget: "사" },
      { char: "아", tts: "아", word: "아이", hint: "아이의 첫 글자 아!", icon: "child", jamo: ["ㅇ", "ㅏ"], buildTarget: "아" },
      { char: "자", tts: "자", word: "자동차", hint: "자동차의 첫 글자 자!", icon: "car", jamo: ["ㅈ", "ㅏ"], buildTarget: "자" },
      { char: "카", tts: "카", word: "카메라", hint: "카메라의 첫 글자 카!", icon: "camera", jamo: ["ㅋ", "ㅏ"], buildTarget: "카" },
      { char: "타", tts: "타", word: "타조", hint: "타조의 첫 글자 타!", icon: "ostrich", jamo: ["ㅌ", "ㅏ"], buildTarget: "타" },
      { char: "파", tts: "파", word: "파도", hint: "파도의 첫 글자 파!", icon: "wave", jamo: ["ㅍ", "ㅏ"], buildTarget: "파" },
      { char: "하", tts: "하", word: "하마", hint: "하마의 첫 글자 하!", icon: "hippo", jamo: ["ㅎ", "ㅏ"], buildTarget: "하" },
      { char: "거", tts: "거", word: "거북이", hint: "거북이의 첫 글자 거!", icon: "turtle", jamo: ["ㄱ", "ㅓ"], buildTarget: "거" },
      { char: "너", tts: "너", word: "너구리", hint: "너구리의 첫 글자 너!", icon: "raccoon", jamo: ["ㄴ", "ㅓ"], buildTarget: "너" },
      { char: "머", tts: "머", word: "머리", hint: "머리의 첫 글자 머!", icon: "head", jamo: ["ㅁ", "ㅓ"], buildTarget: "머" },
      { char: "버", tts: "버", word: "버스", hint: "버스의 첫 글자 버!", icon: "bus", jamo: ["ㅂ", "ㅓ"], buildTarget: "버" },
      { char: "서", tts: "서", word: "서랍", hint: "서랍의 첫 글자 서!", icon: "drawer", jamo: ["ㅅ", "ㅓ"], buildTarget: "서" },
      { char: "어", tts: "어", word: "어항", hint: "어항의 첫 글자 어!", icon: "fishbowl", jamo: ["ㅇ", "ㅓ"], buildTarget: "어" },
      { char: "여", tts: "여", word: "여우", hint: "여우의 첫 글자 여!", icon: "fox", jamo: ["ㅇ", "ㅕ"], buildTarget: "여" },
      { char: "고", tts: "고", word: "고래", hint: "고래의 첫 글자 고!", icon: "whale", jamo: ["ㄱ", "ㅗ"], buildTarget: "고" },
      { char: "도", tts: "도", word: "도토리", hint: "도토리의 첫 글자 도!", icon: "acorn", jamo: ["ㄷ", "ㅗ"], buildTarget: "도" },
      { char: "로", tts: "로", word: "로봇", hint: "로봇의 첫 글자 로!", icon: "robot", jamo: ["ㄹ", "ㅗ"], buildTarget: "로" },
      { char: "모", tts: "모", word: "모자", hint: "모자의 첫 글자 모!", icon: "hat", jamo: ["ㅁ", "ㅗ"], buildTarget: "모" },
      { char: "보", tts: "보", word: "보석", hint: "보석의 첫 글자 보!", icon: "gem", jamo: ["ㅂ", "ㅗ"], buildTarget: "보" },
      { char: "오", tts: "오", word: "오리", hint: "오리의 첫 글자 오!", icon: "duck", jamo: ["ㅇ", "ㅗ"], buildTarget: "오" },
      { char: "코", tts: "코", word: "코끼리", hint: "코끼리의 첫 글자 코!", icon: "elephant", jamo: ["ㅋ", "ㅗ"], buildTarget: "코" },
      { char: "토", tts: "토", word: "토끼", hint: "토끼의 첫 글자 토!", icon: "rabbit", jamo: ["ㅌ", "ㅗ"], buildTarget: "토" },
      { char: "포", tts: "포", word: "포도", hint: "포도의 첫 글자 포!", icon: "grape", jamo: ["ㅍ", "ㅗ"], buildTarget: "포" },
      { char: "호", tts: "호", word: "호랑이", hint: "호랑이의 첫 글자 호!", icon: "tiger", jamo: ["ㅎ", "ㅗ"], buildTarget: "호" },
      { char: "구", tts: "구", word: "구름", hint: "구름의 첫 글자 구!", icon: "cloud", jamo: ["ㄱ", "ㅜ"], buildTarget: "구" },
      { char: "두", tts: "두", word: "두부", hint: "두부의 첫 글자 두!", icon: "tofu", jamo: ["ㄷ", "ㅜ"], buildTarget: "두" },
      { char: "무", tts: "무", word: "무지개", hint: "무지개의 첫 글자 무!", icon: "rainbow", jamo: ["ㅁ", "ㅜ"], buildTarget: "무" },
      { char: "부", tts: "부", word: "부엉이", hint: "부엉이의 첫 글자 부!", icon: "owl", jamo: ["ㅂ", "ㅜ"], buildTarget: "부" },
      { char: "수", tts: "수", word: "수박", hint: "수박의 첫 글자 수!", icon: "watermelon", jamo: ["ㅅ", "ㅜ"], buildTarget: "수" },
      { char: "우", tts: "우", word: "우산", hint: "우산의 첫 글자 우!", icon: "umbrella", jamo: ["ㅇ", "ㅜ"], buildTarget: "우" },
      { char: "주", tts: "주", word: "주스", hint: "주스의 첫 글자 주!", icon: "juice", jamo: ["ㅈ", "ㅜ"], buildTarget: "주" },
      { char: "기", tts: "기", word: "기린", hint: "기린의 첫 글자 기!", icon: "giraffe", jamo: ["ㄱ", "ㅣ"], buildTarget: "기" },
      { char: "비", tts: "비", word: "비행기", hint: "비행기의 첫 글자 비!", icon: "airplane", jamo: ["ㅂ", "ㅣ"], buildTarget: "비" },
      { char: "시", tts: "시", word: "시계", hint: "시계의 첫 글자 시!", icon: "clock", jamo: ["ㅅ", "ㅣ"], buildTarget: "시" },
      { char: "지", tts: "지", word: "지구", hint: "지구의 첫 글자 지!", icon: "earth", jamo: ["ㅈ", "ㅣ"], buildTarget: "지" },
      { char: "치", tts: "치", word: "치즈", hint: "치즈의 첫 글자 치!", icon: "cheese", jamo: ["ㅊ", "ㅣ"], buildTarget: "치" },
      { char: "키", tts: "키", word: "키위", hint: "키위의 첫 글자 키!", icon: "kiwi", jamo: ["ㅋ", "ㅣ"], buildTarget: "키" },
      { char: "피", tts: "피", word: "피자", hint: "피자의 첫 글자 피!", icon: "pizza", jamo: ["ㅍ", "ㅣ"], buildTarget: "피" },
      { char: "개", tts: "개", word: "개구리", hint: "개구리의 첫 글자 개!", icon: "frog", jamo: ["ㄱ", "ㅐ"], buildTarget: "개" },
      { char: "배", tts: "배", word: "배추", hint: "배추의 첫 글자 배!", icon: "cabbage", jamo: ["ㅂ", "ㅐ"], buildTarget: "배" }
    ],

    // 4단계: 모든 글자에 받침이 없는 순수 무받침 낱말 (buildTarget === 첫 글자와 100% 일치!)
    4: [
      { char: "아이", tts: "아이", word: "아이", hint: "방긋 웃는 귀여운 아이!", icon: "child", jamo: ["ㅇ", "ㅏ"], buildTarget: "아" },
      { char: "오이", tts: "오이", word: "오이", hint: "아삭아삭 초록색 오이!", icon: "cucumber", jamo: ["ㅇ", "ㅗ"], buildTarget: "오" },
      { char: "나비", tts: "나비", word: "나비", hint: "팔랑팔랑 날아가는 나비!", icon: "butterfly", jamo: ["ㄴ", "ㅏ"], buildTarget: "나" },
      { char: "모자", tts: "모자", word: "모자", hint: "머리에 멋지게 쓰는 모자!", icon: "hat", jamo: ["ㅁ", "ㅗ"], buildTarget: "모" },
      { char: "바나나", tts: "바나나", word: "바나나", hint: "달콤하고 노란 바나나!", icon: "banana", jamo: ["ㅂ", "ㅏ"], buildTarget: "바" },
      { char: "사자", tts: "사자", word: "사자", hint: "갈기가 멋진 사자!", icon: "lion", jamo: ["ㅅ", "ㅏ"], buildTarget: "사" },
      { char: "우유", tts: "우유", word: "우유", hint: "키가 쑥쑥 크는 하얀 우유!", icon: "milk", jamo: ["ㅇ", "ㅜ"], buildTarget: "우" },
      { char: "나무", tts: "나무", word: "나무", hint: "푸른 잎이 자라는 나무!", icon: "tree", jamo: ["ㄴ", "ㅏ"], buildTarget: "나" },
      { char: "포도", tts: "포도", word: "포도", hint: "송이송이 보라색 포도!", icon: "grape", jamo: ["ㅍ", "ㅗ"], buildTarget: "포" },
      { char: "하마", tts: "하마", word: "하마", hint: "입을 크게 벌린 하마!", icon: "hippo", jamo: ["ㅎ", "ㅏ"], buildTarget: "하" },
      { char: "기차", tts: "기차", word: "기차", hint: "칙칙폭폭 달리는 기차!", icon: "train", jamo: ["ㄱ", "ㅣ"], buildTarget: "기" },
      { char: "토끼", tts: "토끼", word: "토끼", hint: "귀가 쫑긋 귀여운 토끼!", icon: "rabbit", jamo: ["ㅌ", "ㅗ"], buildTarget: "토" },
      { char: "오리", tts: "오리", word: "오리", hint: "연못에서 헤엄치는 노란 오리!", icon: "duck", jamo: ["ㅇ", "ㅗ"], buildTarget: "오" },
      { char: "여우", tts: "여우", word: "여우", hint: "꼬리가 복슬복슬한 여우!", icon: "fox", jamo: ["ㅇ", "ㅕ"], buildTarget: "여" },
      { char: "고래", tts: "고래", word: "고래", hint: "바다에서 물을 뿜는 고래!", icon: "whale", jamo: ["ㄱ", "ㅗ"], buildTarget: "고" },
      { char: "개구리", tts: "개구리", word: "개구리", hint: "폴짝 뛰는 초록 개구리!", icon: "frog", jamo: ["ㄱ", "ㅐ"], buildTarget: "개" },
      { char: "코끼리", tts: "코끼리", word: "코끼리", hint: "코가 길고 귀가 큰 코끼리!", icon: "elephant", jamo: ["ㅋ", "ㅗ"], buildTarget: "코" },
      { char: "타조", tts: "타조", word: "타조", hint: "다리가 긴 타조!", icon: "ostrich", jamo: ["ㅌ", "ㅏ"], buildTarget: "타" },
      { char: "너구리", tts: "너구리", word: "너구리", hint: "눈 주위가 귀여운 너구리!", icon: "raccoon", jamo: ["ㄴ", "ㅓ"], buildTarget: "너" },
      { char: "돼지", tts: "돼지", word: "돼지", hint: "분홍색 코가 귀여운 돼지!", icon: "pig", jamo: ["ㄷ", "ㅙ"], buildTarget: "돼" },
      { char: "요리", tts: "요리", word: "요리", hint: "모락모락 맛있는 요리!", icon: "cooking", jamo: ["ㅇ", "ㅛ"], buildTarget: "요" },
      { char: "사과", tts: "사과", word: "사과", hint: "빨갛고 아삭아삭 맛있는 사과!", icon: "apple", jamo: ["ㅅ", "ㅏ"], buildTarget: "사" },
      { char: "키위", tts: "키위", word: "키위", hint: "새콤달콤 초록빛 키위!", icon: "kiwi", jamo: ["ㅋ", "ㅣ"], buildTarget: "키" },
      { char: "고구마", tts: "고구마", word: "고구마", hint: "달콤하고 맛있는 고구마!", icon: "sweetpotato", jamo: ["ㄱ", "ㅗ"], buildTarget: "고" },
      { char: "도토리", tts: "도토리", word: "도토리", hint: "다람쥐가 좋아하는 도토리!", icon: "acorn", jamo: ["ㄷ", "ㅗ"], buildTarget: "도" },
      { char: "두부", tts: "두부", word: "두부", hint: "하얗고 고소한 두부!", icon: "tofu", jamo: ["ㄷ", "ㅜ"], buildTarget: "두" },
      { char: "피자", tts: "피자", word: "피자", hint: "치즈가 쭉 늘어나는 피자!", icon: "pizza", jamo: ["ㅍ", "ㅣ"], buildTarget: "피" },
      { char: "주스", tts: "주스", word: "주스", hint: "과일로 만든 시원한 주스!", icon: "juice", jamo: ["ㅈ", "ㅜ"], buildTarget: "주" },
      { char: "치즈", tts: "치즈", word: "치즈", hint: "구멍이 뽕뽕 노란 치즈!", icon: "cheese", jamo: ["ㅊ", "ㅣ"], buildTarget: "치" },
      { char: "버스", tts: "버스", word: "버스", hint: "사람들을 태우고 달리는 노란 버스!", icon: "bus", jamo: ["ㅂ", "ㅓ"], buildTarget: "버" },
      { char: "배", tts: "배", word: "배", hint: "바다 위를 떠다니는 배!", icon: "ship", jamo: ["ㅂ", "ㅐ"], buildTarget: "배" },
      { char: "유모차", tts: "유모차", word: "유모차", hint: "아기가 타는 분홍 유모차!", icon: "stroller", jamo: ["ㅇ", "ㅠ"], buildTarget: "유" },
      { char: "피아노", tts: "피아노", word: "피아노", hint: "아름다운 소리가 나는 피아노!", icon: "piano", jamo: ["ㅍ", "ㅣ"], buildTarget: "피" },
      { char: "라디오", tts: "라디오", word: "라디오", hint: "신나는 노래가 나오는 라디오!", icon: "radio", jamo: ["ㄹ", "ㅏ"], buildTarget: "라" },
      { char: "카메라", tts: "카메라", word: "카메라", hint: "찰칵찰칵 사진을 찍는 카메라!", icon: "camera", jamo: ["ㅋ", "ㅏ"], buildTarget: "카" },
      { char: "구두", tts: "구두", word: "구두", hint: "발에 신는 예쁜 구두!", icon: "dress_shoes", jamo: ["ㄱ", "ㅜ"], buildTarget: "구" },
      { char: "시계", tts: "시계", word: "시계", hint: "째깍째깍 시간을 알려주는 시계!", icon: "clock", jamo: ["ㅅ", "ㅣ"], buildTarget: "시" },
      { char: "지구", tts: "지구", word: "지구", hint: "우리가 살고 있는 푸른 지구!", icon: "earth", jamo: ["ㅈ", "ㅣ"], buildTarget: "지" },
      { char: "파도", tts: "파도", word: "파도", hint: "바다에서 밀려오는 파도!", icon: "wave", jamo: ["ㅍ", "ㅏ"], buildTarget: "파" },
      { char: "무지개", tts: "무지개", word: "무지개", hint: "하늘에 뜨는 알록달록 무지개!", icon: "rainbow", jamo: ["ㅁ", "ㅜ"], buildTarget: "무" }
    ],

    // 5단계: 받침 있는 낱말 (초성+중성+종성 3자모 조립으로 실제 받침 글자와 100% 일치!)
    5: [
      { char: "달", tts: "달", word: "달", hint: "밤하늘에 환하게 뜬 초승달!", icon: "moon", jamo: ["ㄷ", "ㅏ", "ㄹ"], buildTarget: "달" },
      { char: "곰", tts: "곰", word: "곰", hint: "포근하고 귀여운 아기 곰!", icon: "bear", jamo: ["ㄱ", "ㅗ", "ㅁ"], buildTarget: "곰" },
      { char: "별", tts: "별", word: "별", hint: "밤하늘에 반짝반짝 빛나는 별!", icon: "star", jamo: ["ㅂ", "ㅕ", "ㄹ"], buildTarget: "별" },
      { char: "물", tts: "물", word: "물", hint: "시원하고 맑은 물!", icon: "water", jamo: ["ㅁ", "ㅜ", "ㄹ"], buildTarget: "물" },
      { char: "밥", tts: "밥", word: "밥", hint: "모락모락 맛있는 하얀 밥!", icon: "rice", jamo: ["ㅂ", "ㅏ", "ㅂ"], buildTarget: "밥" },
      { char: "눈", tts: "눈", word: "눈", hint: "겨울에 만드는 하얀 눈사람!", icon: "snow", jamo: ["ㄴ", "ㅜ", "ㄴ"], buildTarget: "눈" },
      { char: "공", tts: "공", word: "공", hint: "통통 튀는 동그란 공!", icon: "ball", jamo: ["ㄱ", "ㅗ", "ㅇ"], buildTarget: "공" },
      { char: "집", tts: "집", word: "집", hint: "우리가 사는 따뜻한 집!", icon: "house", jamo: ["ㅈ", "ㅣ", "ㅂ"], buildTarget: "집" },
      { char: "꽃", tts: "꽃", word: "꽃", hint: "향기롭고 예쁘게 핀 꽃!", icon: "flower", jamo: ["ㄲ", "ㅗ", "ㅊ"], buildTarget: "꽃" },
      { char: "구름", tts: "구름", word: "구름", hint: "하늘에 둥실둥실 떠 있는 구름!", icon: "cloud", jamo: ["ㄹ", "ㅡ", "ㅁ"], buildTarget: "름" },
      { char: "수박", tts: "수박", word: "수박", hint: "줄무늬가 멋진 시원한 수박!", icon: "watermelon", jamo: ["ㅂ", "ㅏ", "ㄱ"], buildTarget: "박" },
      { char: "가방", tts: "가방", word: "가방", hint: "어깨에 메는 멋진 가방!", icon: "bag", jamo: ["ㅂ", "ㅏ", "ㅇ"], buildTarget: "방" },
      { char: "서랍", tts: "서랍", word: "서랍", hint: "물건을 정리하는 서랍!", icon: "drawer", jamo: ["ㄹ", "ㅏ", "ㅂ"], buildTarget: "랍" },
      { char: "보석", tts: "보석", word: "보석", hint: "반짝반짝 빛나는 보석!", icon: "gem", jamo: ["ㅅ", "ㅓ", "ㄱ"], buildTarget: "석" },
      { char: "호랑이", tts: "호랑이", word: "호랑이", hint: "줄무늬가 용감한 호랑이!", icon: "tiger", jamo: ["ㄹ", "ㅏ", "ㅇ"], buildTarget: "랑" },
      { char: "다람쥐", tts: "다람쥐", word: "다람쥐", hint: "도토리를 좋아하는 귀여운 다람쥐!", icon: "squirrel", jamo: ["ㄹ", "ㅏ", "ㅁ"], buildTarget: "람" },
      { char: "부엉이", tts: "부엉이", word: "부엉이", hint: "밤에 눈이 동그란 부엉이!", icon: "owl", jamo: ["ㅇ", "ㅓ", "ㅇ"], buildTarget: "엉" },
      { char: "고양이", tts: "고양이", word: "고양이", hint: "야옹야옹 귀여운 고양이!", icon: "cat", jamo: ["ㅇ", "ㅑ", "ㅇ"], buildTarget: "양" },
      { char: "강아지", tts: "강아지", word: "강아지", hint: "꼬리를 흔드는 귀여운 강아지!", icon: "dog", jamo: ["ㄱ", "ㅏ", "ㅇ"], buildTarget: "강" },
      { char: "거북이", tts: "거북이", word: "거북이", hint: "등딱지가 튼튼한 거북이!", icon: "turtle", jamo: ["ㅂ", "ㅜ", "ㄱ"], buildTarget: "북" },
      { char: "펭귄", tts: "펭귄", word: "펭귄", hint: "얼음 위를 뒤뚱뒤뚱 걷는 펭귄!", icon: "penguin", jamo: ["ㅍ", "ㅔ", "ㅇ"], buildTarget: "펭" },
      { char: "공룡", tts: "공룡", word: "공룡", hint: "초록빛 몸집이 멋진 공룡!", icon: "dinosaur", jamo: ["ㄱ", "ㅗ", "ㅇ"], buildTarget: "공" },
      { char: "기린", tts: "기린", word: "기린", hint: "목이 아주아주 긴 기린!", icon: "giraffe", jamo: ["ㄹ", "ㅣ", "ㄴ"], buildTarget: "린" },
      { char: "원숭이", tts: "원숭이", word: "원숭이", hint: "바나나를 좋아하는 원숭이!", icon: "monkey", jamo: ["ㅅ", "ㅜ", "ㅇ"], buildTarget: "숭" },
      { char: "꿀벌", tts: "꿀벌", word: "꿀벌", hint: "꽃에서 꿀을 모으는 꿀벌!", icon: "bee", jamo: ["ㄲ", "ㅜ", "ㄹ"], buildTarget: "꿀" },
      { char: "딸기", tts: "딸기", word: "딸기", hint: "새콤달콤 빨간 딸기!", icon: "strawberry", jamo: ["ㄸ", "ㅏ", "ㄹ"], buildTarget: "딸" },
      { char: "빵", tts: "빵", word: "빵", hint: "갓 구워 폭신폭신하고 맛있는 빵!", icon: "bread", jamo: ["ㅃ", "ㅏ", "ㅇ"], buildTarget: "빵" },
      { char: "당근", tts: "당근", word: "당근", hint: "토끼가 좋아하는 주황색 당근!", icon: "carrot", jamo: ["ㄷ", "ㅏ", "ㅇ"], buildTarget: "당" },
      { char: "버섯", tts: "버섯", word: "버섯", hint: "우산 모양을 닮은 귀여운 버섯!", icon: "mushroom", jamo: ["ㅅ", "ㅓ", "ㅅ"], buildTarget: "섯" },
      { char: "옥수수", tts: "옥수수", word: "옥수수", hint: "노란 알맹이가 가득한 옥수수!", icon: "corn", jamo: ["ㅇ", "ㅗ", "ㄱ"], buildTarget: "옥" },
      { char: "책", tts: "책", word: "책", hint: "재미있는 이야기가 가득한 동화책!", icon: "book", jamo: ["ㅊ", "ㅐ", "ㄱ"], buildTarget: "책" },
      { char: "연필", tts: "연필", word: "연필", hint: "글씨를 사각사각 쓰는 연필!", icon: "pencil", jamo: ["ㅍ", "ㅣ", "ㄹ"], buildTarget: "필" },
      { char: "우산", tts: "우산", word: "우산", hint: "비가 올 때 활짝 펴는 우산!", icon: "umbrella", jamo: ["ㅅ", "ㅏ", "ㄴ"], buildTarget: "산" },
      { char: "안경", tts: "안경", word: "안경", hint: "눈이 잘 보이게 도와주는 안경!", icon: "glasses", jamo: ["ㅇ", "ㅏ", "ㄴ"], buildTarget: "안" },
      { char: "신발", tts: "신발", word: "신발", hint: "밖에 나갈 때 신는 신발!", icon: "shoes", jamo: ["ㅅ", "ㅣ", "ㄴ"], buildTarget: "신" },
      { char: "선물", tts: "선물", word: "선물", hint: "예쁜 리본으로 포장된 선물!", icon: "gift", jamo: ["ㅅ", "ㅓ", "ㄴ"], buildTarget: "선" },
      { char: "로봇", tts: "로봇", word: "로봇", hint: "멋지게 움직이는 장난감 로봇!", icon: "robot", jamo: ["ㅂ", "ㅗ", "ㅅ"], buildTarget: "봇" },
      { char: "비행기", tts: "비행기", word: "비행기", hint: "하늘 높이 날아가는 비행기!", icon: "airplane", jamo: ["ㅎ", "ㅐ", "ㅇ"], buildTarget: "행" },
      { char: "산", tts: "산", word: "산", hint: "나무가 푸르게 우거진 높은 산!", icon: "mountain", jamo: ["ㅅ", "ㅏ", "ㄴ"], buildTarget: "산" },
      { char: "어항", tts: "어항", word: "어항", hint: "금붕어가 헤엄치는 투명한 어항!", icon: "fishbowl", jamo: ["ㅎ", "ㅏ", "ㅇ"], buildTarget: "항" },
      { char: "이빨", tts: "이빨", word: "이빨", hint: "치카치카 깨끗하게 닦는 하얀 이빨!", icon: "tooth", jamo: ["ㅃ", "ㅏ", "ㄹ"], buildTarget: "빨" },
      { char: "씨앗", tts: "씨앗", word: "씨앗", hint: "땅속에서 새싹이 자라나는 씨앗!", icon: "seed", jamo: ["ㅇ", "ㅏ", "ㅅ"], buildTarget: "앗" },
      { char: "애벌레", tts: "애벌레", word: "애벌레", hint: "꼬물꼬물 귀여운 초록 애벌레!", icon: "caterpillar", jamo: ["ㅂ", "ㅓ", "ㄹ"], buildTarget: "벌" }
    ]
  };

  // 스티커북 보상 카탈로그 (단계별 12종 × 5단계 = 총 60종)
  var STICKER_CATALOG = [
    // 1단계 · 모음 놀이터 (12종)
    { id: "stk_bear", stage: 1, category: "animal", name: "춤추는 보리", desc: "으쌰으쌰 신나게 춤추는 아기곰 보리!", icon: "bear" },
    { id: "stk_child", stage: 1, category: "animal", name: "방긋 웃는 아이", desc: "해맑게 까르르 웃는 귀여운 아이 친구", icon: "child" },
    { id: "stk_baseball", stage: 1, category: "toy", name: "홈런 야구공", desc: "하늘 높이 쌩~ 날아가는 하얀 야구공", icon: "baseball" },
    { id: "stk_fishbowl", stage: 1, category: "animal", name: "보글보글 어항", desc: "예쁜 금붕어가 헤엄치는 투명한 어항", icon: "fishbowl" },
    { id: "stk_fox", stage: 1, category: "animal", name: "복슬복슬 여우", desc: "주황색 꼬리가 멋스러운 똑똑한 여우", icon: "fox" },
    { id: "stk_cucumber", stage: 1, category: "food", name: "아삭아삭 오이", desc: "싱그럽고 시원한 초록빛 오이", icon: "cucumber" },
    { id: "stk_cooking", stage: 1, category: "food", name: "지글지글 요리", desc: "프라이팬 위에서 맛있는 냄새가 솔솔!", icon: "cooking" },
    { id: "stk_milk", stage: 1, category: "food", name: "튼튼 하얀 우유", desc: "꿀꺽꿀꺽 마시면 키가 쑥쑥 크는 우유", icon: "milk" },
    { id: "stk_stroller", stage: 1, category: "vehicle", name: "아기 유모차", desc: "보들보들 아기가 타고 산책하는 유모차", icon: "stroller" },
    { id: "stk_tooth", stage: 1, category: "toy", name: "반짝 하얀 이빨", desc: "치카치카 양치질을 잘해서 빛나는 이빨", icon: "tooth" },
    { id: "stk_waffle", stage: 1, category: "food", name: "꿀맛 바삭 와플", desc: "달콤한 버터가 사르르 녹는 노란 와플", icon: "waffle" },
    { id: "stk_alien", stage: 1, category: "animal", name: "뿅뿅 우주 외계인", desc: "별나라에서 놀러 온 귀여운 외계인 친구", icon: "alien" },

    // 2단계 · 자음 놀이터 (12종)
    { id: "stk_bag", stage: 2, category: "toy", name: "소풍 가는 가방", desc: "맛있는 간식을 가득 넣은 노란 가방", icon: "bag" },
    { id: "stk_butterfly", stage: 2, category: "animal", name: "봄바람 나비", desc: "꽃밭을 훨훨 날아다니는 분홍 나비", icon: "butterfly" },
    { id: "stk_acorn", stage: 2, category: "nature", name: "데구르르 도토리", desc: "다람쥐가 가장 좋아하는 반질반질 도토리", icon: "acorn" },
    { id: "stk_robot", stage: 2, category: "toy", name: "삐리삐리 로봇", desc: "반짝이는 눈을 가진 장난감 로봇", icon: "robot" },
    { id: "stk_hat", stage: 2, category: "toy", name: "멋쟁이 밀짚모자", desc: "햇살 좋은 날 머리에 쓰는 노란 모자", icon: "hat" },
    { id: "stk_banana", stage: 2, category: "food", name: "웃음꽃 바나나", desc: "달콤하고 부드러운 노란 바나나", icon: "banana" },
    { id: "stk_lion", stage: 2, category: "animal", name: "멋쟁이 사자왕", desc: "황금빛 갈기가 멋진 용감한 사자!", icon: "lion" },
    { id: "stk_duck", stage: 2, category: "animal", name: "꽥꽥 노란오리", desc: "연못 위를 둥실둥실 헤엄치는 오리", icon: "duck" },
    { id: "stk_car", stage: 2, category: "vehicle", name: "붕붕 파란차", desc: "어디든 쌩쌩 달리는 귀여운 자동차", icon: "car" },
    { id: "stk_cheese", stage: 2, category: "food", name: "구멍 뽕뽕 치즈", desc: "고소하고 부드러운 노란 삼각 치즈", icon: "cheese" },
    { id: "stk_elephant", stage: 2, category: "animal", name: "뿌우 아기코끼리", desc: "긴 코로 분수를 뿜는 다정한 코끼리", icon: "elephant" },
    { id: "stk_stew", stage: 2, category: "food", name: "보글보글 찌개", desc: "따끈따끈 온 가족이 모여 먹는 맛있는 찌개", icon: "stew" },

    // 3단계 · 글자 합체 (12종)
    { id: "stk_squirrel", stage: 3, category: "animal", name: "폴짝 다람쥐", desc: "복슬복슬 꼬리를 흔드는 숲속 다람쥐", icon: "squirrel" },
    { id: "stk_radio", stage: 3, category: "toy", name: "랄랄라 라디오", desc: "신나는 동요가 흘러나오는 파란 라디오", icon: "radio" },
    { id: "stk_camera", stage: 3, category: "toy", name: "찰칵 카메라", desc: "예쁜 미소를 찰칵 담아주는 카메라", icon: "camera" },
    { id: "stk_ostrich", stage: 3, category: "animal", name: "롱다리 타조", desc: "초원을 바람처럼 빠르게 달리는 타조", icon: "ostrich" },
    { id: "stk_wave", stage: 3, category: "nature", name: "철썩철썩 파도", desc: "시원한 바다에서 춤추듯 밀려오는 파도", icon: "wave" },
    { id: "stk_raccoon", stage: 3, category: "animal", name: "안경 쓴 너구리", desc: "동글동글 눈매가 귀여운 장난꾸러기 너구리", icon: "raccoon" },
    { id: "stk_bus", stage: 3, category: "vehicle", name: "부릉 노란버스", desc: "친구들을 태우고 유치원으로 달리는 버스", icon: "bus" },
    { id: "stk_gem", stage: 3, category: "nature", name: "반짝이 보석", desc: "무지개빛으로 눈부시게 빛나는 파란 보석", icon: "gem" },
    { id: "stk_tofu", stage: 3, category: "food", name: "말랑 하얀두부", desc: "입안에서 사르르 녹는 영양 만점 두부", icon: "tofu" },
    { id: "stk_owl", stage: 3, category: "animal", name: "척척박사 부엉이", desc: "밤하늘 아래 동그란 눈을 반짝이는 부엉이", icon: "owl" },
    { id: "stk_kiwi", stage: 3, category: "food", name: "새콤 초록키위", desc: "초록 보석처럼 상큼하고 달콤한 키위", icon: "kiwi" },
    { id: "stk_frog", stage: 3, category: "animal", name: "개굴 초록개구리", desc: "연못 위에서 폴짝폴짝 높이 뛰는 개구리", icon: "frog" },

    // 4단계 · 쉬운 낱말 (12종)
    { id: "stk_rabbit", stage: 4, category: "animal", name: "깡충 분홍토끼", desc: "귀가 쫑긋! 당근을 좋아하는 토끼 친구", icon: "rabbit" },
    { id: "stk_train", stage: 4, category: "vehicle", name: "칙칙폭폭 기차", desc: "한글 나라로 신나게 달리는 빨간 기차", icon: "train" },
    { id: "stk_hippo", stage: 4, category: "animal", name: "하품쟁이 하마", desc: "입을 크게 벌리는 귀염둥이 하마", icon: "hippo" },
    { id: "stk_apple", stage: 4, category: "food", name: "발그레 사과", desc: "햇살을 먹고 빨갛게 익은 달콤 사과", icon: "apple" },
    { id: "stk_grape", stage: 4, category: "food", name: "탱글탱글 포도", desc: "알알이 모여 있는 보라색 포도송이", icon: "grape" },
    { id: "stk_whale", stage: 4, category: "animal", name: "푸른 바다 고래", desc: "분수를 뿜으며 헤엄치는 파란 고래", icon: "whale" },
    { id: "stk_rainbow", stage: 4, category: "nature", name: "일곱빛깔 무지개", desc: "하늘에 활짝 걸린 희망찬 무지개", icon: "rainbow" },
    { id: "stk_pig", stage: 4, category: "animal", name: "꿀꿀 아기돼지", desc: "분홍 코를 실룩실룩 움직이는 귀여운 돼지", icon: "pig" },
    { id: "stk_pizza", stage: 4, category: "food", name: "치즈 쭈욱 피자", desc: "고소한 치즈와 토핑이 듬뿍 올라간 피자", icon: "pizza" },
    { id: "stk_ship", stage: 4, category: "vehicle", name: "둥실 돛단배", desc: "파도를 가르며 바다를 여행하는 멋진 배", icon: "ship" },
    { id: "stk_piano", stage: 4, category: "toy", name: "딩동댕 피아노", desc: "건반을 누르면 아름다운 멜로디가 울려요", icon: "piano" },
    { id: "stk_earth", stage: 4, category: "nature", name: "푸른 별 지구", desc: "우리가 사이좋게 살아가는 아름다운 지구", icon: "earth" },

    // 5단계 · 받침 낱말 (12종)
    { id: "stk_star", stage: 5, category: "nature", name: "반짝이 아기별", desc: "밤하늘에서 윙크하는 노란 아기별", icon: "star" },
    { id: "stk_moon", stage: 5, category: "nature", name: "새근새근 달님", desc: "예쁜 꿈을 선물해 주는 초승달", icon: "moon" },
    { id: "stk_snow", stage: 5, category: "nature", name: "방긋 눈사람", desc: "빨간 목도리를 두른 겨울 눈사람", icon: "snow" },
    { id: "stk_watermelon", stage: 5, category: "food", name: "시원한 수박", desc: "여름날 제일 맛있는 빨간 수박 조각", icon: "watermelon" },
    { id: "stk_tiger", stage: 5, category: "animal", name: "용감한 호랑이", desc: "어흥! 줄무늬가 멋진 아기 호랑이", icon: "tiger" },
    { id: "stk_penguin", stage: 5, category: "animal", name: "뒤뚱뒤뚱 펭귄", desc: "얼음 위를 신나게 미끄러지는 펭귄", icon: "penguin" },
    { id: "stk_dinosaur", stage: 5, category: "animal", name: "쿵쾅 아기공룡", desc: "초록빛 몸집이 귀여운 아기 공룡", icon: "dinosaur" },
    { id: "stk_giraffe", stage: 5, category: "animal", name: "키다리 기린", desc: "구름까지 닿을 듯 목이 긴 기린 친구", icon: "giraffe" },
    { id: "stk_cat", stage: 5, category: "animal", name: "야옹 아기고양이", desc: "보들보들 귀여운 노란 고양이", icon: "cat" },
    { id: "stk_dog", stage: 5, category: "animal", name: "멍멍 강아지", desc: "꼬리를 살랑살랑 흔드는 강아지", icon: "dog" },
    { id: "stk_strawberry", stage: 5, category: "food", name: "새콤달콤 딸기", desc: "향이 솔솔 나는 빨간 딸기", icon: "strawberry" },
    { id: "stk_gift", stage: 5, category: "toy", name: "깜짝 선물상자", desc: "보리가 마음을 담아 준비한 리본 선물상자", icon: "gift" }
  ];

  var CHOSUNG_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  var JUNGSUNG_LIST = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
  var JONGSUNG_LIST = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

  var deckState = {};

  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var _tmp = copy[i]; copy[i] = copy[j]; copy[j] = _tmp;
    }
    return copy;
  }

  function drawNextItem(stageNum, gameKey) {
    if (gameKey === void 0) gameKey = "default";
    var pool = getStageItems(stageNum);
    var key = ((stageNum) + "_" + (gameKey));

    if (!deckState[key] || deckState[key].queue.length === 0) {
      var shuffled = shuffleArray(pool);
      if (
        deckState[key] &&
        deckState[key].lastChar &&
        shuffled.length > 1 &&
        shuffled[0].char === deckState[key].lastChar
      ) {
        var temp = shuffled[0];
        shuffled[0] = shuffled[shuffled.length - 1];
        shuffled[shuffled.length - 1] = temp;
      }
      deckState[key] = {
        queue: shuffled,
        lastChar: deckState[key] ? deckState[key].lastChar : null
      };
    }

    var nextItem = deckState[key].queue.shift();
    deckState[key].lastChar = nextItem.char;
    return nextItem;
  }

  function combineHangul(cho, jung, jong) {
    if (jong === void 0) jong = "";
    var choIdx = CHOSUNG_LIST.indexOf(cho);
    var jungIdx = JUNGSUNG_LIST.indexOf(jung);
    var jongIdx = Math.max(0, JONGSUNG_LIST.indexOf(jong || ""));
    if (choIdx === -1 || jungIdx === -1) return cho + jung + (jong || "");
    var code = 0xAC00 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx;
    return String.fromCharCode(code);
  }

  var svgUidCounter = 0;

  /**
   * 모바일 브라우저(삼성 인터넷 등) 강제 다크모드가 인라인 SVG의 밝은색/어두운색 fill·stroke를
   * 반전시켜 눈·코·입이나 흰색 그림이 깨지는 현상을 원천 방지하기 위해
   * 모든 hex 색상을 linearGradient PaintServer 참조로 변환합니다.
   */
  function protectSvgColorsFromDarkFilter(rawSvg) {
    svgUidCounter = (svgUidCounter + 1) % 100000;
    var prefix = ("hg_p_" + (svgUidCounter) + "_");
    var colorMap = new Map();
    var idx = 0;

    var replaced = rawSvg.replace(
      /\b(fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g,
      function (_, attr, hex) {
        var norm = hex.toUpperCase();
        if (!colorMap.has(norm)) {
          idx += 1;
          colorMap.set(norm, ((prefix) + (idx)));
        }
        return ((attr) + "=\"url(#" + (colorMap.get(norm)) + ")\"");
      }
    );

    if (colorMap.size === 0) return rawSvg;

    var defsInner = "";
    colorMap.forEach(function (gradId, hex) {
      defsInner += ("<linearGradient id=\"" + (gradId) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"" + (hex) + "\"/><stop offset=\"100%\" stop-color=\"" + (hex) + "\"/></linearGradient>");
    });

    return replaced.replace(/<svg\b([^>]*)>/, ("<svg$1><defs>" + (defsInner) + "</defs>"));
  }

  function getIllustSvg(key) {
    var raw = SVG_ILLUSTS[key] || SVG_ILLUSTS.star;
    return protectSvgColorsFromDarkFilter(raw);
  }

  function getStageItems(stageNum) {
    return CURRICULUM[stageNum] || CURRICULUM[1];
  }

  HG.Words = {
    STAGE_META: STAGE_META,
    CURRICULUM: CURRICULUM,
    STICKER_CATALOG: STICKER_CATALOG,
    SVG_ILLUSTS: SVG_ILLUSTS,
    combineHangul: combineHangul,
    getIllustSvg: getIllustSvg,
    getStageItems: getStageItems,
    drawNextItem: drawNextItem
  };
})(window.HG);
