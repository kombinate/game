/**
 * ==========================================================================
 * 미니게임 2: 낱말 카드 짝 맞추기 (js/games/match.js)
 * ==========================================================================
 * - 단계별 학습 목표가 한눈에 보이도록 직관적인 시각 단서 제공:
 *   · 1단계(모음): 그림 + 첫 글자 강조(예: [오]이) ↔ 모음 카드 'ㅗ (오)'
 *   · 2단계(자음): 그림 + 첫 글자 강조(예: [코]끼리) ↔ 첫 자음 카드 'ㅋ (키읔)'
 *   · 3단계(글자): 그림 + 첫 글자 빈칸(예: [ ? ] 자) ↔ 첫 글자 카드 '사'
 *   · 4~5단계(낱말): 그림 카드 ↔ 전체 낱말 카드(예: '바나나', '강아지')
 */

window.HG = window.HG || {};
window.HG.Games = window.HG.Games || {};

(function (HG) {
  "use strict";

  let mountEl = null;
  let stageNum = 1;
  let onSolvedCallback = null;
  let selectedCard = null;
  let matchedCount = 0;
  let totalPairs = 3;
  let currentPairs = [];
  let isBusy = false;

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
    selectedCard = null;
    isBusy = false;
  }

  function getStageHeaderGuide() {
    if (stageNum === 1) {
      return "🃏 단어의 주황색 첫 글자 소리와 짝꿍인 모음 카드를 찾아 눌러요!";
    }
    if (stageNum === 2) {
      return "🃏 단어의 주황색 첫 글자에 들어가는 첫 자음 카드를 찾아 눌러요!";
    }
    if (stageNum === 3) {
      return "🃏 그림 단어의 빈칸 [ ? ]에 들어갈 첫 글자 카드를 찾아 눌러요!";
    }
    return "🃏 위쪽 그림 카드와 알맞은 아래쪽 한글 낱말 카드를 찾아 짝지어 봐요!";
  }

  function repeatPrompt() {
    const guide = getStageHeaderGuide();
    HG.Character.say(guide);
    HG.Audio.speak(guide);
  }

  /**
   * 상단 그림 카드 아래에 표시할 직관적인 단어 힌트 HTML 생성
   */
  function buildPicCardWordHintHtml(item) {
    const word = item.word || "";
    const firstChar = word.charAt(0);
    const restChars = word.slice(1);

    if (stageNum === 1 || stageNum === 2) {
      // 1~2단계: 첫 글자를 주황색 박스로 강조하여 왜 아래 모음/자음과 짝인지 즉시 이해되도록 표시
      return `
        <div class="match-pic-word">
          <span class="match-first-highlight">${firstChar}</span><span>${restChars}</span>
        </div>
      `;
    }

    if (stageNum === 3) {
      // 3단계: 2글자 이상 단어는 첫 글자를 [ ? ] 빈칸으로 보여주고, 1글자 단어는 [ ? ]와 힌트 표시
      if (word.length >= 2) {
        return `
          <div class="match-pic-word">
            <span class="match-blank-box">?</span><span>${restChars}</span>
          </div>
        `;
      }
      return `
        <div class="match-pic-word">
          <span class="match-blank-box">?</span>
        </div>
      `;
    }

    // 4~5단계: 그림만 보고 아래의 전체 낱말 카드를 찾도록 유도
    return `<div class="match-pic-hint">🔊 눌러서 소리 듣기</div>`;
  }

  /**
   * 하단 한글 카드 내부 HTML 생성
   */
  function buildWordCardInnerHtml(item) {
    if (stageNum === 1) {
      return `
        <div class="match-word-text">${item.char}</div>
        <div class="match-sub-phonetic">(${item.tts} 소리)</div>
      `;
    }
    if (stageNum === 2) {
      return `
        <div class="match-word-text">${item.char}</div>
        <div class="match-sub-phonetic">(${item.tts})</div>
      `;
    }
    return `<div class="match-word-text">${item.char}</div>`;
  }

  function nextQuestion() {
    if (!mountEl) return;
    selectedCard = null;
    matchedCount = 0;
    isBusy = false;

    const pool = HG.Words.getStageItems(stageNum);
    const uniquePool = [];
    const usedIcons = new Set();
    const usedChars = new Set();
    const usedRestChars = new Set();

    for (let attempt = 0; attempt < pool.length * 2 && uniquePool.length < totalPairs; attempt++) {
      const candidate = HG.Words.drawNextItem
        ? HG.Words.drawNextItem(stageNum, "match")
        : pool[Math.floor(Math.random() * pool.length)];
      const restPart = stageNum === 3 ? candidate.word.slice(1) : "";
      const restOk = !restPart || !usedRestChars.has(restPart) || attempt >= pool.length;
      if (
        !usedChars.has(candidate.char) &&
        (!usedIcons.has(candidate.icon) || attempt >= pool.length) &&
        restOk
      ) {
        usedChars.add(candidate.char);
        usedIcons.add(candidate.icon);
        if (restPart) usedRestChars.add(restPart);
        uniquePool.push(candidate);
      }
    }
    while (uniquePool.length < totalPairs) {
      uniquePool.push(pool[uniquePool.length % pool.length]);
    }
    currentPairs = uniquePool;

    const picCards = shuffle(
      currentPairs.map((item, idx) => ({
        pairId: idx,
        type: "pic",
        item
      }))
    );
    const wordCards = shuffle(
      currentPairs.map((item, idx) => ({
        pairId: idx,
        type: "word",
        item
      }))
    );

    const allCards = [...picCards, ...wordCards];

    mountEl.innerHTML = `
      <div class="game-header-bar">
        <div class="game-prompt-title">
          <span>${getStageHeaderGuide()}</span>
        </div>
        <button id="btn-match-listen" class="btn-sound-prompt" type="button">
          🔊 설명 듣기
        </button>
      </div>
      <div id="match-board" class="match-board"></div>
    `;

    const listenBtn = document.getElementById("btn-match-listen");
    if (listenBtn) {
      listenBtn.addEventListener("click", () => {
        HG.Audio.playTap();
        repeatPrompt();
      });
    }

    const boardEl = document.getElementById("match-board");

    allCards.forEach((cardData) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `match-card card-type-${cardData.type}`;
      btn.dataset.pairId = String(cardData.pairId);
      btn.dataset.cardType = cardData.type;

      if (cardData.type === "pic") {
        btn.innerHTML = `
          <div class="match-svg-wrap">${HG.Words.getIllustSvg(cardData.item.icon)}</div>
          ${buildPicCardWordHintHtml(cardData.item)}
        `;
      } else {
        btn.innerHTML = buildWordCardInnerHtml(cardData.item);
      }

      btn.addEventListener("click", () => handleCardTap(btn, cardData));
      boardEl.appendChild(btn);
    });

    HG.Character.say(getStageHeaderGuide());
  }

  function handleCardTap(btnEl, cardData) {
    if (isBusy || btnEl.classList.contains("matched")) return;

    HG.Audio.playTap();

    // 카드를 눌렀을 때 단계에 맞게 친절하게 발음 안내
    if (cardData.type === "pic") {
      if (stageNum === 1 || stageNum === 2) {
        HG.Audio.speak(`${cardData.item.word}, 첫소리는 ${cardData.item.tts}`, {
          audioSrc: cardData.item.audioSrc
        });
      } else {
        HG.Audio.speak(cardData.item.word, { audioSrc: cardData.item.audioSrc });
      }
    } else {
      HG.Audio.speak(cardData.item.tts, { audioSrc: cardData.item.audioSrc });
    }

    if (!selectedCard) {
      selectedCard = { el: btnEl, data: cardData };
      btnEl.classList.add("selected");
      return;
    }

    if (selectedCard.el === btnEl) {
      btnEl.classList.remove("selected");
      selectedCard = null;
      return;
    }

    if (selectedCard.data.type === cardData.type) {
      selectedCard.el.classList.remove("selected");
      selectedCard = { el: btnEl, data: cardData };
      btnEl.classList.add("selected");
      return;
    }

    isBusy = true;
    btnEl.classList.add("selected");

    if (selectedCard.data.pairId === cardData.pairId) {
      const prevEl = selectedCard.el;
      const matchedItem = cardData.item;
      selectedCard = null;

      setTimeout(() => {
        prevEl.classList.remove("selected");
        btnEl.classList.remove("selected");
        prevEl.classList.add("matched");
        btnEl.classList.add("matched");

        // 3단계에서 빈칸 [ ? ] 이었던 그림 카드도 완성된 전체 단어로 업데이트
        const picEl = cardData.type === "pic" ? btnEl : prevEl;
        const wordWrap = picEl.querySelector(".match-pic-word, .match-pic-hint");
        if (wordWrap) {
          wordWrap.innerHTML = `<span class="match-first-highlight">${matchedItem.word.charAt(0)}</span><span>${matchedItem.word.slice(1)}</span>`;
        }

        HG.Audio.playCorrect();
        const successSpeech =
          matchedItem.char === matchedItem.word
            ? `와아! 맞았어요! ${matchedItem.word}!`
            : `와아! 맞았어요! ${matchedItem.word} 할 때, ${matchedItem.tts}!`;
        HG.Audio.speak(successSpeech);

        matchedCount++;
        isBusy = false;

        if (matchedCount >= totalPairs) {
          HG.Character.reactHappy("우와! 세 쌍의 짝꿍 카드를 모두 정확하게 찾았어! 최고야! 🎉");
          setTimeout(() => {
            if (onSolvedCallback) onSolvedCallback();
          }, 1050);
        } else {
          HG.Character.reactHappy(`맞았어! "${matchedItem.word}"의 짝꿍 "${matchedItem.char}" 카드를 잘 찾았네!`);
        }
      }, 280);
    } else {
      const prevEl = selectedCard.el;
      selectedCard = null;

      HG.Audio.playEncourage();
      HG.Character.reactEncourage("앗, 다른 짝꿍 카드네! 단어의 첫 글자를 보고 다시 찾아볼까? 💕");

      prevEl.classList.add("gentle-wobble");
      btnEl.classList.add("gentle-wobble");

      setTimeout(() => {
        prevEl.classList.remove("selected", "gentle-wobble");
        btnEl.classList.remove("selected", "gentle-wobble");
        isBusy = false;
      }, 650);
    }
  }

  HG.Games.match = {
    start,
    stop,
    repeatPrompt,
    nextQuestion
  };
})(window.HG);
