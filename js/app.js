/**
 * ==========================================================================
 * 방글방글 한글 놀이터 - 메인 앱 & 게임 매니저 (js/app.js)
 * ==========================================================================
 * - 화면 전환 (홈 / 미니게임 4종 / 내 스티커북)
 * - 5문제 해결 시 5~8초 축하 애니메이션 & 움직이는 스티커 카드 획득
 * - 우측 상단 3초 롱프레스 부모님 설정 메뉴 (단계 선택, 음량, 진행도 초기화, 15분 휴식 타이머)
 * - localStorage 자동 저장 및 복원
 */

window.HG = window.HG || {};

(function (HG) {
  "use strict";

  var STORAGE_KEY = "hangul_playground_state_v1";
  var REST_LIMIT_SECONDS = 15 * 60; // 15분 (900초)

  var defaultState = {
    currentStage: 1,
    volume: 85,
    speechRate: 0.92,
    preferredVoiceURI: "",
    roundStars: 0,       // 0 ~ 5 (5개 채우면 스티커 보상)
    totalSolved: 0,
    unlockedStickers: ["stk_bear"], // 기본 환영 스티커 1장 지급
    restTimerEnabled: true,
    bgmEnabled: true,
    bgmVolume: 100,
    bgmVolumeCustom: false
  };

  var state = loadState();
  var activeGameKey = null;
  var rewardAutoTimer = null;

  // 15분 쉬는 시간 타이머 상태
  var restRemainingSec = REST_LIMIT_SECONDS;
  var restIntervalId = null;

  // 부모님 3초 롱프레스 타이머 상태
  var holdStartTime = 0;
  var holdAnimFrame = null;
  var HOLD_DURATION_MS = 3000;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaultState);
      var parsed = JSON.parse(raw);
      if (!parsed.bgmVolumeCustom) {
        parsed.bgmVolume = 100;
      }
      return Object.assign({}, defaultState, parsed, { unlockedStickers: Array.isArray(parsed.unlockedStickers) ? parsed.unlockedStickers : ["stk_bear"] });
    } catch (e) {
      return Object.assign({}, defaultState);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function init() {
    preventMobileTouchGlitches();
    HG.Character.init();

    // 오디오 볼륨/속도/선호 목소리/배경음악 초기 반영
    HG.Audio.setVolume(state.volume / 100);
    HG.Audio.setSpeechRate(state.speechRate);
    if (state.preferredVoiceURI) {
      HG.Audio.setPreferredVoice(state.preferredVoiceURI);
    }
    if (HG.Audio.setBgmVolume) {
      var initBgmVol = typeof state.bgmVolume === "number" ? state.bgmVolume : 100;
      HG.Audio.setBgmVolume(initBgmVol / 100);
    }
    if (HG.Audio.setBgmEnabled) {
      HG.Audio.setBgmEnabled(state.bgmEnabled !== false);
    }

    bindTopBarEvents();
    bindHomeEvents();
    bindRewardModalEvents();
    bindParentModalEvents();
    bindRestOverlayEvents();

    syncStageUI();
    syncStarProgressUI();
    syncStickerBadgeUI();
    syncBgmUI();
    startRestTimer();
  }

  /**
   * 모바일 터치 오동작 방지 (더블탭 확대, 롱프레스 컨텍스트 메뉴, 고무줄 스크롤 방지)
   */
  function preventMobileTouchGlitches() {
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    document.addEventListener("selectstart", function (e) { e.preventDefault(); });

    var lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false }
    );

    var dismissPortraitBtn = document.getElementById("btn-dismiss-portrait");
    if (dismissPortraitBtn) {
      dismissPortraitBtn.addEventListener("click", function () {
        document.body.classList.add("force-portrait");
        syncViewportMetrics();
      });
    }

    syncViewportMetrics();
    window.addEventListener("resize", syncViewportMetrics);
    window.addEventListener("orientationchange", function () {
      setTimeout(syncViewportMetrics, 120);
      setTimeout(syncViewportMetrics, 350);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncViewportMetrics);
      window.visualViewport.addEventListener("scroll", syncViewportMetrics);
    }
  }

  /**
   * 모바일 브라우저 주소창/네비게이션바를 제외한 실제 가시 영역(visualViewport) 크기를
   * CSS 변수(--app-width, --app-height)에 실시간 동기화하여 화면 잘림 방지
   */
  function syncViewportMetrics() {
    var vv = window.visualViewport;
    var w = Math.round(vv ? vv.width : window.innerWidth || document.documentElement.clientWidth);
    var h = Math.round(vv ? vv.height : window.innerHeight || document.documentElement.clientHeight);
    if (document.documentElement.style.setProperty) {
      document.documentElement.style.setProperty("--app-width", w + "px");
      document.documentElement.style.setProperty("--app-height", h + "px");
    }
    var wrapper = document.getElementById("app-wrapper");
    var stage = document.getElementById("stage-container");
    if (wrapper) {
      wrapper.style.width = w + "px";
      wrapper.style.height = h + "px";
    }
    if (stage) {
      if (w <= 960 || h <= 540) {
        stage.style.width = w + "px";
        stage.style.height = h + "px";
      } else {
        stage.style.width = "";
        stage.style.height = "";
      }
    }
  }

  /**
   * 상단 바 버튼 이벤트 바인딩
   */
  function bindTopBarEvents() {
    var btnHome = document.getElementById("btn-home");
    var btnStageBadge = document.getElementById("btn-stage-badge");
    var btnRepeatTts = document.getElementById("btn-repeat-tts");
    var btnStickerbook = document.getElementById("btn-stickerbook");
    var btnBgmToggle = document.getElementById("btn-bgm-toggle");
    var btnFullscreen = document.getElementById("btn-fullscreen");
    var btnParentLock = document.getElementById("btn-parent-lock");

    if (btnBgmToggle) {
      btnBgmToggle.addEventListener("click", function () {
        HG.Audio.playTap();
        state.bgmEnabled = !(state.bgmEnabled !== false);
        if (HG.Audio.setBgmEnabled) {
          HG.Audio.setBgmEnabled(state.bgmEnabled);
        }
        saveState();
        syncBgmUI();
      });
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", function () {
        HG.Audio.playTap();
        var docEl = document.documentElement;
        var isFs = document.fullscreenElement || document.webkitFullscreenElement;
        if (!isFs) {
          var req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
          if (req) {
            try {
              req.call(docEl);
              if (screen.orientation && screen.orientation.lock) {
                try {
                  var p = screen.orientation.lock("landscape");
                  if (p && p.catch) p.catch(function () {});
                } catch (e2) {}
              }
              setTimeout(syncViewportMetrics, 150);
            } catch (e) {}
          }
        } else {
          var exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) {
            try { exit.call(document); setTimeout(syncViewportMetrics, 150); } catch (e) {}
          }
        }
      });
    }

    if (btnHome) {
      btnHome.addEventListener("click", function () {
        HG.Audio.playTap();
        showScreen("home");
      });
    }

    if (btnStageBadge) {
      btnStageBadge.addEventListener("click", function () {
        HG.Audio.playTap();
        var nextStage = (state.currentStage % 5) + 1;
        setStage(nextStage);
      });
    }

    if (btnRepeatTts) {
      btnRepeatTts.addEventListener("click", function () {
        HG.Audio.playTap();
        if (activeGameKey && HG.Games[activeGameKey]) {
          HG.Games[activeGameKey].repeatPrompt();
        }
      });
    }

    if (btnStickerbook) {
      btnStickerbook.addEventListener("click", function () {
        HG.Audio.playTap();
        showScreen("stickerbook");
      });
    }

    // 우측 상단 부모님 설정 버튼: 3초간 길게 누르기 (Long-Press)
    if (btnParentLock) {
      var ringFill = document.getElementById("parent-ring-fill");
      var circumference = 113.1;

      var cancelHold = function () {
        holdStartTime = 0;
        if (holdAnimFrame) {
          cancelAnimationFrame(holdAnimFrame);
          holdAnimFrame = null;
        }
        if (ringFill) {
          ringFill.style.strokeDashoffset = String(circumference);
        }
      };

      var updateHold = function (now) {
        if (!holdStartTime) return;
        var elapsed = now - holdStartTime;
        var progress = Math.min(1, elapsed / HOLD_DURATION_MS);
        if (ringFill) {
          ringFill.style.strokeDashoffset = String(circumference * (1 - progress));
        }
        if (progress >= 1) {
          cancelHold();
          openParentModal();
          return;
        }
        holdAnimFrame = requestAnimationFrame(updateHold);
      };

      btnParentLock.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        holdStartTime = performance.now();
        holdAnimFrame = requestAnimationFrame(updateHold);
      });

      ["pointerup", "pointerleave", "pointercancel"].forEach(function (evt) {
        btnParentLock.addEventListener(evt, cancelHold);
      });
    }
  }

  /**
   * 홈 화면 단계 선택 탭 및 미니게임 4종 카드 클릭 이벤트
   */
  function bindHomeEvents() {
    var stageTabs = document.querySelectorAll("#home-stage-selector .stage-tab");
    stageTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        HG.Audio.playTap();
        var stg = Number(tab.dataset.stage) || 1;
        setStage(stg);
      });
    });

    var gameCards = document.querySelectorAll(".game-mode-card");
    gameCards.forEach(function (card) {
      card.addEventListener("click", function () {
        HG.Audio.playTap();
        var gameKey = card.dataset.game;
        startGame(gameKey);
      });
    });
  }

  function setStage(stageNum) {
    state.currentStage = Math.max(1, Math.min(5, Number(stageNum)));
    saveState();
    syncStageUI();

    var meta = HG.Words.STAGE_META[state.currentStage];
    HG.Character.say(((meta.title) + "! " + (meta.desc)));
    HG.Audio.speak(meta.title);

    // 현재 미니게임 플레이 중이면 새 단계로 즉시 문제 갱신
    if (activeGameKey && HG.Games[activeGameKey]) {
      var mount = document.getElementById("game-mount");
      HG.Games[activeGameKey].start(mount, state.currentStage, handleProblemSolved);
    }
  }

  function syncStageUI() {
    var meta = HG.Words.STAGE_META[state.currentStage];
    var badgeLabel = document.getElementById("current-stage-label");
    if (badgeLabel && meta) {
      badgeLabel.textContent = meta.title;
    }

    var stageTabs = document.querySelectorAll("#home-stage-selector .stage-tab");
    stageTabs.forEach(function (tab) {
      var tabStage = Number(tab.dataset.stage);
      tab.classList.toggle("active", tabStage === state.currentStage);
    });

    var parentSelect = document.getElementById("select-parent-stage");
    if (parentSelect) {
      parentSelect.value = String(state.currentStage);
    }
  }

  function syncStarProgressUI() {
    var slots = document.querySelectorAll("#round-progress .star-slot");
    slots.forEach(function (slot, idx) {
      slot.classList.toggle("filled", idx < state.roundStars);
    });
  }

  function syncStickerBadgeUI() {
    var badge = document.getElementById("sticker-count-badge");
    if (badge) {
      badge.textContent = String(state.unlockedStickers.length);
    }
  }

  function syncBgmUI() {
    var enabled = state.bgmEnabled !== false;
    var iconLabel = document.getElementById("bgm-icon-label");
    if (iconLabel) {
      iconLabel.textContent = enabled ? "🎵" : "🔇";
    }
    var chkBgm = document.getElementById("chk-bgm-enabled");
    if (chkBgm) {
      chkBgm.checked = enabled;
    }
    var titleBadge = document.getElementById("label-bgm-title");
    if (titleBadge && HG.Audio.getCurrentBgmTitle) {
      titleBadge.textContent = enabled ? ("🎵 " + HG.Audio.getCurrentBgmTitle()) : "🔇 꺼짐";
    }
  }

  /**
   * 화면 전환 제어 (home | game | stickerbook)
   */
  function showScreen(screenName) {
    if (activeGameKey && HG.Games[activeGameKey]) {
      HG.Games[activeGameKey].stop();
      activeGameKey = null;
    }

    var screens = {
      home: document.getElementById("screen-home"),
      game: document.getElementById("screen-game"),
      stickerbook: document.getElementById("screen-stickerbook")
    };

    Object.keys(screens).forEach(function (key) {
      if (screens[key]) {
        screens[key].classList.toggle("active", key === screenName);
      }
    });

    var repeatBtn = document.getElementById("btn-repeat-tts");
    if (repeatBtn) {
      repeatBtn.classList.toggle("hidden", screenName !== "game");
    }

    if (screenName === "home") {
      HG.Character.say("어떤 한글 놀이를 해볼까? 재미있는 놀이 카드를 골라봐! 🎈");
    } else if (screenName === "stickerbook") {
      renderStickerbook();
      HG.Character.say("우와! 우리가 모은 반짝반짝 스티커들이야! 스티커를 콕 눌러봐! 🌟");
    }
  }

  /**
   * 미니게임 시작
   */
  function startGame(gameKey) {
    if (!HG.Games[gameKey]) return;
    showScreen("game");
    activeGameKey = gameKey;

    var repeatBtn = document.getElementById("btn-repeat-tts");
    if (repeatBtn) repeatBtn.classList.remove("hidden");

    var mount = document.getElementById("game-mount");
    HG.Games[gameKey].start(mount, state.currentStage, handleProblemSolved);
  }

  /**
   * 미니게임에서 1문제 해결 시 호출되는 콜백
   * - 5문제를 풀면 5~8초간 신나는 축하 애니메이션과 함께 움직이는 스티커 카드 1장 획득!
   */
  function handleProblemSolved() {
    state.roundStars += 1;
    state.totalSolved += 1;
    syncStarProgressUI();
    saveState();

    if (state.roundStars >= 5) {
      // 5문제 달성 -> 스티커 보상 모달 오픈!
      setTimeout(function () {
        triggerStickerReward();
      }, 350);
    } else {
      // 다음 문제 출제
      if (activeGameKey && HG.Games[activeGameKey]) {
        HG.Games[activeGameKey].nextQuestion();
      }
    }
  }

  /**
   * 5문제 완료 보상 연출 (5~8초 축하 팡파레 + 꽃가루 + 움직이는 스티커 획득)
   */
  function triggerStickerReward() {
    var catalog = HG.Words.STICKER_CATALOG;
    var lockedList = catalog.filter(function (s) { return !state.unlockedStickers.includes(s.id); });
    var chosenSticker =
      lockedList.length > 0
        ? lockedList[Math.floor(Math.random() * lockedList.length)]
        : catalog[Math.floor(Math.random() * catalog.length)];

    if (!state.unlockedStickers.includes(chosenSticker.id)) {
      state.unlockedStickers.push(chosenSticker.id);
    }

    state.roundStars = 0;
    saveState();
    syncStarProgressUI();
    syncStickerBadgeUI();

    var overlay = document.getElementById("reward-overlay");
    var showcase = document.getElementById("reward-sticker-showcase");
    var titleEl = document.getElementById("reward-sticker-title");
    var descEl = document.getElementById("reward-sticker-desc");

    if (showcase) {
      showcase.innerHTML = HG.Words.getIllustSvg(chosenSticker.icon);
    }
    if (titleEl) {
      titleEl.textContent = ("🎉 [" + (chosenSticker.name) + "] 스티커 획득!");
    }
    if (descEl) {
      descEl.textContent = chosenSticker.desc;
    }

    if (overlay) {
      overlay.classList.remove("hidden");
    }

    spawnConfettiPieces(42);
    HG.Audio.playFanfare();
    HG.Character.reactHappy(("우와!! 별 5개를 모두 모아서 [" + (chosenSticker.name) + "] 스티커를 받았어! 🎉"));

    setTimeout(function () {
      HG.Audio.speak(("참 잘했어요! " + (chosenSticker.name) + " 스티커를 받았어요!"));
    }, 900);

    // 7초간 신나는 축하 애니메이션 후 자동으로 다음 라운드로 이어지거나 버튼으로 즉시 이동 가능
    if (rewardAutoTimer) clearTimeout(rewardAutoTimer);
    rewardAutoTimer = setTimeout(function () {
      closeRewardModalAndContinue();
    }, 7000);
  }

  function spawnConfettiPieces(count) {
    var layer = document.getElementById("confetti-layer");
    if (!layer) return;
    layer.innerHTML = "";
    var colors = ["#FF7043", "#FFD54F", "#29B6F6", "#66BB6A", "#AB47BC", "#EC407A"];

    for (var i = 0; i < count; i++) {
      var piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = ((Math.random() * 100) + "%");
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDuration = ((2.2 + Math.random() * 2.4) + "s");
      piece.style.animationDelay = ((Math.random() * 1.2) + "s");
      layer.appendChild(piece);
    }
  }

  function closeRewardModalAndContinue() {
    if (rewardAutoTimer) {
      clearTimeout(rewardAutoTimer);
      rewardAutoTimer = null;
    }
    var overlay = document.getElementById("reward-overlay");
    if (overlay) overlay.classList.add("hidden");

    if (activeGameKey && HG.Games[activeGameKey]) {
      HG.Games[activeGameKey].nextQuestion();
    }
  }

  function bindRewardModalEvents() {
    var btnContinue = document.getElementById("btn-reward-continue");
    var btnStickerbook = document.getElementById("btn-reward-stickerbook");

    if (btnContinue) {
      btnContinue.addEventListener("click", function () {
        HG.Audio.playTap();
        closeRewardModalAndContinue();
      });
    }

    if (btnStickerbook) {
      btnStickerbook.addEventListener("click", function () {
        HG.Audio.playTap();
        if (rewardAutoTimer) {
          clearTimeout(rewardAutoTimer);
          rewardAutoTimer = null;
        }
        var overlay = document.getElementById("reward-overlay");
        if (overlay) overlay.classList.add("hidden");
        showScreen("stickerbook");
      });
    }
  }

  /**
   * [내 스티커북] 렌더링 및 터치 시 춤추는 인터랙션
   */
  function renderStickerbook() {
    var grid = document.getElementById("sticker-grid");
    if (!grid) return;
    grid.innerHTML = "";

    HG.Words.STICKER_CATALOG.forEach(function (stk) {
      var isUnlocked = state.unlockedStickers.includes(stk.id);
      var card = document.createElement("button");
      card.type = "button";
      card.className = ("sticker-card-item " + (isUnlocked ? "unlocked" : "locked"));

      if (isUnlocked) {
        card.innerHTML = ("\n          <div class=\"sticker-svg-box\">" + (HG.Words.getIllustSvg(stk.icon)) + "</div>\n          <div class=\"sticker-name\">" + (stk.name) + "</div>\n        ");
        card.addEventListener("click", function () {
          HG.Audio.playCorrect();
          HG.Audio.speak(((stk.name) + "! " + (stk.desc)));
          HG.Character.reactHappy(((stk.name) + "! " + (stk.desc) + " 💃"));

          card.classList.remove("sticker-dancing");
          void card.offsetWidth;
          card.classList.add("sticker-dancing");
        });
      } else {
        card.innerHTML = ("\n          <div class=\"sticker-svg-box\" style=\"display:flex;align-items:center;justify-content:center;font-size:36px;\">🔒</div>\n          <div class=\"sticker-name\">별 5개 모아 열기</div>\n        ");
        card.addEventListener("click", function () {
          HG.Audio.playTap();
          HG.Character.say("별을 5개 모으면 이 비밀 스티커 친구도 만날 수 있어! 🎁");
        });
      }

      grid.appendChild(card);
    });
  }

  /**
   * [부모님 설정 메뉴] 모달 제어
   */
  function openParentModal() {
    HG.Audio.playTap();
    var modal = document.getElementById("parent-modal");
    var statStickers = document.getElementById("parent-stat-stickers");
    var statSolved = document.getElementById("parent-stat-solved");

    if (statStickers) statStickers.textContent = String(state.unlockedStickers.length);
    if (statSolved) statSolved.textContent = String(state.totalSolved);

    populateVoiceSelectUI();

    if (modal) modal.classList.remove("hidden");
  }

  function populateVoiceSelectUI() {
    var selectVoice = document.getElementById("select-parent-voice");
    if (!selectVoice || !HG.Audio.getKoreanVoices) return;

    var voices = HG.Audio.getKoreanVoices();
    selectVoice.innerHTML = ("<option value=\"\">자동 추천 (상냥한 여선생님 목소리)</option>");
    voices.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.voiceURI;
      var badge =
        v.name.toLowerCase().includes("natural") ||
        v.name.toLowerCase().includes("google") ||
        v.name.toLowerCase().includes("premium")
          ? " ★고품질"
          : "";
      opt.textContent = ((v.name) + (badge));
      selectVoice.appendChild(opt);
    });
    selectVoice.value = state.preferredVoiceURI || "";
  }

  function bindParentModalEvents() {
    var modal = document.getElementById("parent-modal");
    var btnClose = document.getElementById("btn-close-parent");
    var selectStage = document.getElementById("select-parent-stage");
    var inputVol = document.getElementById("input-parent-volume");
    var labelVol = document.getElementById("label-parent-volume");
    var inputRate = document.getElementById("input-parent-rate");
    var labelRate = document.getElementById("label-parent-rate");
    var selectVoice = document.getElementById("select-parent-voice");
    var btnTestVoice = document.getElementById("btn-test-voice");
    var chkBgm = document.getElementById("chk-bgm-enabled");
    var btnNextBgm = document.getElementById("btn-next-bgm");
    var inputBgmVol = document.getElementById("input-bgm-volume");
    var labelBgmVol = document.getElementById("label-bgm-volume");
    var chkTimer = document.getElementById("chk-rest-timer");
    var btnResetTimer = document.getElementById("btn-reset-timer");
    var btnResetProgress = document.getElementById("btn-reset-progress");

    HG.onBgmTrackChanged = function () {
      syncBgmUI();
    };

    if (chkBgm) {
      chkBgm.checked = state.bgmEnabled !== false;
      chkBgm.addEventListener("change", function () {
        state.bgmEnabled = chkBgm.checked;
        if (HG.Audio.setBgmEnabled) {
          HG.Audio.setBgmEnabled(state.bgmEnabled);
        }
        saveState();
        syncBgmUI();
      });
    }

    if (btnNextBgm) {
      btnNextBgm.addEventListener("click", function () {
        HG.Audio.playTap();
        if (!state.bgmEnabled) {
          state.bgmEnabled = true;
          if (HG.Audio.setBgmEnabled) HG.Audio.setBgmEnabled(true);
          saveState();
        }
        if (HG.Audio.nextBgmTrack) {
          HG.Audio.nextBgmTrack();
        }
        syncBgmUI();
      });
    }

    if (inputBgmVol && labelBgmVol) {
      var curBgmVol = typeof state.bgmVolume === "number" ? state.bgmVolume : 100;
      inputBgmVol.value = String(curBgmVol);
      labelBgmVol.textContent = (curBgmVol + "%");
      inputBgmVol.addEventListener("input", function () {
        state.bgmVolume = Number(inputBgmVol.value);
        state.bgmVolumeCustom = true;
        labelBgmVol.textContent = (state.bgmVolume + "%");
        if (HG.Audio.setBgmVolume) {
          HG.Audio.setBgmVolume(state.bgmVolume / 100);
        }
        if (state.bgmVolume > 0 && state.bgmEnabled === false) {
          state.bgmEnabled = true;
          if (HG.Audio.setBgmEnabled) HG.Audio.setBgmEnabled(true);
          syncBgmUI();
        }
        saveState();
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener("click", function () {
        HG.Audio.playTap();
        modal.classList.add("hidden");
      });
    }

    if (selectStage) {
      selectStage.value = String(state.currentStage);
      selectStage.addEventListener("change", function () {
        setStage(Number(selectStage.value));
      });
    }

    if (inputVol && labelVol) {
      inputVol.value = String(state.volume);
      labelVol.textContent = ((state.volume) + "%");
      inputVol.addEventListener("input", function () {
        state.volume = Number(inputVol.value);
        labelVol.textContent = ((state.volume) + "%");
        HG.Audio.setVolume(state.volume / 100);
        saveState();
      });
    }

    if (inputRate && labelRate) {
      inputRate.value = String(state.speechRate);
      labelRate.textContent = ((state.speechRate) + "x");
      inputRate.addEventListener("input", function () {
        state.speechRate = Number(inputRate.value);
        labelRate.textContent = ((state.speechRate) + "x");
        HG.Audio.setSpeechRate(state.speechRate);
        saveState();
      });
    }

    if (selectVoice) {
      populateVoiceSelectUI();
      HG.onVoicesUpdated = function () { populateVoiceSelectUI(); };
      selectVoice.addEventListener("change", function () {
        state.preferredVoiceURI = selectVoice.value;
        HG.Audio.setPreferredVoice(state.preferredVoiceURI);
        saveState();
        HG.Audio.speak("안녕하세요, 우리 같이 재미있게 한글 놀이를 해 볼까요?");
      });
    }

    if (btnTestVoice) {
      btnTestVoice.addEventListener("click", function () {
        HG.Audio.playTap();
        HG.Audio.speak("안녕하세요, 우리 친구, 선생님하고 신나게 한글 놀이를 해 볼까요?");
      });
    }

    if (chkTimer) {
      chkTimer.checked = Boolean(state.restTimerEnabled);
      chkTimer.addEventListener("change", function () {
        state.restTimerEnabled = chkTimer.checked;
        saveState();
        updateTimerBadgeUI();
      });
    }

    if (btnResetTimer) {
      btnResetTimer.addEventListener("click", function () {
        HG.Audio.playTap();
        restRemainingSec = REST_LIMIT_SECONDS;
        updateTimerBadgeUI();
      });
    }

    if (btnResetProgress) {
      btnResetProgress.addEventListener("click", function () {
        HG.Audio.playTap();
        state.roundStars = 0;
        state.totalSolved = 0;
        state.unlockedStickers = ["stk_bear"];
        saveState();
        syncStarProgressUI();
        syncStickerBadgeUI();

        var statStickers = document.getElementById("parent-stat-stickers");
        var statSolved = document.getElementById("parent-stat-solved");
        if (statStickers) statStickers.textContent = "1";
        if (statSolved) statSolved.textContent = "0";

        if (document.getElementById("screen-stickerbook").classList.contains("active")) {
          renderStickerbook();
        }
      });
    }
  }

  /**
   * 15분 쉬는 시간 타이머 관리
   */
  function startRestTimer() {
    if (restIntervalId) clearInterval(restIntervalId);
    updateTimerBadgeUI();

    restIntervalId = setInterval(function () {
      if (!state.restTimerEnabled) return;
      if (restRemainingSec > 0) {
        restRemainingSec -= 1;
        updateTimerBadgeUI();
        if (restRemainingSec === 0) {
          showRestOverlay();
        }
      }
    }, 1000);
  }

  function updateTimerBadgeUI() {
    var badge = document.getElementById("rest-timer-remain");
    if (!badge) return;
    if (!state.restTimerEnabled) {
      badge.textContent = "타이머 꺼짐";
      return;
    }
    var mins = String(Math.floor(restRemainingSec / 60)).padStart(2, "0");
    var secs = String(restRemainingSec % 60).padStart(2, "0");
    badge.textContent = ("남은 시간 " + (mins) + ":" + (secs));
  }

  function showRestOverlay() {
    var restOverlay = document.getElementById("rest-overlay");
    if (restOverlay) {
      restOverlay.classList.remove("hidden");
      if (HG.Audio.stopBgm) HG.Audio.stopBgm();
      HG.Audio.speak("눈을 깜빡깜빡! 쉬는 시간이에요. 물도 한 잔 마시고 올까요?");
    }
  }

  function bindRestOverlayEvents() {
    var btnResume = document.getElementById("btn-resume-from-rest");
    var restOverlay = document.getElementById("rest-overlay");
    if (btnResume && restOverlay) {
      btnResume.addEventListener("click", function () {
        HG.Audio.playTap();
        restRemainingSec = REST_LIMIT_SECONDS;
        updateTimerBadgeUI();
        restOverlay.classList.add("hidden");
        if (state.bgmEnabled !== false && HG.Audio.startBgm) {
          HG.Audio.startBgm();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.HG);
