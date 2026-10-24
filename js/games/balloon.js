/**
 * ==========================================================================
 * 미니게임 1: 글자 풍선 팡팡! (js/games/balloon.js)
 * ==========================================================================
 * - 소리를 듣고 둥실둥실 떠오르는 알록달록 풍선 중 알맞은 글자를 터치해 팡! 터뜨리기
 */

window.HG = window.HG || {};
window.HG.Games = window.HG.Games || {};

(function (HG) {
  "use strict";

  var BALLOON_COLORS = [
    { bg: "linear-gradient(145deg, #FF8A65, #E64A19)", tail: "#E64A19" },
    { bg: "linear-gradient(145deg, #4FC3F7, #0288D1)", tail: "#0288D1" },
    { bg: "linear-gradient(145deg, #AED581, #689F38)", tail: "#689F38" },
    { bg: "linear-gradient(145deg, #BA68C8, #7B1FA2)", tail: "#7B1FA2" },
    { bg: "linear-gradient(145deg, #FFD54F, #F57F17)", tail: "#F57F17" },
    { bg: "linear-gradient(145deg, #F06292, #C2185B)", tail: "#C2185B" }
  ];

  var mountEl = null;
  var stageNum = 1;
  var onSolvedCallback = null;
  var currentTarget = null;
  var animFrameId = null;
  var balloons = [];
  var isLocked = false;

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var _tmp = copy[i]; copy[i] = copy[j]; copy[j] = _tmp;
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
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    balloons = [];
    isLocked = false;
  }

  function repeatPrompt() {
    if (!currentTarget) return;
    var promptSpeech =
      currentTarget.char === currentTarget.word
        ? ((currentTarget.tts) + ", " + (currentTarget.word) + " 풍선을 찾아볼까요?")
        : ((currentTarget.tts) + ", " + (currentTarget.word) + " 할 때, " + (currentTarget.tts) + ".");
    HG.Audio.speak(promptSpeech, { audioSrc: currentTarget.audioSrc });
    HG.Character.say(("\"" + (currentTarget.char) + "\" 풍선이 어디 있을까? 소리를 듣고 콕 눌러봐!"));
  }

  function nextQuestion() {
    if (!mountEl) return;
    isLocked = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    var pool = HG.Words.getStageItems(stageNum);
    currentTarget = HG.Words.drawNextItem
      ? HG.Words.drawNextItem(stageNum, "balloon")
      : pool[Math.floor(Math.random() * pool.length)];

    // 정답 풍선 1개 + 서로 다른 오답 풍선 4개 (총 5개 풍선 모두 중복 없는 100% 고유 단어만 표시)
    var usedChars = new Set([currentTarget.char]);
    var distractors = [];
    var _shuffledPool = shuffle(pool);
    for (var _pi = 0; _pi < _shuffledPool.length; _pi++) {
      var item = _shuffledPool[_pi];
      if (!usedChars.has(item.char)) {
        usedChars.add(item.char);
        distractors.push(item);
        if (distractors.length >= 4) break;
      }
    }
    var choices = shuffle([currentTarget].concat(distractors));

    mountEl.innerHTML = ("\n      <div class=\"game-header-bar\">\n        <div class=\"game-prompt-title\">\n          <span>🎈 소리를 듣고 알맞은 풍선을 팡! 터뜨려요:</span>\n          <span class=\"prompt-target-badge\">" + (currentTarget.char) + "</span>\n        </div>\n        <button id=\"btn-balloon-listen\" class=\"btn-sound-prompt\" type=\"button\">\n          🔊 소리 듣기\n        </button>\n      </div>\n      <div id=\"balloon-sky\" class=\"balloon-stage\"></div>\n    ");

    var listenBtn = document.getElementById("btn-balloon-listen");
    if (listenBtn) {
      listenBtn.addEventListener("click", function () {
        HG.Audio.playTap();
        repeatPrompt();
      });
    }

    var skyEl = document.getElementById("balloon-sky");
    balloons = [];

    choices.forEach(function (item, idx) {
      var color = BALLOON_COLORS[idx % BALLOON_COLORS.length];
      var el = document.createElement("button");
      el.type = "button";
      el.className = "balloon-item";
      el.setAttribute("aria-label", ((item.char) + " 풍선"));
      el.innerHTML = ("\n        <div class=\"balloon-body\" style=\"background: " + (color.bg) + "; color: " + (color.tail) + ";\">\n          <span class=\"balloon-label\">" + (item.char) + "</span>\n        </div>\n        <div class=\"balloon-string\"></div>\n      ");

      // 가로로 겹치지 않게 고르게 배치 (5개 슬롯)
      var baseLeftPct = 6 + idx * 19;
      var baseTopPct = 20 + (idx % 2 === 0 ? 6 : 26);

      var bObj = {
        el: el,
        item: item,
        baseLeftPct: baseLeftPct,
        baseTopPct: baseTopPct,
        phase: idx * 1.3 + Math.random(),
        speed: 0.0022 + Math.random() * 0.001,
        ampY: 10 + Math.random() * 5,
        ampX: 1.5 + Math.random() * 1.0,
        popped: false
      };

      el.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        handleBalloonTap(bObj);
      });

      skyEl.appendChild(el);
      balloons.push(bObj);
    });

    repeatPrompt();
    animateBalloons(performance.now());
  }

  function animateBalloons(now) {
    balloons.forEach(function (b) {
      if (b.popped) return;
      var offsetY = Math.sin(now * b.speed + b.phase) * b.ampY;
      var offsetX = Math.cos(now * b.speed * 0.8 + b.phase) * b.ampX;
      b.el.style.left = ((b.baseLeftPct + offsetX) + "%");
      b.el.style.top = ((b.baseTopPct + offsetY) + "%");
    });
    animFrameId = requestAnimationFrame(animateBalloons);
  }

  function handleBalloonTap(bObj) {
    if (isLocked || bObj.popped) return;

    if (bObj.item.char === currentTarget.char) {
      // 정답 풍선 터뜨림!
      isLocked = true;
      bObj.popped = true;
      bObj.el.classList.add("balloon-popping");

      HG.Audio.playPop();
      setTimeout(function () {
        HG.Audio.playCorrect();
        var praiseSpeech =
          currentTarget.char === currentTarget.word
            ? ("우와, 잘했어요. " + (currentTarget.word) + "!")
            : ("우와, 맞았어요. " + (currentTarget.word) + " 할 때, " + (currentTarget.tts) + "!");
        HG.Audio.speak(praiseSpeech, {
          audioSrc: currentTarget.audioSrc
        });
      }, 150);

      HG.Character.reactHappy(("와아! \"" + (currentTarget.char) + "\" 풍선을 멋지게 터뜨렸어! 🎈"));

      setTimeout(function () {
        if (onSolvedCallback) onSolvedCallback();
      }, 1300);
    } else {
      // 오답 풍선 터치 시: 경고음 없이 풍선이 통통 흔들리며 해당 글자를 읽어주고 다정하게 격려
      HG.Audio.playEncourage();
      HG.Audio.speak(bObj.item.tts);
      bObj.el.classList.remove("gentle-wobble");
      void bObj.el.offsetWidth;
      bObj.el.classList.add("gentle-wobble");

      HG.Character.reactEncourage(
        ("이 풍선은 \"" + (bObj.item.char) + "\" 풍선이야! \"" + (currentTarget.char) + "\" 풍선을 한 번 더 찾아볼까? 😊")
      );
    }
  }

  HG.Games.balloon = {
    start: start,
    stop: stop,
    repeatPrompt: repeatPrompt,
    nextQuestion: nextQuestion
  };
})(window.HG);
