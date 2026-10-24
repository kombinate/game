/**
 * ==========================================================================
 * 미니게임 3: 손가락 따라쓰기 (js/games/trace.js)
 * ==========================================================================
 * - 한글 표준 필순(획 순서) 벡터 경로 시스템
 * - '구름', '달', '별' 등 복잡한 받침/다중획 글자(ㄹ, ㅂ, ㅌ, ㅎ 등)도 획이 서로 겹치지 않도록
 *   자모 내부 여백 확장 + 음절 구조별 맞춤형 비율 + 정돈된 획 굵기 적용
 * - 각 획의 시작점에 획 순서 숫자(①, ②, ③...)와 방향 화살표 표시
 */

window.HG = window.HG || {};
window.HG.Games = window.HG.Games || {};

(function (HG) {
  "use strict";

  const CHOSUNG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const JUNGSUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
  const JONGSUNG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

  /**
   * 자모별 표준 필순(획 순서) 정규화 좌표 (0.0 ~ 1.0)
   * 다중 가로획 자모(ㄹ, ㄷ, ㅌ, ㅁ, ㅂ, ㅍ, ㅎ 등)의 상하 간격을 [0.08 ~ 0.92]로 넓게 확보하여
   * '름', '달', '별' 같은 글자에서도 획 사이 공간이 시원하게 보이도록 설계했습니다.
   */
  const JAMO_STROKES = {
    // 자음
    "ㄱ": [
      [[0.14, 0.14], [0.84, 0.14], [0.84, 0.88]]
    ],
    "ㄲ": [
      [[0.10, 0.14], [0.45, 0.14], [0.45, 0.88]],
      [[0.55, 0.14], [0.90, 0.14], [0.90, 0.88]]
    ],
    "ㄴ": [
      [[0.16, 0.12], [0.16, 0.86], [0.86, 0.86]]
    ],
    "ㄷ": [
      [[0.16, 0.12], [0.84, 0.12]],
      [[0.16, 0.12], [0.16, 0.88], [0.86, 0.88]]
    ],
    "ㄸ": [
      [[0.08, 0.12], [0.44, 0.12]],
      [[0.08, 0.12], [0.08, 0.88], [0.46, 0.88]],
      [[0.54, 0.12], [0.90, 0.12]],
      [[0.54, 0.12], [0.54, 0.88], [0.92, 0.88]]
    ],
    "ㄹ": [
      [[0.14, 0.08], [0.84, 0.08], [0.84, 0.50]],
      [[0.14, 0.50], [0.84, 0.50]],
      [[0.14, 0.50], [0.14, 0.92], [0.86, 0.92]]
    ],
    "ㅁ": [
      [[0.16, 0.12], [0.16, 0.88]],
      [[0.16, 0.12], [0.84, 0.12], [0.84, 0.88]],
      [[0.16, 0.88], [0.84, 0.88]]
    ],
    "ㅂ": [
      [[0.18, 0.10], [0.18, 0.90]],
      [[0.82, 0.10], [0.82, 0.90]],
      [[0.18, 0.48], [0.82, 0.48]],
      [[0.18, 0.90], [0.82, 0.90]]
    ],
    "ㅃ": [
      [[0.08, 0.10], [0.08, 0.90]],
      [[0.44, 0.10], [0.44, 0.90]],
      [[0.08, 0.48], [0.44, 0.48]],
      [[0.08, 0.90], [0.44, 0.90]],
      [[0.56, 0.10], [0.56, 0.90]],
      [[0.92, 0.10], [0.92, 0.90]],
      [[0.56, 0.48], [0.92, 0.48]],
      [[0.56, 0.90], [0.92, 0.90]]
    ],
    "ㅅ": [
      [[0.52, 0.12], [0.14, 0.88]],
      [[0.48, 0.42], [0.86, 0.88]]
    ],
    "ㅆ": [
      [[0.30, 0.12], [0.08, 0.88]],
      [[0.28, 0.44], [0.48, 0.88]],
      [[0.72, 0.12], [0.52, 0.88]],
      [[0.70, 0.44], [0.92, 0.88]]
    ],
    "ㅇ": [
      [
        [0.50, 0.10],
        [0.20, 0.24],
        [0.14, 0.50],
        [0.22, 0.78],
        [0.50, 0.90],
        [0.78, 0.78],
        [0.86, 0.50],
        [0.80, 0.24],
        [0.50, 0.10]
      ]
    ],
    "ㅈ": [
      [[0.16, 0.14], [0.84, 0.14]],
      [[0.52, 0.14], [0.14, 0.88]],
      [[0.48, 0.46], [0.86, 0.88]]
    ],
    "ㅉ": [
      [[0.08, 0.14], [0.46, 0.14]],
      [[0.28, 0.14], [0.08, 0.88]],
      [[0.26, 0.48], [0.46, 0.88]],
      [[0.54, 0.14], [0.92, 0.14]],
      [[0.74, 0.14], [0.54, 0.88]],
      [[0.72, 0.48], [0.92, 0.88]]
    ],
    "ㅊ": [
      [[0.34, 0.06], [0.66, 0.06]],
      [[0.14, 0.26], [0.86, 0.26]],
      [[0.52, 0.26], [0.14, 0.90]],
      [[0.48, 0.54], [0.86, 0.90]]
    ],
    "ㅋ": [
      [[0.14, 0.12], [0.84, 0.12], [0.84, 0.88]],
      [[0.16, 0.50], [0.82, 0.50]]
    ],
    "ㅌ": [
      [[0.16, 0.10], [0.84, 0.10]],
      [[0.16, 0.50], [0.80, 0.50]],
      [[0.16, 0.10], [0.16, 0.90], [0.86, 0.90]]
    ],
    "ㅍ": [
      [[0.12, 0.12], [0.88, 0.12]],
      [[0.34, 0.12], [0.34, 0.88]],
      [[0.66, 0.12], [0.66, 0.88]],
      [[0.10, 0.88], [0.90, 0.88]]
    ],
    "ㅎ": [
      [[0.34, 0.06], [0.66, 0.06]],
      [[0.12, 0.24], [0.88, 0.24]],
      [
        [0.50, 0.40],
        [0.24, 0.50],
        [0.20, 0.68],
        [0.50, 0.90],
        [0.80, 0.68],
        [0.76, 0.50],
        [0.50, 0.40]
      ]
    ],

    // 모음
    "ㅏ": [
      [[0.34, 0.08], [0.34, 0.92]],
      [[0.34, 0.48], [0.84, 0.48]]
    ],
    "ㅐ": [
      [[0.26, 0.08], [0.26, 0.92]],
      [[0.26, 0.48], [0.68, 0.48]],
      [[0.68, 0.08], [0.68, 0.92]]
    ],
    "ㅑ": [
      [[0.32, 0.08], [0.32, 0.92]],
      [[0.32, 0.34], [0.84, 0.34]],
      [[0.32, 0.62], [0.84, 0.62]]
    ],
    "ㅒ": [
      [[0.24, 0.08], [0.24, 0.92]],
      [[0.24, 0.34], [0.68, 0.34]],
      [[0.24, 0.62], [0.68, 0.62]],
      [[0.68, 0.08], [0.68, 0.92]]
    ],
    "ㅓ": [
      [[0.16, 0.48], [0.66, 0.48]],
      [[0.66, 0.08], [0.66, 0.92]]
    ],
    "ㅔ": [
      [[0.12, 0.48], [0.46, 0.48]],
      [[0.46, 0.08], [0.46, 0.92]],
      [[0.78, 0.08], [0.78, 0.92]]
    ],
    "ㅕ": [
      [[0.16, 0.34], [0.66, 0.34]],
      [[0.16, 0.62], [0.66, 0.62]],
      [[0.66, 0.08], [0.66, 0.92]]
    ],
    "ㅖ": [
      [[0.12, 0.34], [0.46, 0.34]],
      [[0.12, 0.62], [0.46, 0.62]],
      [[0.46, 0.08], [0.46, 0.92]],
      [[0.78, 0.08], [0.78, 0.92]]
    ],
    "ㅗ": [
      [[0.50, 0.12], [0.50, 0.72]],
      [[0.10, 0.72], [0.90, 0.72]]
    ],
    "ㅛ": [
      [[0.34, 0.12], [0.34, 0.72]],
      [[0.66, 0.12], [0.66, 0.72]],
      [[0.10, 0.72], [0.90, 0.72]]
    ],
    "ㅜ": [
      [[0.10, 0.26], [0.90, 0.26]],
      [[0.50, 0.26], [0.50, 0.88]]
    ],
    "ㅠ": [
      [[0.10, 0.26], [0.90, 0.26]],
      [[0.34, 0.26], [0.34, 0.88]],
      [[0.66, 0.26], [0.66, 0.88]]
    ],
    "ㅡ": [
      [[0.10, 0.50], [0.90, 0.50]]
    ],
    "ㅣ": [
      [[0.50, 0.08], [0.50, 0.92]]
    ],
    "ㅘ": [
      [[0.30, 0.18], [0.30, 0.62]],
      [[0.06, 0.62], [0.56, 0.62]],
      [[0.68, 0.08], [0.68, 0.92]],
      [[0.68, 0.48], [0.94, 0.48]]
    ],
    "ㅚ": [
      [[0.34, 0.18], [0.34, 0.68]],
      [[0.08, 0.68], [0.62, 0.68]],
      [[0.76, 0.08], [0.76, 0.92]]
    ],
    "ㅙ": [
      [[0.26, 0.20], [0.26, 0.64]],
      [[0.06, 0.64], [0.50, 0.64]],
      [[0.60, 0.08], [0.60, 0.92]],
      [[0.60, 0.48], [0.86, 0.48]],
      [[0.86, 0.08], [0.86, 0.92]]
    ],
    "ㅝ": [
      [[0.08, 0.32], [0.56, 0.32]],
      [[0.32, 0.32], [0.32, 0.82]],
      [[0.48, 0.54], [0.76, 0.54]],
      [[0.76, 0.08], [0.76, 0.92]]
    ],
    "ㅟ": [
      [[0.08, 0.30], [0.62, 0.30]],
      [[0.35, 0.30], [0.35, 0.86]],
      [[0.76, 0.08], [0.76, 0.92]]
    ],
    "ㅢ": [
      [[0.08, 0.62], [0.62, 0.62]],
      [[0.76, 0.08], [0.76, 0.92]]
    ]
  };

  const VERTICAL_VOWELS = new Set(["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅣ"]);
  const HORIZONTAL_VOWELS = new Set(["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"]);

  let mountEl = null;
  let stageNum = 1;
  let onSolvedCallback = null;
  let currentTarget = null;

  let canvas = null;
  let ctx = null;

  let strokes = [];
  let activeStrokeIdx = 0;
  let currentDragPoints = [];
  let sparkles = [];
  let animFrameId = null;
  let isDrawing = false;
  let isCompleted = false;
  let sparkleSoundStep = 0;

  const STROKE_PALETTE = ["#FF7043", "#29B6F6", "#66BB6A", "#AB47BC", "#FFA000", "#EC407A"];

  function start(container, stage, onSolved) {
    stop();
    mountEl = container;
    stageNum = stage;
    onSolvedCallback = onSolved;
    nextQuestion();
  }

  function stop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isDrawing = false;
    isCompleted = false;
  }

  function repeatPrompt() {
    if (!currentTarget) return;
    const promptSpeech =
      currentTarget.char === currentTarget.word
        ? `${currentTarget.word}, 번호 순서대로 한 줄씩 따라 써 볼까요?`
        : `${currentTarget.tts}, ${currentTarget.word} 할 때 ${currentTarget.tts}, 번호 순서대로 써 볼까요?`;
    HG.Audio.speak(promptSpeech, {
      audioSrc: currentTarget.audioSrc
    });
    HG.Character.say(
      `반짝이는 ${activeStrokeIdx + 1}번 동그라미부터 화살표를 따라 한 줄로 슥 그어 봐! ✏️`
    );
  }

  function nextQuestion() {
    if (!mountEl) return;
    isCompleted = false;
    isDrawing = false;
    activeStrokeIdx = 0;
    currentDragPoints = [];
    sparkles = [];

    const pool = HG.Words.getStageItems(stageNum);
    currentTarget = HG.Words.drawNextItem
      ? HG.Words.drawNextItem(stageNum, "trace")
      : pool[Math.floor(Math.random() * pool.length)];

    mountEl.innerHTML = `
      <div class="game-header-bar">
        <div class="game-prompt-title">
          <span>✏️ 숫자 순서대로 한 줄씩 슥~ 그어 봐요:</span>
          <span class="prompt-target-badge">${currentTarget.char}</span>
        </div>
        <button id="btn-trace-listen" class="btn-sound-prompt" type="button">
          🔊 소리 듣기
        </button>
      </div>

      <div class="trace-workspace">
        <div id="trace-canvas-wrap" class="trace-canvas-wrap">
          <canvas id="trace-canvas"></canvas>
        </div>

        <div class="trace-side-panel">
          <div class="trace-word-card">
            <div class="trace-word-illust">${HG.Words.getIllustSvg(currentTarget.icon)}</div>
            <div class="trace-word-label">${currentTarget.word}</div>
          </div>

          <div class="trace-meter-wrap" aria-label="따라쓰기 진행도">
            <div id="trace-meter-fill" class="trace-meter-fill"></div>
          </div>

          <div class="trace-btn-group">
            <button id="btn-trace-clear" class="btn-trace-action" type="button">🔄 처음부터</button>
          </div>
        </div>
      </div>
    `;

    const listenBtn = document.getElementById("btn-trace-listen");
    if (listenBtn) {
      listenBtn.addEventListener("click", () => {
        HG.Audio.playTap();
        repeatPrompt();
      });
    }

    const clearBtn = document.getElementById("btn-trace-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (isCompleted) return;
        HG.Audio.playTap();
        activeStrokeIdx = 0;
        currentDragPoints = [];
        strokes.forEach((st) => {
          st.done = false;
          st.waypoints.forEach((wp) => (wp.hit = false));
        });
        updateProgressMeter();
        HG.Character.say("1번 획부터 다시 한 줄씩 슥~ 그어 보자! ✨");
      });
    }

    canvas = document.getElementById("trace-canvas");
    ctx = canvas.getContext("2d");

    setupCanvasAndStrokes();
    bindCanvasEvents();
    repeatPrompt();

    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderLoop(performance.now());
  }

  function setupCanvasAndStrokes() {
    if (!canvas) return;
    const wrap = document.getElementById("trace-canvas-wrap");
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = Math.max(210, Math.floor(rect.height));

    canvas.width = w;
    canvas.height = h;

    strokes = buildStrokesForText(currentTarget.char, w, h);
    activeStrokeIdx = 0;
    updateProgressMeter();
  }

  /**
   * 글자/낱말을 획 단위 벡터 좌표 리스트로 분해
   * - 세로로 3층 구조(초성+가로모음+종성: 예 '름', '곰', '물')인 음절도 답답하지 않도록
   *   캔버스의 세로 높이(boxH)를 최대한 활용합니다.
   */
  function buildStrokesForText(text, canvasW, canvasH) {
    const chars = Array.from(text);
    const numChars = chars.length;

    const padX = canvasW * (numChars === 1 ? 0.20 : numChars === 2 ? 0.08 : 0.05);
    const padY = canvasH * 0.07;
    const availW = canvasW - padX * 2;
    const availH = canvasH - padY * 2;
    const cellW = availW / numChars;
    const cellH = availH;

    // 세로 공간(boxH)을 넉넉히 사용하여 3층 받침 글자(름, 달, 별 등)의 획 간격 확보
    const boxH = cellH * 0.96;
    const boxW = Math.min(cellW * 0.88, boxH * 0.95);
    const resultStrokes = [];

    chars.forEach((ch, cIdx) => {
      const cellCenterX = padX + cellW * (cIdx + 0.5);
      const cellCenterY = canvasH / 2;
      const boxLeft = cellCenterX - boxW / 2;
      const boxTop = cellCenterY - boxH / 2;

      const rawCharStrokes = decomposeCharToNormalizedStrokes(ch);

      rawCharStrokes.forEach((normPolyline) => {
        const canvasPolyline = normPolyline.map(([nx, ny]) => ({
          x: boxLeft + nx * boxW,
          y: boxTop + ny * boxH
        }));

        const waypoints = sampleWaypointsAlongPolyline(canvasPolyline, 9);
        resultStrokes.push({
          index: resultStrokes.length + 1,
          color: STROKE_PALETTE[resultStrokes.length % STROKE_PALETTE.length],
          points: canvasPolyline,
          waypoints,
          done: false
        });
      });
    });

    return resultStrokes;
  }

  function mapJamoToBox(jamoChar, box) {
    const template = JAMO_STROKES[jamoChar] || JAMO_STROKES["ㅇ"];
    return template.map((stroke) =>
      stroke.map(([x, y]) => [
        box.x + x * box.w,
        box.y + y * box.h
      ])
    );
  }

  function decomposeCharToNormalizedStrokes(ch) {
    // 1. 단일 자음/모음인 경우
    if (JAMO_STROKES[ch]) {
      return mapJamoToBox(ch, { x: 0.08, y: 0.06, w: 0.84, h: 0.88 });
    }

    // 2. 완성형 한글 음절(가~힣)인 경우 초성·중성·종성 박스로 분해
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const cho = CHOSUNG[Math.floor(offset / (21 * 28))];
      const jung = JUNGSUNG[Math.floor((offset % (21 * 28)) / 28)];
      const jong = JONGSUNG[offset % 28];

      const hasJong = Boolean(jong);
      const isVert = VERTICAL_VOWELS.has(jung);
      const isHoriz = HORIZONTAL_VOWELS.has(jung);

      const list = [];

      if (isVert) {
        if (!hasJong) {
          // 예: 가, 나, 비, 기, 차
          list.push(...mapJamoToBox(cho, { x: 0.04, y: 0.12, w: 0.44, h: 0.72 }));
          list.push(...mapJamoToBox(jung, { x: 0.50, y: 0.06, w: 0.44, h: 0.88 }));
        } else {
          // 예: 달, 별, 밥, 집 (종성에 ㄹ, ㅂ 등이 올 때도 겹치지 않도록 상하 비율 배분)
          list.push(...mapJamoToBox(cho, { x: 0.05, y: 0.02, w: 0.44, h: 0.46 }));
          list.push(...mapJamoToBox(jung, { x: 0.50, y: 0.02, w: 0.44, h: 0.48 }));
          list.push(...mapJamoToBox(jong, { x: 0.16, y: 0.55, w: 0.68, h: 0.43 }));
        }
      } else if (isHoriz) {
        if (!hasJong) {
          // 예: 고, 노, 모, 오, 우, 구, 무, 수
          list.push(...mapJamoToBox(cho, { x: 0.16, y: 0.04, w: 0.68, h: 0.46 }));
          list.push(...mapJamoToBox(jung, { x: 0.08, y: 0.54, w: 0.84, h: 0.40 }));
        } else if (jung === "ㅡ") {
          // 예: '름' (초성 ㄹ + 중성 ㅡ + 종성 ㅁ)
          // 'ㅡ'는 단 한 줄의 수평선이므로 세로 공간을 적게 차지하게 하고,
          // 초성('ㄹ')과 종성('ㅁ')에 세로 높이를 넉넉하게 배분하여 'ㄹ'의 3줄이 절대 겹치지 않게 합니다!
          list.push(...mapJamoToBox(cho, { x: 0.16, y: 0.01, w: 0.68, h: 0.40 }));
          list.push(...mapJamoToBox(jung, { x: 0.08, y: 0.46, w: 0.84, h: 0.08 }));
          list.push(...mapJamoToBox(jong, { x: 0.18, y: 0.59, w: 0.64, h: 0.39 }));
        } else {
          // 예: 곰, 물, 눈, 공, 꽃
          list.push(...mapJamoToBox(cho, { x: 0.18, y: 0.01, w: 0.64, h: 0.35 }));
          list.push(...mapJamoToBox(jung, { x: 0.10, y: 0.39, w: 0.80, h: 0.20 }));
          list.push(...mapJamoToBox(jong, { x: 0.18, y: 0.63, w: 0.64, h: 0.35 }));
        }
      } else {
        // 복합 모음 (예: 과)
        list.push(...mapJamoToBox(cho, { x: 0.06, y: 0.06, w: 0.42, h: 0.44 }));
        list.push(...mapJamoToBox(jung, { x: 0.06, y: 0.06, w: 0.88, h: 0.88 }));
        if (hasJong) {
          list.push(...mapJamoToBox(jong, { x: 0.18, y: 0.62, w: 0.64, h: 0.35 }));
        }
      }
      return list;
    }

    return mapJamoToBox("ㅇ", { x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  }

  /**
   * 한 줄 폴리라인을 따라 일정 간격으로 체크 웨이포인트(Waypoints) 생성
   */
  function sampleWaypointsAlongPolyline(pts, count) {
    if (!pts || pts.length === 0) return [];
    if (pts.length === 1) return [{ x: pts[0].x, y: pts[0].y, hit: false }];

    const segLengths = [];
    let totalLen = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segLengths.push(len);
      totalLen += len;
    }

    const waypoints = [];
    for (let k = 0; k < count; k++) {
      const targetDist = (totalLen * k) / (count - 1);
      let acc = 0;
      let chosen = pts[pts.length - 1];

      for (let i = 0; i < segLengths.length; i++) {
        if (acc + segLengths[i] >= targetDist) {
          const remain = targetDist - acc;
          const t = segLengths[i] > 0 ? remain / segLengths[i] : 0;
          chosen = {
            x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
            y: pts[i].y + (pts[i + 1].y - pts[i].y) * t
          };
          break;
        }
        acc += segLengths[i];
      }
      waypoints.push({ x: chosen.x, y: chosen.y, hit: false });
    }
    return waypoints;
  }

  /**
   * 글자 수 및 총 획 밀도에 맞춰 획들이 서로 뭉개지지 않는 깔끔한 두께 계산
   */
  function getStrokeThickness() {
    if (!canvas || !currentTarget) return 20;
    const len = currentTarget.char.length;
    const base = Math.min(canvas.width, canvas.height);

    // 총 획수가 많은 글자(예: 구름, 달, 별, 꽃 등)는 획 두께를 날렵하게 조정해 획 사이 여백이 잘 보이게 함
    const denseFactor = strokes.length >= 8 ? 0.78 : strokes.length >= 5 ? 0.86 : 1.0;

    if (len === 1) return Math.max(15, base * 0.078 * denseFactor);
    if (len === 2) return Math.max(13, base * 0.062 * denseFactor);
    return Math.max(11, base * 0.052 * denseFactor);
  }

  function bindCanvasEvents() {
    if (!canvas) return;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height
      };
    };

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (isCompleted || activeStrokeIdx >= strokes.length) return;
      canvas.setPointerCapture(e.pointerId);
      isDrawing = true;
      const pt = getPos(e);
      currentDragPoints = [pt];
      checkActiveStrokeProgress(pt.x, pt.y);
      spawnSparkles(pt.x, pt.y, 2);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!isDrawing || isCompleted || activeStrokeIdx >= strokes.length) return;
      e.preventDefault();
      const pt = getPos(e);
      const last = currentDragPoints[currentDragPoints.length - 1];
      const dist = Math.hypot(pt.x - last.x, pt.y - last.y);

      if (dist > 3) {
        currentDragPoints.push(pt);
        const steps = Math.ceil(dist / 8);
        for (let i = 1; i <= steps; i++) {
          const ix = last.x + ((pt.x - last.x) * i) / steps;
          const iy = last.y + ((pt.y - last.y) * i) / steps;
          checkActiveStrokeProgress(ix, iy);
        }
        spawnSparkles(pt.x, pt.y, 1);
      }
    });

    const endStroke = () => {
      if (!isDrawing) return;
      isDrawing = false;
      finalizeActiveStrokeAttempt();
    };

    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
  }

  /**
   * 현재 순서의 획(activeStroke)을 따라 한 줄로 그었는지 넉넉한 판정 반경으로 체크
   */
  function checkActiveStrokeProgress(x, y) {
    const activeStroke = strokes[activeStrokeIdx];
    if (!activeStroke || activeStroke.done) return;

    // 시각적 선 두께는 날렵하더라도 터치 판정 반경은 넉넉하게 유지하여 아이가 한 줄로 쉽게 그을 수 있도록 배려
    const tolerance = Math.max(36, getStrokeThickness() * 1.8);
    const wps = activeStroke.waypoints;

    for (let i = 0; i < wps.length; i++) {
      const canHit = i <= 2 || wps[i - 1].hit || wps[Math.max(0, i - 2)].hit;
      if (!wps[i].hit && canHit && Math.hypot(wps[i].x - x, wps[i].y - y) <= tolerance) {
        wps[i].hit = true;
        sparkleSoundStep++;
        if (sparkleSoundStep % 2 === 0) {
          HG.Audio.playSparkle(sparkleSoundStep);
        }
      }
    }
  }

  /**
   * 손가락을 떼었을 때 현재 획이 한 줄로 그어졌는지 확인 후 깔끔한 직선/곡선으로 스냅 완성!
   */
  function finalizeActiveStrokeAttempt() {
    const activeStroke = strokes[activeStrokeIdx];
    if (!activeStroke) return;

    const wps = activeStroke.waypoints;
    const hitCount = wps.filter((w) => w.hit).length;
    const startHit = wps[0].hit || (wps[1] && wps[1].hit);
    const endHit = wps[wps.length - 1].hit || (wps[wps.length - 2] && wps[wps.length - 2].hit);

    if (startHit && (endHit || hitCount / wps.length >= 0.65)) {
      activeStroke.done = true;
      currentDragPoints = [];
      activeStrokeIdx += 1;
      updateProgressMeter();

      activeStroke.waypoints.forEach((wp, i) => {
        if (i % 2 === 0) spawnSparkles(wp.x, wp.y, 2);
      });

      if (activeStrokeIdx >= strokes.length) {
        completeAllStrokes();
      } else {
        HG.Audio.playTap();
        HG.Character.say(
          `잘했어! 이제 ${activeStrokeIdx + 1}번 동그라미에서 화살표를 따라 한 줄로 슥~ 그어 봐! ✏️`
        );
      }
    } else {
      wps.forEach((w) => (w.hit = false));
      currentDragPoints = [];
      HG.Character.say(
        `${activeStrokeIdx + 1}번 숫자 동그라미부터 끝까지 한 줄로 쭉~ 이어서 그어 볼까? 😊`
      );
    }
  }

  function updateProgressMeter() {
    const fillEl = document.getElementById("trace-meter-fill");
    if (!fillEl || !strokes.length) return;
    const pct = Math.round((activeStrokeIdx / strokes.length) * 100);
    fillEl.style.width = `${pct}%`;
  }

  function completeAllStrokes() {
    isCompleted = true;
    isDrawing = false;
    currentDragPoints = [];
    updateProgressMeter();

    for (let i = 0; i < 30; i++) {
      spawnSparkles(
        canvas.width * (0.2 + Math.random() * 0.6),
        canvas.height * (0.2 + Math.random() * 0.6),
        2
      );
    }

    HG.Audio.playCorrect();
    const doneSpeech =
      currentTarget.char === currentTarget.word
        ? `우와, 끝까지 순서대로 참 잘 썼어요. ${currentTarget.word}!`
        : `우와, 끝까지 순서대로 참 잘 썼어요. ${currentTarget.word} 할 때, ${currentTarget.tts}!`;
    HG.Audio.speak(doneSpeech, {
      audioSrc: currentTarget.audioSrc
    });
    HG.Character.reactHappy(
      `우와! 1번부터 ${strokes.length}번까지 순서대로 "${currentTarget.char}" 글자를 멋지게 완성했어! 🌟`
    );

    setTimeout(() => {
      if (onSolvedCallback) onSolvedCallback();
    }, 1500);
  }

  function spawnSparkles(x, y, count) {
    const colors = ["#FFD54F", "#FF7043", "#29B6F6", "#66BB6A", "#AB47BC"];
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.8) * 2.2,
        size: 5 + Math.random() * 5,
        life: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function drawPolyline(points, strokeStyle, lineWidth, lineDash = []) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(lineDash);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowHead(fromPt, toPt, color, radius) {
    const angle = Math.atan2(toPt.y - fromPt.y, toPt.x - fromPt.x);
    ctx.save();
    ctx.translate(toPt.x, toPt.y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(radius * 0.4, 0);
    ctx.lineTo(-radius * 1.1, -radius * 0.85);
    ctx.lineTo(-radius * 1.1, radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function renderLoop(now) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. 바탕 보조선 (연한 십자 가이드)
    ctx.save();
    ctx.strokeStyle = "rgba(174, 213, 129, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 16);
    ctx.lineTo(w / 2, h - 16);
    ctx.moveTo(16, h / 2);
    ctx.lineTo(w - 16, h / 2);
    ctx.stroke();
    ctx.restore();

    const thickness = getStrokeThickness();

    // 2. 전체 획의 연회색 바탕 길(단일 선) 그리기
    strokes.forEach((st) => {
      drawPolyline(st.points, "#DADFE3", thickness + 4);
      drawPolyline(st.points, "#EEF2F5", thickness);
    });

    // 3. 이미 완성한 획들을 깔끔한 한 줄 컬러 스트로크로 렌더링
    strokes.forEach((st) => {
      if (!st.done) return;
      drawPolyline(st.points, "#FFFFFF", thickness + 4);
      drawPolyline(st.points, isCompleted ? "#FF7043" : st.color, thickness);
    });

    // 4. 현재 써야 할 활성 획(activeStroke)에 점선 화살표 가이드 표시
    const activeStroke = strokes[activeStrokeIdx];
    if (activeStroke && !isCompleted) {
      drawPolyline(activeStroke.points, "rgba(255, 112, 67, 0.25)", thickness);
      drawPolyline(activeStroke.points, "#FF7043", 4.5, [9, 7]);

      const pts = activeStroke.points;
      if (pts.length >= 2) {
        const lastIdx = pts.length - 1;
        drawArrowHead(pts[lastIdx - 1], pts[lastIdx], "#FF7043", 10);
      }
    }

    // 5. 현재 손가락으로 긋고 있는 한 줄 궤적 표시
    if (currentDragPoints.length >= 2 && activeStroke) {
      drawPolyline(currentDragPoints, activeStroke.color, thickness * 0.9);
    }

    // 6. 모든 획의 시작 위치에 획 순서 숫자 배지(1, 2, 3...) 표시
    // - 같은 시작점에 여러 숫자(예: 'ㅁ'의 4번/5번, 'ㄹ'의 5번/6번)가 겹칠 때
    //   앞선 번호가 먼저 깔끔하게 보이도록 정렬
    const badgeOrder = strokes
      .map((st, idx) => ({ st, idx }))
      .sort((a, b) => {
        const aIsCurrent = a.idx === activeStrokeIdx && !isCompleted;
        const bIsCurrent = b.idx === activeStrokeIdx && !isCompleted;
        if (aIsCurrent !== bIsCurrent) return aIsCurrent ? 1 : -1;

        if (a.st.done !== b.st.done) return a.st.done ? -1 : 1;

        return b.idx - a.idx;
      });

    badgeOrder.forEach(({ st, idx }) => {
      const startPt = st.points[0];
      if (!startPt) return;

      const isCurrent = idx === activeStrokeIdx && !isCompleted;
      const pulse = isCurrent ? 1 + Math.sin((now || 0) * 0.008) * 0.13 : 1;
      const badgeRadius = (isCurrent ? 16 : 12) * pulse;

      ctx.save();
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, badgeRadius, 0, Math.PI * 2);

      if (st.done) {
        ctx.fillStyle = "#66BB6A";
        ctx.strokeStyle = "#FFFFFF";
      } else if (isCurrent) {
        ctx.fillStyle = "#FF5722";
        ctx.strokeStyle = "#FFF59D";
      } else {
        ctx.fillStyle = "#90A4AE";
        ctx.strokeStyle = "#FFFFFF";
      }

      ctx.lineWidth = isCurrent ? 3 : 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `900 ${isCurrent ? 15 : 12}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(st.index), startPt.x, startPt.y + 1);
      ctx.restore();
    });

    // 7. 반짝이 파티클 렌더링
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= 0.03;
      if (sp.life <= 0) {
        sparkles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = sp.life;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animFrameId = requestAnimationFrame(renderLoop);
  }

  HG.Games.trace = {
    start,
    stop,
    repeatPrompt,
    nextQuestion
  };
})(window.HG);
