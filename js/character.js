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

  // 아기곰 보리를 터치했을 때 순서대로/다양하게 보여주는 8가지 상호작용 모션
  var BORI_INTERACTIONS = [
    {
      state: "state-dance",
      effect: "🎵💃✨",
      eyes: "happy",
      mouth: "M88 104 Q100 120 112 104 Z",
      line: "얏호! 보리랑 같이 신나게 덩실덩실 춤춰 볼까? 💃",
      sound: "correct"
    },
    {
      state: "state-jump",
      effect: "🌟🙌🌟",
      eyes: "star",
      mouth: "M88 103 Q100 122 112 103 Z",
      line: "우와아! 하늘 높이 폴짝폴짝 점프! 우리 친구 최고야! 🌟",
      sound: "fanfare"
    },
    {
      state: "state-spin",
      effect: "🌀✨🎈",
      eyes: "wink",
      mouth: "M90 105 Q100 118 110 105",
      line: "돌아라 돌아 빙글빙글~! 한 바퀴 돌았더니 신난다! 🌀",
      sound: "sparkle"
    },
    {
      state: "state-love",
      effect: "💖💕💗",
      eyes: "heart",
      mouth: "M90 105 Q100 117 110 105",
      line: "헤헤, 보리를 쓰다듬어 주니까 하트가 뿅뿅 솟아나요! 💕",
      sound: "correct"
    },
    {
      state: "state-tickle",
      effect: "😆🎶💛",
      eyes: "laugh",
      mouth: "M86 104 Q100 122 114 104 Z",
      line: "까르르르! 간지러워요! 보리 배꼽이 도망가겠어! 😆",
      sound: "pop"
    },
    {
      state: "state-peekaboo",
      effect: "🙈✨🎉",
      eyes: "wide",
      mouth: "M94 104 A6 6 0 1 0 106 104 A6 6 0 1 0 94 104 Z",
      line: "까꿍!! 호호호, 보리가 어디 숨었었게? 깜짝 놀랐지! 🙈",
      sound: "tap"
    },
    {
      state: "state-hero",
      effect: "💪🔥⭐",
      eyes: "star",
      mouth: "M88 105 Q100 119 112 105 Z",
      line: "으라차차! 한글 공부를 열심히 했더니 힘이 불끈 솟아올라! 💪",
      sound: "fanfare"
    },
    {
      state: "state-eat",
      effect: "🍯🍎😋",
      eyes: "happy",
      mouth: "M90 104 Q100 120 110 104 Z",
      line: "냠냠 쩝쩝! 달콤한 꿀단지 간식을 먹었더니 기분이 최고야! 🍯",
      sound: "pop"
    }
  ];

  var ALL_STATE_CLASSES = [
    "state-idle",
    "state-dance",
    "state-encourage",
    "state-jump",
    "state-spin",
    "state-love",
    "state-tickle",
    "state-peekaboo",
    "state-hero",
    "state-eat",
    "state-zoom"
  ];

  var mascotStageEl = null;
  var speechTextEl = null;
  var propSlotEl = null;
  var effectSlotEl = null;
  var stateTimer = null;
  var interactionIndex = 0;

  function buildMascotSvg(mode) {
    if (mode === void 0) mode = "main";
    return ("\n      <svg class=\"mascot-svg state-idle\" viewBox=\"0 0 200 220\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\">\n        <defs>\n          <linearGradient id=\"bFur-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#F6AD6D\" />\n            <stop offset=\"100%\" stop-color=\"#EE9A53\" />\n          </linearGradient>\n          <linearGradient id=\"bEar-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#DC914E\" />\n            <stop offset=\"100%\" stop-color=\"#CF8340\" />\n          </linearGradient>\n          <linearGradient id=\"bInnerEar-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFCCBC\" />\n            <stop offset=\"100%\" stop-color=\"#FFAB91\" />\n          </linearGradient>\n          <linearGradient id=\"bCream-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFFDF7\" />\n            <stop offset=\"100%\" stop-color=\"#FFF3E0\" />\n          </linearGradient>\n          <linearGradient id=\"bWhite-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFFFFF\" />\n            <stop offset=\"100%\" stop-color=\"#FFFDE7\" />\n          </linearGradient>\n          <linearGradient id=\"bDark-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#3E2723\" />\n            <stop offset=\"100%\" stop-color=\"#271815\" />\n          </linearGradient>\n          <linearGradient id=\"bLine-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#5D4037\" />\n            <stop offset=\"100%\" stop-color=\"#4E342E\" />\n          </linearGradient>\n          <linearGradient id=\"bPants-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#4FC3F7\" />\n            <stop offset=\"100%\" stop-color=\"#29B6F6\" />\n          </linearGradient>\n          <linearGradient id=\"bBtn-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FFE082\" />\n            <stop offset=\"100%\" stop-color=\"#FFD54F\" />\n          </linearGradient>\n          <linearGradient id=\"bLeaf-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#81C784\" />\n            <stop offset=\"100%\" stop-color=\"#66BB6A\" />\n          </linearGradient>\n          <linearGradient id=\"bLeafLine-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#2E7D32\" />\n            <stop offset=\"100%\" stop-color=\"#1B5E20\" />\n          </linearGradient>\n          <linearGradient id=\"bCheek-" + (mode) + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n            <stop offset=\"0%\" stop-color=\"#FF8A80\" />\n            <stop offset=\"100%\" stop-color=\"#FF5252\" />\n          </linearGradient>\n        </defs>\n\n        <!-- 바닥 그림자 -->\n        <ellipse cx=\"100\" cy=\"204\" rx=\"52\" ry=\"10\" fill=\"rgba(62, 39, 35, 0.14)\" />\n\n        <g class=\"mascot-body-group\">\n          <!-- 양쪽 귀 -->\n          <g class=\"mascot-ears\">\n            <circle cx=\"52\" cy=\"52\" r=\"22\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n            <circle cx=\"52\" cy=\"52\" r=\"11\" fill=\"url(#bInnerEar-" + (mode) + ")\" />\n            <circle cx=\"148\" cy=\"52\" r=\"22\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n            <circle cx=\"148\" cy=\"52\" r=\"11\" fill=\"url(#bInnerEar-" + (mode) + ")\" />\n          </g>\n\n          <!-- 다리 -->\n          <ellipse cx=\"76\" cy=\"188\" rx=\"18\" ry=\"15\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <ellipse cx=\"124\" cy=\"188\" rx=\"18\" ry=\"15\" fill=\"url(#bEar-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <circle cx=\"76\" cy=\"190\" r=\"7\" fill=\"url(#bCream-" + (mode) + ")\" />\n          <circle cx=\"124\" cy=\"190\" r=\"7\" fill=\"url(#bCream-" + (mode) + ")\" />\n\n          <!-- 몸통 (귀여운 파란 멜빵바지) -->\n          <ellipse cx=\"100\" cy=\"152\" rx=\"46\" ry=\"42\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          <path d=\"M62 150 Q100 162 138 150 L134 184 Q100 196 66 184 Z\" fill=\"url(#bPants-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" stroke-linejoin=\"round\" />\n          <circle cx=\"78\" cy=\"158\" r=\"5\" fill=\"url(#bBtn-" + (mode) + ")\" />\n          <circle cx=\"122\" cy=\"158\" r=\"5\" fill=\"url(#bBtn-" + (mode) + ")\" />\n          <!-- 배 부분 하얀 털 -->\n          <ellipse cx=\"100\" cy=\"142\" rx=\"24\" ry=\"16\" fill=\"url(#bCream-" + (mode) + ")\" />\n\n          <!-- 양팔 -->\n          <g class=\"mascot-arm-left\">\n            <ellipse cx=\"48\" cy=\"144\" rx=\"18\" ry=\"13\" transform=\"rotate(-25 48 144)\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          </g>\n          <g class=\"mascot-arm-right\">\n            <ellipse cx=\"152\" cy=\"144\" rx=\"18\" ry=\"13\" transform=\"rotate(25 152 144)\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n          </g>\n\n          <!-- 머리 -->\n          <circle cx=\"100\" cy=\"92\" r=\"52\" fill=\"url(#bFur-" + (mode) + ")\" stroke=\"url(#bLine-" + (mode) + ")\" stroke-width=\"4\" />\n\n          <!-- 머리 위 새싹 장식 -->\n          <path d=\"M100 40 Q100 24 112 20 Q116 32 100 40 Z\" fill=\"url(#bLeaf-" + (mode) + ")\" stroke=\"url(#bLeafLine-" + (mode) + ")\" stroke-width=\"3\" />\n          <path d=\"M100 40 Q100 26 88 22 Q84 34 100 40 Z\" fill=\"url(#bLeaf-" + (mode) + ")\" stroke=\"url(#bLeafLine-" + (mode) + ")\" stroke-width=\"3\" />\n\n          <!-- 발그레 볼터치 -->\n          <ellipse cx=\"64\" cy=\"102\" rx=\"11\" ry=\"7\" fill=\"url(#bCheek-" + (mode) + ")\" opacity=\"0.65\" />\n          <ellipse cx=\"136\" cy=\"102\" rx=\"11\" ry=\"7\" fill=\"url(#bCheek-" + (mode) + ")\" opacity=\"0.65\" />\n\n          <!-- 입 주변 하얀 주둥이 -->\n          <ellipse cx=\"100\" cy=\"104\" rx=\"22\" ry=\"17\" fill=\"url(#bCream-" + (mode) + ")\" />\n          <ellipse cx=\"100\" cy=\"96\" rx=\"8\" ry=\"6\" fill=\"url(#bDark-" + (mode) + ")\" />\n\n          <!-- 눈 (상태별 교체 가능) -->\n          <g class=\"mascot-eyes\" id=\"mascot-eyes-" + (mode) + "\">\n            <circle cx=\"76\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-" + (mode) + ")\" />\n            <circle cx=\"74\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-" + (mode) + ")\" />\n            <circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-" + (mode) + ")\" />\n            <circle cx=\"122\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-" + (mode) + ")\" />\n          </g>\n\n          <!-- 입 모양 -->\n          <path id=\"mascot-mouth-" + (mode) + "\" d=\"M90 106 Q100 116 110 106\" stroke=\"url(#bDark-" + (mode) + ")\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\" />\n        </g>\n      </svg>\n    ");
  }

  function init() {
    mascotStageEl = document.getElementById("mascot-stage");
    speechTextEl = document.getElementById("speech-text");
    var restSlotEl = document.getElementById("rest-character-slot");

    if (mascotStageEl) {
      mascotStageEl.innerHTML = (
        "<div class=\"mascot-wrap-inner\" style=\"position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;\">" +
          buildMascotSvg("main") +
          "<div id=\"mascot-effect-slot\" class=\"mascot-effect-slot hidden\" aria-hidden=\"true\"></div>" +
          "<div id=\"mascot-prop-slot\" class=\"mascot-prop-slot hidden\" aria-hidden=\"true\"></div>" +
        "</div>"
      );
      propSlotEl = document.getElementById("mascot-prop-slot");
      effectSlotEl = document.getElementById("mascot-effect-slot");

      mascotStageEl.addEventListener("click", function () {
        triggerRandomPetInteraction();
      });
    }

    if (restSlotEl) {
      restSlotEl.innerHTML = ("<div style=\"width:100px;height:110px;margin:0 auto;\">" + (buildMascotSvg("rest")) + "</div>");
    }
  }

  function getEyeSvgByType(eyeType) {
    if (eyeType === "happy") {
      return (
        "<path d=\"M68 88 Q76 78 84 88\" stroke=\"url(#bDark-main)\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" />" +
        "<path d=\"M116 88 Q124 78 132 88\" stroke=\"url(#bDark-main)\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" />"
      );
    }
    if (eyeType === "wink") {
      return (
        "<path d=\"M68 86 Q76 77 84 86\" stroke=\"url(#bDark-main)\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" />" +
        "<circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />" +
        "<circle cx=\"122\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-main)\" />"
      );
    }
    if (eyeType === "laugh") {
      return (
        "<path d=\"M68 81 L82 86 L68 91\" stroke=\"url(#bDark-main)\" stroke-width=\"4.2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />" +
        "<path d=\"M132 81 L118 86 L132 91\" stroke=\"url(#bDark-main)\" stroke-width=\"4.2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />"
      );
    }
    if (eyeType === "star") {
      return (
        "<polygon points=\"76,77 78.5,83 85,83.5 80,87.5 81.5,94 76,90.5 70.5,94 72,87.5 67,83.5 73.5,83\" fill=\"url(#bBtn-main)\" stroke=\"url(#bLine-main)\" stroke-width=\"1.8\" />" +
        "<polygon points=\"124,77 126.5,83 133,83.5 128,87.5 129.5,94 124,90.5 118.5,94 120,87.5 115,83.5 121.5,83\" fill=\"url(#bBtn-main)\" stroke=\"url(#bLine-main)\" stroke-width=\"1.8\" />"
      );
    }
    if (eyeType === "heart") {
      return (
        "<path d=\"M76 93 C76 93 66 86 66 80 C66 76 71 75 76 80 C81 75 86 76 86 80 C86 86 76 93 76 93 Z\" fill=\"url(#bCheek-main)\" />" +
        "<path d=\"M124 93 C124 93 114 86 114 80 C114 76 119 75 124 80 C129 75 134 76 134 80 C134 86 124 93 124 93 Z\" fill=\"url(#bCheek-main)\" />"
      );
    }
    if (eyeType === "wide") {
      return (
        "<circle cx=\"76\" cy=\"85\" r=\"8\" fill=\"url(#bDark-main)\" />" +
        "<circle cx=\"73\" cy=\"82\" r=\"3\" fill=\"url(#bWhite-main)\" />" +
        "<circle cx=\"124\" cy=\"85\" r=\"8\" fill=\"url(#bDark-main)\" />" +
        "<circle cx=\"121\" cy=\"82\" r=\"3\" fill=\"url(#bWhite-main)\" />"
      );
    }
    return (
      "<circle cx=\"76\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />" +
      "<circle cx=\"74\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-main)\" />" +
      "<circle cx=\"124\" cy=\"86\" r=\"6.5\" fill=\"url(#bDark-main)\" />" +
      "<circle cx=\"122\" cy=\"84\" r=\"2.2\" fill=\"url(#bWhite-main)\" />"
    );
  }

  function showEffectBadge(effectText) {
    if (!effectSlotEl) return;
    if (!effectText) {
      effectSlotEl.classList.add("hidden");
      effectSlotEl.textContent = "";
      return;
    }
    effectSlotEl.textContent = effectText;
    effectSlotEl.classList.remove("hidden");
  }

  function showPropBadge(svgHtml, propModeClass) {
    if (!propSlotEl) return;
    if (!svgHtml) {
      propSlotEl.className = "mascot-prop-slot hidden";
      propSlotEl.innerHTML = "";
      return;
    }
    propSlotEl.className = "mascot-prop-slot " + (propModeClass || "prop-bounce");
    propSlotEl.innerHTML = svgHtml;
  }

  function setMood(stateClass, mouthPath, eyeHtml) {
    if (!mascotStageEl) return;
    var svg = mascotStageEl.querySelector(".mascot-svg");
    var mouth = document.getElementById("mascot-mouth-main");
    var eyes = document.getElementById("mascot-eyes-main");

    if (svg) {
      for (var i = 0; i < ALL_STATE_CLASSES.length; i++) {
        svg.classList.remove(ALL_STATE_CLASSES[i]);
      }
      // 연속 클릭 시에도 애니메이션이 즉시 재시작되도록 강제 리플로우
      void svg.offsetWidth;
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
    showEffectBadge("");
    showPropBadge("");
    setMood(
      "state-idle",
      "M90 106 Q100 116 110 106",
      getEyeSvgByType("normal")
    );
  }

  /**
   * 아기곰 보리를 터치했을 때 8가지 다양한 모션과 사운드·음성 반응 실행
   */
  function triggerRandomPetInteraction() {
    if (stateTimer) clearTimeout(stateTimer);
    var act = BORI_INTERACTIONS[interactionIndex % BORI_INTERACTIONS.length];
    interactionIndex += 1;

    if (act.sound === "fanfare" && HG.Audio.playFanfare) {
      HG.Audio.playFanfare();
    } else if (act.sound === "correct" && HG.Audio.playCorrect) {
      HG.Audio.playCorrect();
    } else if (act.sound === "pop" && HG.Audio.playPop) {
      HG.Audio.playPop();
    } else if (act.sound === "sparkle" && HG.Audio.playSparkle) {
      HG.Audio.playSparkle(interactionIndex);
    } else if (HG.Audio.playTap) {
      HG.Audio.playTap();
    }

    showPropBadge("");
    showEffectBadge(act.effect);
    setMood(act.state, act.mouth, getEyeSvgByType(act.eyes));
    say(act.line, true);

    stateTimer = setTimeout(resetToIdle, 3000);
  }

  /**
   * 스티커북에서 스티커를 클릭했을 때 보리가 해당 스티커를 직접 들고/타고/먹으며 상호작용!
   */
  function interactWithSticker(stk) {
    if (!stk) return;
    if (stateTimer) clearTimeout(stateTimer);

    var svgHtml = HG.Words && HG.Words.getIllustSvg ? HG.Words.getIllustSvg(stk.icon) : "";
    var category = stk.category || "toy";
    var stateClass = "state-dance";
    var eyeType = "happy";
    var mouthPath = "M88 104 Q100 120 112 104 Z";
    var propClass = "prop-bounce";
    var effectText = "✨💖✨";
    var line = stk.name + "! " + stk.desc;

    if (category === "food") {
      stateClass = "state-eat";
      eyeType = "happy";
      propClass = "prop-eat";
      effectText = "😋🍴💛";
      line = "와구와구 냠냠! [" + stk.name + "] 진짜 맛있겠다! 보리랑 같이 나눠 먹자! 😋";
    } else if (category === "vehicle") {
      stateClass = "state-zoom";
      eyeType = "star";
      propClass = "prop-zoom";
      effectText = "💨🎶🌟";
      line = "부릉부릉 쌩쌩! 보리가 [" + stk.name + "] 타고 한글 나라로 신나게 출발해요! 🚀";
    } else if (category === "animal") {
      stateClass = "state-jump";
      eyeType = "laugh";
      propClass = "prop-friend";
      effectText = "🐾🎵💕";
      line = "안녕 [" + stk.name + "]야! 보리랑 손잡고 폴짝폴짝 신나게 춤추자! 🐾";
    } else if (category === "nature") {
      stateClass = "state-spin";
      eyeType = "heart";
      propClass = "prop-float";
      effectText = "🌈✨💫";
      line = "우와아! 반짝반짝 아름다운 [" + stk.name + "] 스티커야! 보리가 소중히 안아줄게! ✨";
    } else {
      stateClass = "state-hero";
      eyeType = "wink";
      propClass = "prop-bounce";
      effectText = "🎁🎉⭐";
      line = "야호! 보리가 제일 좋아하는 [" + stk.name + "] 보물 스티커야! 정말 멋지다! 🎁";
    }

    showEffectBadge(effectText);
    showPropBadge(svgHtml, propClass);
    setMood(stateClass, mouthPath, getEyeSvgByType(eyeType));
    say(line, true);

    stateTimer = setTimeout(resetToIdle, 3600);
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
    interactWithSticker: interactWithSticker,
    triggerRandomPetInteraction: triggerRandomPetInteraction,
    resetToIdle: resetToIdle
  };
})(window.HG);
