/**
 * ==========================================================================
 * 미니게임 4: 글자 블록 합체! (js/games/build.js)
 * ==========================================================================
 * - 1~4단계(무받침 글자): [자음 블록] + [모음 블록] = [완성 글자] (예: 'ㄱ' + 'ㅏ' = '가')
 * - 5단계(받침 글자): [첫 자음 블록] + [모음 블록] + [받침 블록] = [완성 글자] (예: 'ㅅ' + 'ㅓ' + 'ㄴ' = '선')
 * - 만 6세 소근육을 배려하여 클릭(터치)과 드래그 앤 드롭 두 가지 조작 모두 지원
 */

window.HG = window.HG || {};
window.HG.Games = window.HG.Games || {};

(function (HG) {
  "use strict";

  const ALL_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const ALL_VOWELS = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ", "ㅐ", "ㅔ"];

  let mountEl = null;
  let stageNum = 1;
  let onSolvedCallback = null;

  let currentItem = null;
  let targetCho = "ㄱ";
  let targetJung = "ㅏ";
  let targetJong = "";
  let hasJong = false;
  let targetSyllable = "가";

  let filledCho = false;
  let filledJung = false;
  let filledJong = false;
  let isCompleted = false;

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function start(container, stage, onSolved) {
    stop();
    mountEl = container;
    stageNum = stage;
    onSolvedCallback = onSolved;
    nextQuestion();
  }

  function stop() {
    isCompleted = false;
  }

  function repeatPrompt() {
    if (!currentItem) return;
    const speechText =
      currentItem.word === targetSyllable
        ? `${targetSyllable}, 블록을 합쳐서 만들어 볼까요?`
        : `${currentItem.word} 할 때, ${targetSyllable}, 블록을 합쳐서 만들어 볼까요?`;
    HG.Audio.speak(speechText, {
      audioSrc: currentItem.audioSrc
    });

    if (hasJong) {
      HG.Character.say(
        `자음 "${targetCho}", 모음 "${targetJung}", 받침 "${targetJong}" 블록을 합쳐서 "${targetSyllable}" 글자를 만들어 볼까? 🧩`
      );
    } else {
      HG.Character.say(
        `자음 "${targetCho}" 블록과 모음 "${targetJung}" 블록을 합쳐서 "${targetSyllable}" 글자를 만들어 볼까? 🧩`
      );
    }
  }

  function nextQuestion() {
    if (!mountEl) return;
    isCompleted = false;
    filledCho = false;
    filledJung = false;
    filledJong = false;

    const pool = HG.Words.getStageItems(stageNum);
    currentItem = HG.Words.drawNextItem
      ? HG.Words.drawNextItem(stageNum, "build")
      : pool[Math.floor(Math.random() * pool.length)];

    targetCho = (currentItem.jamo && currentItem.jamo[0]) || "ㄱ";
    targetJung = (currentItem.jamo && currentItem.jamo[1]) || "ㅏ";
    targetJong = (currentItem.jamo && currentItem.jamo[2]) || "";
    hasJong = Boolean(targetJong);
    filledJong = !hasJong;

    targetSyllable =
      currentItem.buildTarget || HG.Words.combineHangul(targetCho, targetJung, targetJong);

    const badgeLabel =
      currentItem.word === targetSyllable
        ? targetSyllable
        : `${targetSyllable} (${currentItem.word})`;

    const jongSlotHtml = hasJong
      ? `
          <div class="build-operator">+</div>

          <div id="slot-jong" class="build-slot" data-slot="jong">
            <span id="slot-jong-text">${targetJong}</span>
            <span class="build-slot-caption">받침 블록</span>
          </div>
        `
      : "";

    mountEl.innerHTML = `
      <div class="game-header-bar">
        <div class="game-prompt-title">
          <span>🧩 블록을 눌러 글자를 합체해 봐요:</span>
          <span class="prompt-target-badge">${badgeLabel}</span>
        </div>
        <button id="btn-build-listen" class="btn-sound-prompt" type="button">
          🔊 소리 듣기
        </button>
      </div>

      <div class="build-workspace">
        <!-- 상단 조립 공식 영역 -->
        <div class="build-equation-zone">
          <div id="slot-cho" class="build-slot slot-active" data-slot="cho">
            <span id="slot-cho-text">${targetCho}</span>
            <span class="build-slot-caption">${hasJong ? "첫 자음" : "자음 블록"}</span>
          </div>

          <div class="build-operator">+</div>

          <div id="slot-jung" class="build-slot" data-slot="jung">
            <span id="slot-jung-text">${targetJung}</span>
            <span class="build-slot-caption">모음 블록</span>
          </div>

          ${jongSlotHtml}

          <div class="build-operator">=</div>

          <div id="build-result-box" class="build-result-box">
            <span id="build-result-text">?</span>
          </div>
        </div>

        <!-- 하단 블록 트레이 -->
        <div id="build-choices-tray" class="build-choices-tray"></div>
      </div>
    `;

    const listenBtn = document.getElementById("btn-build-listen");
    if (listenBtn) {
      listenBtn.addEventListener("click", () => {
        HG.Audio.playTap();
        repeatPrompt();
      });
    }

    const trayEl = document.getElementById("build-choices-tray");

    if (!hasJong) {
      // 1~4단계(2슬롯): 자음 3개(파란색) + 모음 3개(분홍색) = 6개 블록
      const distractorCons = shuffle(ALL_CONSONANTS.filter((c) => c !== targetCho)).slice(0, 2);
      const distractorVowels = shuffle(ALL_VOWELS.filter((v) => v !== targetJung)).slice(0, 2);

      const consChoices = shuffle([targetCho, ...distractorCons]);
      const vowelChoices = shuffle([targetJung, ...distractorVowels]);

      consChoices.forEach((c) => trayEl.appendChild(createBlockButton(c, "cons")));
      vowelChoices.forEach((v) => trayEl.appendChild(createBlockButton(v, "vowel")));
    } else {
      // 5단계(3슬롯): 첫 자음 2개(파란색) + 모음 2개(분홍색) + 받침 2개(초록색) = 6개 블록
      const distractorCho = shuffle(
        ALL_CONSONANTS.filter((c) => c !== targetCho && c !== targetJong)
      ).slice(0, 1);
      const distractorVowels = shuffle(ALL_VOWELS.filter((v) => v !== targetJung)).slice(0, 1);
      const distractorJong = shuffle(
        ALL_CONSONANTS.filter(
          (c) => c !== targetJong && c !== targetCho && !distractorCho.includes(c)
        )
      ).slice(0, 1);

      const choChoices = shuffle([targetCho, ...distractorCho]);
      const vowelChoices = shuffle([targetJung, ...distractorVowels]);
      const jongChoices = shuffle([targetJong, ...distractorJong]);

      choChoices.forEach((c) => trayEl.appendChild(createBlockButton(c, "cons")));
      vowelChoices.forEach((v) => trayEl.appendChild(createBlockButton(v, "vowel")));
      jongChoices.forEach((j) => trayEl.appendChild(createBlockButton(j, "jong")));
    }

    repeatPrompt();
  }

  function createBlockButton(jamoChar, kind) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `jamo-block-btn type-${kind}`;
    btn.textContent = jamoChar;
    btn.dataset.jamo = jamoChar;
    btn.dataset.kind = kind;

    let startX = 0;
    let startY = 0;
    let dragging = false;

    btn.addEventListener("pointerdown", (e) => {
      if (isCompleted || btn.disabled) return;
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
      btn.style.zIndex = "30";
    });

    btn.addEventListener("pointermove", (e) => {
      if (!dragging || isCompleted) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
    });

    const finishPointer = () => {
      if (!dragging) return;
      dragging = false;
      btn.style.transform = "";
      btn.style.zIndex = "";
      handleBlockSelection(btn, jamoChar, kind);
    };

    btn.addEventListener("pointerup", finishPointer);
    btn.addEventListener("pointercancel", () => {
      dragging = false;
      btn.style.transform = "";
      btn.style.zIndex = "";
    });

    return btn;
  }

  function updateActiveSlotHighlight() {
    const slotChoEl = document.getElementById("slot-cho");
    const slotJungEl = document.getElementById("slot-jung");
    const slotJongEl = document.getElementById("slot-jong");

    if (slotChoEl) slotChoEl.classList.remove("slot-active");
    if (slotJungEl) slotJungEl.classList.remove("slot-active");
    if (slotJongEl) slotJongEl.classList.remove("slot-active");

    if (!filledCho && slotChoEl) {
      slotChoEl.classList.add("slot-active");
    } else if (!filledJung && slotJungEl) {
      slotJungEl.classList.add("slot-active");
    } else if (!filledJong && slotJongEl) {
      slotJongEl.classList.add("slot-active");
    }

    // 초성+중성이 먼저 채워졌을 때 결과 박스에 중간 조합 글자(예: ㅅ+ㅓ -> 서) 미리보기 표시
    const resultText = document.getElementById("build-result-text");
    if (resultText && !isCompleted) {
      if (filledCho && filledJung && !filledJong) {
        resultText.textContent = HG.Words.combineHangul(targetCho, targetJung);
      }
    }
  }

  function handleBlockSelection(btnEl, jamoChar, kind) {
    if (isCompleted) return;

    HG.Audio.playTap();
    HG.Audio.speak(jamoChar);

    const slotChoEl = document.getElementById("slot-cho");
    const slotJungEl = document.getElementById("slot-jung");
    const slotJongEl = document.getElementById("slot-jong");

    if (kind === "cons") {
      if (filledCho) {
        HG.Character.say(`첫 자음 "${targetCho}" 블록은 이미 들어갔어! 다음 빈칸 블록을 찾아볼까?`);
        return;
      }

      if (jamoChar === targetCho) {
        filledCho = true;
        btnEl.disabled = true;
        btnEl.style.opacity = "0.35";

        if (slotChoEl) slotChoEl.classList.add("slot-filled-cons");
        updateActiveSlotHighlight();
        HG.Audio.playSparkle(2);
        checkIfAllFilled();
      } else {
        HG.Audio.playEncourage();
        btnEl.classList.remove("gentle-wobble");
        void btnEl.offsetWidth;
        btnEl.classList.add("gentle-wobble");
        HG.Character.reactEncourage(
          `그건 "${jamoChar}" 블록이야! "${targetCho}" 모양 파란색 블록을 찾아볼까? 😊`
        );
      }
    } else if (kind === "vowel") {
      if (filledJung) {
        HG.Character.say(`모음 "${targetJung}" 블록은 이미 들어갔어! 다른 빈칸 블록을 찾아볼까?`);
        return;
      }

      if (jamoChar === targetJung) {
        filledJung = true;
        btnEl.disabled = true;
        btnEl.style.opacity = "0.35";

        if (slotJungEl) slotJungEl.classList.add("slot-filled-vowel");
        updateActiveSlotHighlight();
        HG.Audio.playSparkle(4);
        checkIfAllFilled();
      } else {
        HG.Audio.playEncourage();
        btnEl.classList.remove("gentle-wobble");
        void btnEl.offsetWidth;
        btnEl.classList.add("gentle-wobble");
        HG.Character.reactEncourage(
          `그건 "${jamoChar}" 블록이야! "${targetJung}" 모양 분홍색 블록을 찾아볼까? 💕`
        );
      }
    } else if (kind === "jong") {
      if (filledJong) {
        HG.Character.say(`받침 "${targetJong}" 블록은 이미 들어갔어! 다른 빈칸 블록을 찾아볼까?`);
        return;
      }

      if (jamoChar === targetJong) {
        filledJong = true;
        btnEl.disabled = true;
        btnEl.style.opacity = "0.35";

        if (slotJongEl) slotJongEl.classList.add("slot-filled-jong");
        updateActiveSlotHighlight();
        HG.Audio.playSparkle(6);
        checkIfAllFilled();
      } else {
        HG.Audio.playEncourage();
        btnEl.classList.remove("gentle-wobble");
        void btnEl.offsetWidth;
        btnEl.classList.add("gentle-wobble");
        HG.Character.reactEncourage(
          `그건 "${jamoChar}" 블록이야! "${targetJong}" 모양 초록색 받침 블록을 찾아볼까? 🍀`
        );
      }
    }
  }

  function checkIfAllFilled() {
    if (!filledCho || !filledJung || !filledJong) {
      if (!filledCho) {
        HG.Character.say(`잘했어! 이제 파란색 자음 "${targetCho}" 블록을 콕 눌러보자!`);
      } else if (!filledJung) {
        HG.Character.say(`잘했어! 이제 분홍색 모음 "${targetJung}" 블록을 콕 눌러보자!`);
      } else if (!filledJong) {
        HG.Character.say(`잘했어! 이제 초록색 받침 "${targetJong}" 블록을 콕 눌러보자!`);
      }
      return;
    }

    // 모든 블록 합체 완료!
    isCompleted = true;
    const resultBox = document.getElementById("build-result-box");
    const resultText = document.getElementById("build-result-text");

    if (resultText) resultText.textContent = targetSyllable;
    if (resultBox) resultBox.classList.add("completed");

    HG.Audio.playCorrect();
    setTimeout(() => {
      const doneSpeech =
        currentItem.word === targetSyllable
          ? `우와, 멋져요! ${targetSyllable}!`
          : `우와, 멋져요! ${targetSyllable}, ${currentItem.word}!`;
      HG.Audio.speak(doneSpeech, {
        audioSrc: currentItem.audioSrc
      });
    }, 180);

    const formulaDesc = hasJong
      ? `"${targetCho}", "${targetJung}", "${targetJong}"이 합체해서 "${targetSyllable}"`
      : `"${targetCho}"과 "${targetJung}"이 합체해서 "${targetSyllable}"`;
    HG.Character.reactHappy(`우와! ${formulaDesc} 글자가 완성되었어! 최고야! 🎉`);

    setTimeout(() => {
      if (onSolvedCallback) onSolvedCallback();
    }, 1500);
  }

  HG.Games.build = {
    start,
    stop,
    repeatPrompt,
    nextQuestion
  };
})(window.HG);
