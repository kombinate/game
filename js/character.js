/**
 * ==========================================================================
 * 방글방글 한글 놀이터 - SVG 마스코트 캐릭터 제어 (js/character.js)
 * ==========================================================================
 * - 순수 SVG와 CSS Keyframe으로 구현한 아기곰 '보리'
 * - 모바일 브라우저(삼성 인터넷 등)의 강제 다크모드 색상 반전 필터에 눈/코/입이 지워지지 않도록
 *   모든 SVG 색상을 PaintServer(linearGradient url)로 보호
 * - 정답 시 덩실덩실 춤추기(dance), 오답 시 다정한 격려(encourage), 평상시 숨쉬기(idle)
 */

window.HG = window.HG || {};

(function (HG) {
  "use strict";

  var PRAISE_LINES = [
    "우와! 정말 대단해! 정답이야! 🎉",
    "딩동댕! 보리가 신나서 춤을 춰요! 💃",
    "반짝반짝 최고야! 한글 박사님 같아! 🌟",
    "야호! 정확하게 찾았어! 참 잘했어요! 👏",
    "멋져멋져! 우리 친구 손가락이 마법 같아! ✨"
  ];

  var ENCOURAGE_LINES = [
    "한 번 더 해볼까? 괜찮아! 천천히 찾아보자 💕",
    "아하! 아까웠어~ 보리랑 다시 한 번 눌러볼까? 🤗",
    "괜찮아 괜찮아! 소리를 다시 들어보면 찾을 수 있어! 🎵",
    "조금만 더 살펴볼까? 우리 친구는 할 수 있어! 🌱"
  ];

  var PET_LINES = [
    "헤헤, 간지러워요! 나랑 한글 놀이 해서 정말 좋아! 🐻",
    "보리 쓰다듬어 줘서 고마워! 오늘도 신나게 놀자! 💛",
    "별 5개를 모으면 움직이는 스티커 선물을 줄게! 🎁"
  ];

  var mascotStageEl = null;
  var speechTextEl = null;
  var stateTimer = null;

  function buildMascotSvg(mode) {
    if (mode === void 0) mode = "main";
    return ("\n      <svg class=\"mascot-svg state-idle\" viewBox=\"0 0 200 220\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\">\n        <defs>\n          <linearGradient id=\"bFur-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#F6AD6D\" />\n            <stop offset=\"100%\" stop-color=\"#EE9A53\" />\n          </linearGradient>\n          <linearGradient id=\"bEar-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#DC914E\" />\n            <stop offset=\"100%\" stop-color=\"#CF8340\" />\n          </linearGradient>\n          <linearGradient id=\"bInnerEar-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFCCBC\" />\n            <stop offset=\"100%\" stop-color=\"#FFAB91\" />\n          </linearGradient>\n          <linearGradient id=\"bCream-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFFDF7\" />\n            <stop offset=\"100%\" stop-color=\"#FFF3E0\" />\n          </linearGradient>\n          <linearGradient id=\"bWhite-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFFFFF\" />\n            <stop offset=\"100%\" stop-color=\"#FFFDE7\" />\n          </linearGradient>\n          <linearGradient id=\"bDark-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#3E2723\" />\n            <stop offset=\"100%\" stop-color=\"#271815\" />\n          </linearGradient>\n          <linearGradient id=\"bLine-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#5D4037\" />\n            <stop offset=\"100%\" stop-color=\"#4E342E\" />\n          </linearGradient>\n          <linearGradient id=\"bPants-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#4FC3F7\" />\n            <stop offset=\"100%\" stop-color=\"#29B6F6\" />\n          </linearGradient>\n          <linearGradient id=\"bBtn-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFE082\" />\n            <stop offset=\"100%\" stop-color=\"#FFD54F\" />\n          </linearGradient>\n          <linearGradient id=\"bLeaf-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#81C784\" />\n            <stop offset=\"100%\" stop-color=\"#66BB6A\" />\n          </linearGradient>\n          <linearGradient id=\"bLeafLine-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#2E7D32\" />\n            <stop offset=\"100%\" stop-color=\"#1B5E20\" />\n          </linearGradient>\n          <linearGradient id=\"bCheek-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FF8A80\" />\n            <stop offset=\"100%\" stop-color=\"#FF5252\" />\n          </linearGradient>\n        </defs>\n\n        <!-- 바닥 그림자 -->\n        <ellipse cx=\"100\" cy=\"204\" rx=\"52\" ry=\"10\" fill=\"rgba(62, 39, 35, 0.14)\" />\n\n        <g class=\"mascot-body-group\">\n          <!-- 양쪽 귀 -->\n          <g class=\"mascot-ears\">\n            <circle cx=\"52\" cy=\"52\" r=\"22\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n            <circle cx=\"52\" cy=\"52\" r=\"11\" fill=\"url(#bInnerEar-" + (mode) + ")\" />\n            <circle cx=\"148\" cy=\"52\" r=\"22\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n            <circle cx=\"148\" cy=\"52\" r=\"11\" fill=\"url(#bInnerEar-" + (mode) + ")\" />\n          </g>\n\n          <!-- 다리 -->\n          <ellipse cx=\"76\" cy=\"188\" rx=\"18\" ry=\"15\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <ellipse cx=\"124\" cy=\"188\" rx=\"18\" ry=\"15\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <circle cx=\"76\" cy=\"190\" r=\"7\" fill=\"url(#bCream-" + (mode) + ")\" />\n          <circle cx=\"124\" cy=\"190\" r=\"7\" fill=\"url(#bCream-" + (mode) + ")\" />\n\n          <!-- 몸통 (귀여운 파란 멜빵바지) -->\n          <ellipse cx=\"100\" cy=\"152\" rx=\"46\" ry=\"42\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <path d=\"M62 150 Q100 162 138 150 L134 184 Q100 196 66 184 Z\" fill=\"url(#bPants-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" stroke-linejoin=\"round\" />\n          <circle cx=\"78\" cy=\"158\" r=\"5\" fill=\"url(#bBtn-" + (mode) + ")\" />\n          <circle cx=\"122\" cy=\"158\" r=\"5\" fill=\"url(#bBtn-" + (mode) + ")\" />\n          <!-- 배 부분 하얀 털 -->\n          <ellipse cx=\"100\" cy=\"142\" rx=\"24\" ry=\"16\" fill=\"url(#bCream-" + (mode) + ")\" />\n\n          <!-- 양팔 -->\n          <g class=\"mascot-arm-left\">\n            <ellipse cx=\"48\" cy=\"144\" rx=\"18\" ry=\"13\" transform=\"rotate(-25 48 144)\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          </g>\n          <g class=\"mascot-arm-right\">\n            <ellipse cx=\"152\" cy=\"144\" rx=\"18\" ry=\"13\" transform=\"rotate(25 152 144)\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          </g>\n\n          <!-- 머리 -->\n          <circle cx=\"100\" cy=\"92\" r=\"52\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n\n          <!-- 머리 위 새싹 장식 -->\n          <path d=\"M100 40 Q100 24 112 20 Q116 32 100 40 Z\" fill=\"url(#bLeaf-" + (mode) + ")\" stroke=\"url(#bLeafLine-" + (mode) + ")\" stroke-width=\"3\" />\n          <path d=\"M100 40 Q100 26 88 22 Q84 34 100 40 Z\" fill=\"url(#bLeaf-" + (mode) + ")\" stroke=\"url(#bLeafLine-" + (mode) + ")\" stroke-width=\"3\" />\n\n          <!-- 발그레 볼터치 -->\n          <ellipse cx=\"64\" cy=\"102\" rx=\"11\" ry=\"7\" fill=\"url(#bCheek-" + (mode) + ")\" opacity=\"0.65\" />\n          <ellipse cx=\"136\" cy=\"102\" rx=\"11\" ry=\"7\" fill=\"url(#bCheek-" + (mode) + ")\" opacity=\"0.65\" />\n\n          <!-- 입 주변 하얀 주둥이 -->\n          <ellipse cx=\"100\" cy=\"104\" rx=\"22\" ry=\"17\" fill=\"url(#bCream-" + (mode) + ")\" />\n          <ellipse cx=\"100\" cy=\"96\" rx=\"8\" ry=\"6\" fill=\"url(#bDark-" + (mode) + ")\" />\n\n          <!-- 눈 (상태별 교체 가능) -->\n          <g class=\"mascot-eyes\" id=\"mascot-eyes-" + (mode) + "\">\n            <circle cx=\"76\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-" + (mode) + ")\" />\n            <circle cx=\"74\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-" + (mode) + ")\" />\n            <circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-" + (mode) + ")\" />\n            <circle cx=\"122\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-" + (mode) + ")\" />\n          </g>\n\n          <!-- 입 모양 -->\n          <path id=\"mascot-mouth-" + (mode) + "\" d=\"M90 106 Q100 116 110 106\" stroke=\"url(#bDark-" + (mode) + ")\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\" />\n        </g>\n      </svg>\n    ");
  }

  function init() {
    mascotStageEl = document.getElementById("mascot-stage");
    speechTextEl = document.getElementById("speech-text");
    var restSlotEl = document.getElementById("rest-character-slot");

    if (mascotStageEl) {
      mascotStageEl.innerHTML = buildMascotSvg("main");
      mascotStageEl.addEventListener("click", function () {
        HG.Audio.playTap();
        var line = PET_LINES[Math.floor(Math.random() * PET_LINES.length)];
        reactHappy(line, false);
      });
    }

    if (restSlotEl) {
      restSlotEl.innerHTML = ("<div style=\"width:100px;height:110px;margin:0 auto;\">" + (buildMascotSvg("rest")) + "</div>");
    }
  }

  function setMood(stateClass, mouthPath, eyeHtml) {
    if (!mascotStageEl) return;
    var svg = mascotStageEl.querySelector(".mascot-svg");
    var mouth = document.getElementById("mascot-mouth-main");
    var eyes = document.getElementById("mascot-eyes-main");

    if (svg) {
      svg.classList.remove("state-idle", "state-dance", "state-encourage");
      svg.classList.add(stateClass);
    }
    if (mouth && mouthPath) {
      mouth.setAttribute("d", mouthPath);
    }
    if (eyes && eyeHtml) {
      eyes.innerHTML = eyeHtml;
    }
  }

  function resetToIdle() {
    setMood(
      "state-idle",
      "M90 106 Q100 116 110 106",
      ("\n        <circle cx=\"76\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />\n        <circle cx=\"74\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-main)\" />\n        <circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />\n        <circle cx=\"122\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-main)\" />\n      ")
    );
  }

  function say(message, speakAloud) {
    if (speakAloud === void 0) speakAloud = false;
    if (speechTextEl && message) {
      speechTextEl.textContent = message;
    }
    if (speakAloud && message) {
      HG.Audio.speak(message);
    }
  }

  /**
   * 정답 시 덩실덩실 춤추는 리액션
   */
  function reactHappy(customMessage, speakAloud) {
    if (speakAloud === void 0) speakAloud = false;
    if (stateTimer) clearTimeout(stateTimer);
    var msg = customMessage || PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)];
    say(msg, speakAloud);

    // 눈웃음 ^ ^ 과 활짝 웃는 입
    setMood(
      "state-dance",
      "M88 104 Q100 120 112 104 Z",
      ("\n        <path d=\"M68 88 Q76 78 84 88\" stroke=\"url(#bDark-main)\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" />\n        <path d=\"M116 88 Q124 78 132 88\" stroke=\"url(#bDark-main)\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" />\n      ")
    );

    stateTimer = setTimeout(resetToIdle, 2400);
  }

  /**
   * 오답 시 다정한 격려 리액션 (경고음/X표시 없이 따뜻하게 응원)
   */
  function reactEncourage(customMessage, speakAloud) {
    if (speakAloud === void 0) speakAloud = false;
    if (stateTimer) clearTimeout(stateTimer);
    var msg = customMessage || ENCOURAGE_LINES[Math.floor(Math.random() * ENCOURAGE_LINES.length)];
    say(msg, speakAloud);

    // 다정한 눈빛과 미소
    setMood(
      "state-encourage",
      "M92 108 Q100 113 108 108",
      ("\n        <circle cx=\"76\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />\n        <circle cx=\"74\" cy=\"84\" r=\"2.5\" fill=\"url(#bWhite-main)\" />\n        <circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />\n        <circle cx=\"122\" cy=\"84\" r=\"2.5\" fill=\"url(#bWhite-main)\" />\n      ")
    );

    stateTimer = setTimeout(resetToIdle, 2200);
  }

  HG.Character = {
    init: init,
    say: say,
    reactHappy: reactHappy,
    reactEncourage: reactEncourage,
    resetToIdle: resetToIdle
  };
})(window.HG);
