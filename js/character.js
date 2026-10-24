/**
 * ==========================================================================
 * 방글방글 한글 놀이터 - SVG 마스코트 캐릭터 제어 (js/character.js)
 * ==========================================================================
 * - 순수 SVG와 CSS Keyframe으로 구현한 아기곰 '보리'
 * - 정답 시 덩실덩실 춤추기(dance), 오답 시 다정한 격려(encourage), 평상시 숨쉬기(idle)
 */

window.HG = window.HG || {};

(function (HG) {
  "use strict";

  const PRAISE_LINES = [
    "우와! 정말 대단해! 정답이야! 🎉",
    "딩동댕! 보리가 신나서 춤을 춰요! 💃",
    "반짝반짝 최고야! 한글 박사님 같아! 🌟",
    "야호! 정확하게 찾았어! 참 잘했어요! 👏",
    "멋져멋져! 우리 친구 손가락이 마법 같아! ✨"
  ];

  const ENCOURAGE_LINES = [
    "한 번 더 해볼까? 괜찮아! 천천히 찾아보자 💕",
    "아하! 아까웠어~ 보리랑 다시 한 번 눌러볼까? 🤗",
    "괜찮아 괜찮아! 소리를 다시 들어보면 찾을 수 있어! 🎵",
    "조금만 더 살펴볼까? 우리 친구는 할 수 있어! 🌱"
  ];

  const PET_LINES = [
    "헤헤, 간지러워요! 나랑 한글 놀이 해서 정말 좋아! 🐻",
    "보리 쓰다듬어 줘서 고마워! 오늘도 신나게 놀자! 💛",
    "별 5개를 모으면 움직이는 스티커 선물을 줄게! 🎁"
  ];

  let mascotStageEl = null;
  let speechTextEl = null;
  let stateTimer = null;

  function buildMascotSvg(mode = "normal") {
    return `
      <svg class="mascot-svg state-idle" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- 바닥 그림자 -->
        <ellipse cx="100" cy="204" rx="52" ry="10" fill="rgba(62, 39, 35, 0.14)" />

        <g class="mascot-body-group">
          <!-- 양쪽 귀 -->
          <g class="mascot-ears">
            <circle cx="52" cy="52" r="22" fill="#D78B48" stroke="#5D4037" stroke-width="4" />
            <circle cx="52" cy="52" r="11" fill="#FFCCBC" />
            <circle cx="148" cy="52" r="22" fill="#D78B48" stroke="#5D4037" stroke-width="4" />
            <circle cx="148" cy="52" r="11" fill="#FFCCBC" />
          </g>

          <!-- 다리 -->
          <ellipse cx="76" cy="188" rx="18" ry="15" fill="#D78B48" stroke="#5D4037" stroke-width="4" />
          <ellipse cx="124" cy="188" rx="18" ry="15" fill="#D78B48" stroke="#5D4037" stroke-width="4" />
          <circle cx="76" cy="190" r="7" fill="#FFF3E0" />
          <circle cx="124" cy="190" r="7" fill="#FFF3E0" />

          <!-- 몸통 (귀여운 노란 멜빵바지) -->
          <ellipse cx="100" cy="152" rx="46" ry="42" fill="#F4A460" stroke="#5D4037" stroke-width="4" />
          <path d="M62 150 Q100 162 138 150 L134 184 Q100 196 66 184 Z" fill="#29B6F6" stroke="#5D4037" stroke-width="4" stroke-linejoin="round" />
          <circle cx="78" cy="158" r="5" fill="#FFD54F" />
          <circle cx="122" cy="158" r="5" fill="#FFD54F" />
          <!-- 배 부분 하얀 털 -->
          <ellipse cx="100" cy="142" rx="24" ry="16" fill="#FFF8E1" />

          <!-- 양팔 -->
          <g class="mascot-arm-left">
            <ellipse cx="48" cy="144" rx="18" ry="13" transform="rotate(-25 48 144)" fill="#F4A460" stroke="#5D4037" stroke-width="4" />
          </g>
          <g class="mascot-arm-right">
            <ellipse cx="152" cy="144" rx="18" ry="13" transform="rotate(25 152 144)" fill="#F4A460" stroke="#5D4037" stroke-width="4" />
          </g>

          <!-- 머리 -->
          <circle cx="100" cy="92" r="52" fill="#F4A460" stroke="#5D4037" stroke-width="4" />

          <!-- 머리 위 새싹 장식 -->
          <path d="M100 40 Q100 24 112 20 Q116 32 100 40 Z" fill="#66BB6A" stroke="#2E7D32" stroke-width="3" />
          <path d="M100 40 Q100 26 88 22 Q84 34 100 40 Z" fill="#81C784" stroke="#2E7D32" stroke-width="3" />

          <!-- 발그레 볼터치 -->
          <ellipse cx="64" cy="102" rx="11" ry="7" fill="#FF8A80" opacity="0.65" />
          <ellipse cx="136" cy="102" rx="11" ry="7" fill="#FF8A80" opacity="0.65" />

          <!-- 입 주변 하얀 주둥이 -->
          <ellipse cx="100" cy="104" rx="22" ry="17" fill="#FFF8E1" />
          <ellipse cx="100" cy="96" rx="8" ry="6" fill="#4E342E" />

          <!-- 눈 (상태별 교체 가능) -->
          <g class="mascot-eyes" id="mascot-eyes-${mode}">
            <circle cx="76" cy="86" r="6.5" fill="#3E2723" />
            <circle cx="74" cy="84" r="2.2" fill="#FFFFFF" />
            <circle cx="124" cy="86" r="6.5" fill="#3E2723" />
            <circle cx="122" cy="84" r="2.2" fill="#FFFFFF" />
          </g>

          <!-- 입 모양 -->
          <path id="mascot-mouth-${mode}" d="M90 106 Q100 116 110 106" stroke="#4E342E" stroke-width="4" fill="none" stroke-linecap="round" />
        </g>
      </svg>
    `;
  }

  function init() {
    mascotStageEl = document.getElementById("mascot-stage");
    speechTextEl = document.getElementById("speech-text");
    const restSlotEl = document.getElementById("rest-character-slot");

    if (mascotStageEl) {
      mascotStageEl.innerHTML = buildMascotSvg("main");
      mascotStageEl.addEventListener("click", () => {
        HG.Audio.playTap();
        const line = PET_LINES[Math.floor(Math.random() * PET_LINES.length)];
        reactHappy(line, false);
      });
    }

    if (restSlotEl) {
      restSlotEl.innerHTML = `<div style="width:120px;height:130px;margin:0 auto;">${buildMascotSvg("rest")}</div>`;
    }
  }

  function setMood(stateClass, mouthPath, eyeHtml) {
    if (!mascotStageEl) return;
    const svg = mascotStageEl.querySelector(".mascot-svg");
    const mouth = document.getElementById("mascot-mouth-main");
    const eyes = document.getElementById("mascot-eyes-main");

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
      `
        <circle cx="76" cy="86" r="6.5" fill="#3E2723" />
        <circle cx="74" cy="84" r="2.2" fill="#FFFFFF" />
        <circle cx="124" cy="86" r="6.5" fill="#3E2723" />
        <circle cx="122" cy="84" r="2.2" fill="#FFFFFF" />
      `
    );
  }

  function say(message, speakAloud = false) {
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
  function reactHappy(customMessage, speakAloud = false) {
    if (stateTimer) clearTimeout(stateTimer);
    const msg = customMessage || PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)];
    say(msg, speakAloud);

    // 눈웃음 ^ ^ 과 활짝 웃는 입
    setMood(
      "state-dance",
      "M88 104 Q100 120 112 104 Z",
      `
        <path d="M68 88 Q76 78 84 88" stroke="#3E2723" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <path d="M116 88 Q124 78 132 88" stroke="#3E2723" stroke-width="4.5" fill="none" stroke-linecap="round" />
      `
    );

    stateTimer = setTimeout(resetToIdle, 2400);
  }

  /**
   * 오답 시 다정한 격려 리액션 (경고음/X표시 없이 따뜻하게 응원)
   */
  function reactEncourage(customMessage, speakAloud = false) {
    if (stateTimer) clearTimeout(stateTimer);
    const msg = customMessage || ENCOURAGE_LINES[Math.floor(Math.random() * ENCOURAGE_LINES.length)];
    say(msg, speakAloud);

    // 다정한 눈빛과 미소
    setMood(
      "state-encourage",
      "M92 108 Q100 113 108 108",
      `
        <circle cx="76" cy="86" r="6.5" fill="#3E2723" />
        <circle cx="74" cy="84" r="2.5" fill="#FFFFFF" />
        <circle cx="124" cy="86" r="6.5" fill="#3E2723" />
        <circle cx="122" cy="84" r="2.5" fill="#FFFFFF" />
      `
    );

    stateTimer = setTimeout(resetToIdle, 2200);
  }

  HG.Character = {
    init,
    say,
    reactHappy,
    reactEncourage,
    resetToIdle
  };
})(window.HG);
