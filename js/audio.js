/**
 * ==========================================================================
 * 방글방글 한글 놀이터 - 오디오 & 음성 합성 시스템 (js/audio.js)
 * ==========================================================================
 * - 상냥한 유치원 여선생님 톤의 자연스러운 한국어 신경망(Neural/WaveNet) 음성 우선 선택
 * - 인위적인 기계음(DSP 피치 왜곡 및 구형 오프라인 SAPI 음성) 방지 및 자연스러운 억양(Prosody) 보정
 * - 외부 음원 파일 없이 Web Audio API 신디사이저로 효과음 100% 자체 합성
 */

window.HG = window.HG || {};

(function (HG) {
  "use strict";

  var audioCtx = null;
  var isUnlocked = false;
  var masterVolume = 0.85;
  var speechRate = 0.92; // 자연스러운 여선생님 말하기 속도 (기계음 타임스트레칭 왜곡 최소화)
  var koreanVoice = null;
  var preferredVoiceURI = "warm_teacher"; // 사용자가 부모 설정에서 선택한 목소리 프리셋/URI

  // 누구나 직관적으로 고를 수 있는 5가지 목소리 캐릭터 프리셋 (모바일/PC 모든 기기에서 작동)
  var VOICE_PRESETS = [
    { id: "warm_teacher", label: "👩‍🏫 다정한 유치원 선생님 (기본)", gender: "female", pitchMod: 1.0, rateMod: 1.0 },
    { id: "bright_sister", label: "🎀 통통 튀는 발랄 선생님", gender: "female", pitchMod: 1.16, rateMod: 1.06 },
    { id: "cute_bori", label: "🐻 귀여운 아기곰 보리 목소리", gender: "female", pitchMod: 1.28, rateMod: 1.04 },
    { id: "calm_story", label: "📖 차분한 동화 구연 선생님", gender: "female", pitchMod: 0.92, rateMod: 0.90 },
    { id: "brave_uncle", label: "🏃 씩씩한 체육 선생님", gender: "male", pitchMod: 0.76, rateMod: 0.98 }
  ];

  // 배경음악(BGM) 상태 변수
  var bgmEnabled = true;
  var bgmVolume = 0.70; // 동요 배경음악 볼륨 (0.0 ~ 1.0, 기본 70%)
  var bgmPlaying = false;
  var bgmStepTimer = null;
  var bgmDuckTimer = null;
  var isSpeaking = false;
  var bgmPlaylist = [];
  var bgmCurrentSong = null;
  var bgmNoteIndex = 0;
  var bgmBeatCounter = 0;
  var bgmNoiseBuffer = null;

  // 단일 자음/모음을 읽을 때 특수문자 없이 깨끗한 한국어 발음만 전달
  var PHONETIC_MAP = {
    "ㅏ": "아",
    "ㅑ": "야",
    "ㅓ": "어",
    "ㅕ": "여",
    "ㅗ": "오",
    "ㅛ": "요",
    "ㅜ": "우",
    "ㅠ": "유",
    "ㅡ": "으",
    "ㅣ": "이",
    "ㅐ": "애",
    "ㅒ": "얘",
    "ㅔ": "에",
    "ㅖ": "예",
    "ㅘ": "와",
    "ㅚ": "외",
    "ㅝ": "워",
    "ㅟ": "위",
    "ㅢ": "의",
    "ㄱ": "기역",
    "ㄴ": "니은",
    "ㄷ": "디귿",
    "ㄹ": "리을",
    "ㅁ": "미음",
    "ㅂ": "비읍",
    "ㅅ": "시옷",
    "ㅇ": "이응",
    "ㅈ": "지읒",
    "ㅊ": "치읓",
    "ㅋ": "키읔",
    "ㅌ": "티읕",
    "ㅍ": "피읖",
    "ㅎ": "히읗",
    "ㄲ": "쌍기역",
    "ㄸ": "쌍디귿",
    "ㅃ": "쌍비읍",
    "ㅆ": "쌍시옷",
    "ㅉ": "쌍지읒"
  };

  function getContext() {
    if (!audioCtx) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      if (audioCtx.resume) { try { audioCtx.resume(); } catch (e) {} }
    }
    return audioCtx;
  }

  function isMaleVoice(v) {
    var name = ((v && v.name) || "").toLowerCase();
    return (
      name.includes("injoon") ||
      name.includes("bongjin") ||
      name.includes("gookmin") ||
      name.includes("hyunsu") ||
      name.includes("male") ||
      name.includes("남성")
    );
  }

  /**
   * 한국어 음성 목록 중 가장 자연스럽고 상냥한 여성(여선생님) 신경망 음성을 점수로 판별
   */
  function scoreKoreanVoice(v, preferMale) {
    var name = (v.name || "").toLowerCase();
    var uri = (v.voiceURI || "").toLowerCase();
    var score = 0;
    var male = isMaleVoice(v);

    if (preferMale) {
      if (male) score += 100;
      else score -= 30;
    } else {
      if (male) score -= 50;
    }

    // 1순위: Microsoft SunHi Online (Natural) / SeoHyeon / JiMin 등 고품질 신경망 음성
    if (name.includes("sunhi") || name.includes("선희")) score += 120;
    if (name.includes("seohyeon") || name.includes("서현")) score += 115;
    if (name.includes("jimin") || name.includes("지민")) score += 110;
    if (name.includes("injoon") || name.includes("인준")) score += 105;
    if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 90;

    // 2순위: Apple macOS / iOS 고품질 음성 (Yuna Premium/Enhanced, Sora, Minsu)
    if (name.includes("premium") || name.includes("enhanced") || uri.includes("premium")) score += 85;
    if (name.includes("yuna") || name.includes("유나") || name.includes("sora") || name.includes("소라")) score += 75;

    // 3순위: Chrome Google 한국어 클라우드 음성 (WaveNet)
    if (name.includes("google") && (name.includes("한국") || name.includes("korean"))) score += 80;

    // 구형 오프라인 SAPI5 (Heami Desktop 등)는 다른 자연스러운 음성이 없을 때만 폴백으로 사용
    if (v.localService && !name.includes("natural") && !name.includes("premium") && !name.includes("enhanced")) {
      score -= 20;
    }

    return score;
  }

  /**
   * 실제 한국어(ko, ko-KR, ko_KR) 음성만 정확히 필터링
   * - 기존 startsWith("ko") 때문에 인도 '코카니어(kok-IN, Konkani)'가 포함되던 버그 완벽 수정!
   */
  function getKoreanVoices() {
    if (!("speechSynthesis" in window)) return [];
    var all = window.speechSynthesis.getVoices() || [];
    return all
      .filter(function (v) {
        if (!v || !v.lang) return false;
        var lang = v.lang.toLowerCase().replace("_", "-").trim();
        var vName = (v.name || "").toLowerCase();
        if (vName.includes("코카니") || vName.includes("konkani") || lang.indexOf("kok") === 0) {
          return false;
        }
        return lang === "ko" || lang.indexOf("ko-") === 0;
      })
      .sort(function (a, b) { return scoreKoreanVoice(b, false) - scoreKoreanVoice(a, false); });
  }

  function getActivePreset() {
    var found = VOICE_PRESETS.find(function (p) { return p.id === preferredVoiceURI; });
    return found || VOICE_PRESETS[0];
  }

  function getVoiceOptions() {
    return VOICE_PRESETS.slice();
  }

  function loadKoreanVoice() {
    var koVoices = getKoreanVoices();
    if (!koVoices.length) return;

    var preset = getActivePreset();
    var preferMale = preset && preset.gender === "male";

    var sorted = koVoices.slice().sort(function (a, b) {
      return scoreKoreanVoice(b, preferMale) - scoreKoreanVoice(a, preferMale);
    });
    koreanVoice = sorted[0] || koVoices[0];
  }

  if ("speechSynthesis" in window) {
    loadKoreanVoice();
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = function () {
        loadKoreanVoice();
        if (typeof HG.onVoicesUpdated === "function") {
          HG.onVoicesUpdated(getVoiceOptions(), preferredVoiceURI);
        }
      };
    }
  }

  // 오디오 잠금 해제 및 즉시 BGM 재생 보장
  function unlockAudio() {
    var ctx = getContext();
    if (ctx) {
      if (ctx.state === "suspended" && ctx.resume) {
        try { ctx.resume(); } catch (e) {}
      }
      if (!isUnlocked) {
        try {
          var buffer = ctx.createBuffer(1, 1, 22050);
          var source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch (e2) {}
      }
    }
    if (!isUnlocked && "speechSynthesis" in window) {
      loadKoreanVoice();
      try {
        var warmUp = new SpeechSynthesisUtterance("");
        warmUp.volume = 0;
        warmUp.lang = "ko-KR";
        window.speechSynthesis.speak(warmUp);
      } catch (e3) {}
    }
    isUnlocked = true;
    if (bgmEnabled && !bgmPlaying) {
      startBgm();
    }
  }

  ["pointerdown", "touchstart", "mousedown", "click", "keydown"].forEach(function (evtName) {
    window.addEventListener(evtName, unlockAudio, { passive: true });
  });

  /**
   * 1. 터치 피드백 효과음
   */
  function playTap() {
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);

    gain.gain.setValueAtTime(0.26 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * 2. 풍선 터지는 소리 (Pop!)
   */
  function playPop() {
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);

    oscGain.gain.setValueAtTime(0.5 * masterVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);

    var bufferSize = Math.floor(ctx.sampleRate * 0.05);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    var filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);

    var noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * masterVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * 3. 정답 효과음 (딩-동-댕! 맑은 실로폰 화음)
   */
  function playCorrect() {
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var notes = [
      { freq: 523.25, start: 0.0, dur: 0.22 },
      { freq: 659.25, start: 0.11, dur: 0.22 },
      { freq: 783.99, start: 0.22, dur: 0.26 },
      { freq: 1046.5, start: 0.34, dur: 0.45 }
    ];

    var now = ctx.currentTime;
    notes.forEach(function (n) {
      var osc = ctx.createOscillator();
      var overtone = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(n.freq * 2, now + n.start);

      var overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.1, now + n.start);

      gain.gain.setValueAtTime(0.001, now + n.start);
      gain.gain.linearRampToValueAtTime(0.34 * masterVolume, now + n.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.start);
      overtone.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.02);
      overtone.stop(now + n.start + n.dur + 0.02);
    });
  }

  /**
   * 4. 다정한 격려 사운드 (포근한 마림바 2음)
   */
  function playEncourage() {
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var now = ctx.currentTime;
    var notes = [
      { freq: 392.0, start: 0.0, dur: 0.16 },
      { freq: 440.0, start: 0.12, dur: 0.24 }
    ];

    notes.forEach(function (n) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.22 * masterVolume, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.02);
    });
  }

  /**
   * 5. 따라쓰기 반짝이 효과음
   */
  function playSparkle(stepIndex) {
    if (stepIndex === void 0) stepIndex = 0;
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    var freq = scale[stepIndex % scale.length];
    var now = ctx.currentTime;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.16 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + nStartOffset(0.15));
  }

  function nStartOffset(v) {
    return v;
  }

  /**
   * 6. 5문제 완료 보상 팡파레
   */
  function playFanfare() {
    if (masterVolume <= 0) return;
    var ctx = getContext();
    if (!ctx) return;

    var melody = [
      { freq: 523.25, start: 0.0, dur: 0.16 },
      { freq: 659.25, start: 0.16, dur: 0.16 },
      { freq: 783.99, start: 0.32, dur: 0.16 },
      { freq: 1046.5, start: 0.48, dur: 0.32 },
      { freq: 783.99, start: 0.82, dur: 0.16 },
      { freq: 1046.5, start: 1.0, dur: 0.65 }
    ];

    var now = ctx.currentTime;
    melody.forEach(function (m) {
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(m.freq, now + m.start);
      osc2.frequency.setValueAtTime(m.freq * 1.5, now + m.start);

      var subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.14, now + m.start);

      gain.gain.setValueAtTime(0.001, now + m.start);
      gain.gain.linearRampToValueAtTime(0.38 * masterVolume, now + m.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + m.start + m.dur);

      osc1.connect(gain);
      osc2.connect(subGain);
      subGain.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now + m.start);
      osc2.start(now + m.start);
      osc1.stop(now + m.start + m.dur + 0.03);
      osc2.stop(now + m.start + m.dur + 0.03);
    });
  }

  /**
   * TTS가 '물결표(~)', '가운뎃점(·)', '괄호' 등 특수문자 이름을 읽지 않도록 정리하고,
   * 감탄사가 국어책 읽듯 평평하게 들리지 않도록 자연스러운 감탄 호흡으로 다듬는 헬퍼
   */
  function humanizeTeacherText(rawText) {
    if (!rawText) return "";
    var trimmed = String(rawText).trim();
    if (PHONETIC_MAP[trimmed]) {
      return PHONETIC_MAP[trimmed];
    }

    return trimmed
      // 괄호 안의 부가 정보(예: "(16종)")는 읽지 않도록 제거
      .replace(/\([^)]*\)/g, " ")
      // '딩동댕'은 실로폰 효과음이 대신 연주하므로 음성에서는 자연스러운 감탄사로 변환
      .replace(/딩동댕[,!.\s]*/g, "와아! 맞았어요! ")
      // 평평하게 읽히는 '우와,'를 생동감 있는 감탄 억양 '우와아!'로 보정
      .replace(/우와\s*[,!.]*/g, "우와아! ")
      .replace(/와아\s*[,!.]*/g, "와아! ")
      // 단독 자모(ㄱ~ㅎ, ㅏ~ㅣ)가 문장 안에 있을 경우 한글 발음으로 치환
      .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, function (ch) { return PHONETIC_MAP[ch] || ch; })
      // 물결표(~), 가운뎃점(·), 대시(-) 등은 자연스러운 쉼표 호흡으로 변환
      .replace(/[~∼˜·•\-—–:;/|]+/g, ", ")
      // 한글, 영문, 숫자, 기본 문장부호(.,?!)를 제외한 모든 특수문자·이모지 완전 제거
      .replace(/[^가-힣a-zA-Z0-9\s.,?!]/g, " ")
      // 연속된 쉼표나 문장부호 정리
      .replace(/(\s*,\s*)+/g, ", ")
      .replace(/\s+/g, " ")
      .replace(/^,\s*|\s*,$/g, "")
      .trim();
  }

  /**
   * 문장을 [감탄/칭찬 구간]과 [학습 단어/설명 구간]으로 분리하여
   * 감탄사에는 밝고 신나는 선생님 억양(높은 피치·경쾌한 리듬)을 넣고,
   * 학습 단어에는 또박또박하고 다정한 억양을 적용하는 감정 표현 엔진
   */
  function splitIntoEmotionalSegments(text, baseRate, isNeuralOrCloud) {
    var EXCLAIM_PATTERN = /^(우와아!|와아!|참 잘했어요[!.]?|정말 잘했어요[!.]?|우와아!\s*(잘했어요|맞았어요|멋져요|끝까지 순서대로 참 잘 썼어요)[!.]?|와아!\s*(맞았어요|정답이에요|참 잘했어요)[!.]?|안녕!|안녕하세요[,!]?)\s*(.*)$/;
    var match = text.match(EXCLAIM_PATTERN);

    if (match && match[1]) {
      var emotionPart = match[1].trim().replace(/[,]+$/, "!");
      var contentPart = (match[4] || "").trim();
      var segments = [
        {
          text: emotionPart,
          // 감탄/칭찬 구간: 실제 유치원 선생님이 기뻐하며 칭찬하듯 밝고 생동감 있는 톤
          pitch: isNeuralOrCloud ? 1.16 : 1.20,
          rate: Math.min(1.06, baseRate * 1.08)
        }
      ];
      if (contentPart) {
        segments.push({
          text: contentPart,
          // 학습 발음 구간: 아이가 정확히 듣고 따라할 수 있는 다정하고 또렷한 톤
          pitch: isNeuralOrCloud ? 1.03 : 1.06,
          rate: baseRate
        });
      }
      return segments;
    }

    // 질문형/권유형 문장("~볼까요?", "~눌러요!")은 끝음 올라가는 다정한 억양 부여
    var isQuestionOrInvite = /[?!]$/.test(text);
    return [
      { text: text, pitch: isNeuralOrCloud ? (isQuestionOrInvite ? 1.07 : 1.03) : 1.08,
        rate: baseRate
      }
    ];
  }

  function markSpeakingStart(durationEstimateMs) {
    isSpeaking = true;
    if (bgmDuckTimer) clearTimeout(bgmDuckTimer);
    bgmDuckTimer = setTimeout(function () {
      isSpeaking = false;
      bgmDuckTimer = null;
    }, durationEstimateMs || 3200);
  }

  function markSpeakingEnd() {
    isSpeaking = false;
    if (bgmDuckTimer) {
      clearTimeout(bgmDuckTimer);
      bgmDuckTimer = null;
    }
  }

  /**
   * 한글 음성 발음 (커스텀 mp3 폴백 + 감정 억양이 살아있는 여선생님 Web Speech API)
   */
  function speak(text, options) {
    if (options === void 0) options = {};
    if (!text || masterVolume <= 0) {
      if (options.onEnd) options.onEnd();
      return;
    }

    var spokenText = humanizeTeacherText(text);
    markSpeakingStart(Math.max(1800, spokenText.length * 220));

    // 1순위: 커스텀 mp3 파일이 지정된 경우 우선 재생
    if (options.audioSrc) {
      var audio = new Audio(options.audioSrc);
      audio.volume = masterVolume;
      audio.onended = function () {
        markSpeakingEnd();
        if (options.onEnd) options.onEnd();
      };
      audio.onerror = function () {
        speakWithWebSpeech(spokenText, options);
      };
      try { var _p = audio.play(); if (_p && _p.catch) _p.catch(function () {
        speakWithWebSpeech(spokenText, options); }); } catch (e) { speakWithWebSpeech(spokenText, options); }
      return;
    }

    // 2순위: 브라우저 내장 Web Speech API (감정 구간 분리 발화)
    speakWithWebSpeech(spokenText, options);
  }

  function speakWithWebSpeech(spokenText, options) {
    if (options === void 0) options = {};
    if (!("speechSynthesis" in window)) {
      markSpeakingEnd();
      if (options.onEnd) options.onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      loadKoreanVoice();

      var preset = getActivePreset();
      var pitchMod = preset ? preset.pitchMod : 1.0;
      var rateMod = preset ? preset.rateMod : 1.0;

      var vName = koreanVoice ? (koreanVoice.name || "").toLowerCase() : "";
      var isNeuralOrCloud =
        vName.includes("natural") ||
        vName.includes("online") ||
        vName.includes("google") ||
        vName.includes("premium") ||
        vName.includes("enhanced");

      var baseRate = (options.rate || (isNeuralOrCloud ? Math.max(0.92, speechRate) : speechRate)) * rateMod;
      baseRate = Math.max(0.65, Math.min(1.3, baseRate));
      var segments = splitIntoEmotionalSegments(spokenText, baseRate, isNeuralOrCloud);

      segments.forEach(function (seg, idx) {
        var utter = new SpeechSynthesisUtterance(seg.text);
        utter.lang = "ko-KR";
        if (koreanVoice) {
          utter.voice = koreanVoice;
        }
        utter.rate = Math.max(0.65, Math.min(1.35, seg.rate));
        var finalPitch = (options.pitch || seg.pitch) * pitchMod;
        utter.pitch = Math.max(0.55, Math.min(1.65, finalPitch));
        utter.volume = masterVolume;

        if (idx === segments.length - 1) {
          utter.onend = function () {
            markSpeakingEnd();
            if (options.onEnd) options.onEnd();
          };
          utter.onerror = function () {
            markSpeakingEnd();
            if (options.onEnd) options.onEnd();
          };
        }

        window.speechSynthesis.speak(utter);
      });
    } catch (err) {
      markSpeakingEnd();
      if (options.onEnd) options.onEnd();
    }
  }

  /**
   * ==========================================================================
   * 7. 신나는 4채널 게임 사운드트랙 BGM 엔진 (멜로디 + 화음 아르페지오 + 통통 베이스 + 드럼 비트)
   * ==========================================================================
   */
  var NOTE_FREQ = {
    REST: 0,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, FS3: 185.00, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, FS4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, FS5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50
  };

  // 화음 및 루트-5도 베이스라인 매핑 (구형 코드 표기 C4/G3 등도 모두 3화음 코드로 자동 매핑)
  var CHORD_MAP = {
    C4: { bass: "C3", fifth: "G3", triad: ["C4", "E4", "G4"] },
    G3: { bass: "G3", fifth: "D4", triad: ["G3", "B3", "D4"] },
    F4: { bass: "F3", fifth: "C4", triad: ["F4", "A4", "C5"] },
    E4: { bass: "E3", fifth: "B3", triad: ["E4", "G4", "B4"] },
    D4: { bass: "D3", fifth: "A3", triad: ["D4", "FS4", "A4"] },
    A3: { bass: "A3", fifth: "E4", triad: ["A3", "C4", "E4"] }
  };

  var bgmActiveChord = CHORD_MAP.C4;

  // 인기 동요 빅히트송 8곡 경쾌한 게임 음악 편곡 데이터
  var BGM_SONGS = [
    {
      id: "three_bears",
      title: "곰 세 마리",
      beatMs: 255,
      notes: [
        // 곰 세 마리가 한 집에 있어
        ["C5", 1, "C4"], ["C5", 0.5], ["C5", 0.5], ["C5", 1, "C4"], ["C5", 1],
        ["E5", 1, "C4"], ["G5", 0.5], ["G5", 0.5], ["E5", 1, "C4"], ["C5", 1],
        // 아빠 곰 엄마 곰 애기 곰
        ["G5", 0.5, "G3"], ["G5", 0.5], ["E5", 1], ["G5", 0.5, "G3"], ["G5", 0.5], ["E5", 1],
        ["C5", 1, "C4"], ["C5", 1], ["C5", 1.5, "C4"], ["E5", 0.5],
        // 아빠 곰은 뚱뚱해
        ["G5", 1, "C4"], ["G5", 1], ["E5", 1, "C4"], ["C5", 1],
        ["G5", 1, "G3"], ["G5", 1], ["G5", 1.5, "G3"], ["E5", 0.5],
        // 엄마 곰은 날씬해
        ["G5", 1, "C4"], ["G5", 1], ["E5", 1, "C4"], ["C5", 1],
        ["A5", 1, "F4"], ["A5", 1], ["A5", 1.5, "F4"], ["F5", 0.5],
        // 애기 곰은 너무 귀여워
        ["G5", 1, "C4"], ["G5", 1], ["E5", 1, "C4"], ["C5", 1],
        ["D5", 0.5, "G3"], ["D5", 0.5], ["D5", 0.5], ["E5", 0.5], ["F5", 1.5, "G3"], ["D5", 0.5],
        // 으쓱으쓱 잘한다
        ["E5", 1, "C4"], ["D5", 1, "G3"], ["C5", 1, "C4"], ["D5", 1, "G3"],
        ["G5", 1, "G3"], ["G5", 1], ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    },
    {
      id: "little_star",
      title: "작은 별",
      beatMs: 265,
      notes: [
        // 반짝반짝 작은 별 아름답게 비치네
        ["C5", 1, "C4"], ["C5", 1], ["G5", 1, "C4"], ["G5", 1],
        ["A5", 1, "F4"], ["A5", 1], ["G5", 1.5, "C4"], ["E5", 0.5],
        ["F5", 1, "F4"], ["F5", 1], ["E5", 1, "C4"], ["E5", 1],
        ["D5", 1, "G3"], ["D5", 1], ["C5", 1.5, "C4"], ["E5", 0.5],
        // 동쪽 하늘에서도 서쪽 하늘에서도
        ["G5", 1, "C4"], ["G5", 1], ["F5", 1, "F4"], ["F5", 1],
        ["E5", 1, "C4"], ["E5", 1], ["D5", 1.5, "G3"], ["B4", 0.5],
        ["G5", 1, "C4"], ["G5", 1], ["F5", 1, "F4"], ["F5", 1],
        ["E5", 1, "C4"], ["E5", 1], ["D5", 1.5, "G3"], ["G4", 0.5],
        // 반짝반짝 작은 별 아름답게 비치네
        ["C5", 1, "C4"], ["C5", 1], ["G5", 1, "C4"], ["G5", 1],
        ["A5", 1, "F4"], ["A5", 1], ["G5", 1.5, "C4"], ["E5", 0.5],
        ["F5", 1, "F4"], ["F5", 1], ["E5", 1, "C4"], ["E5", 1],
        ["D5", 1, "G3"], ["D5", 1], ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    },
    {
      id: "butterfly",
      title: "나비야",
      beatMs: 255,
      notes: [
        // 나비야 나비야 이리 날아오너라
        ["G5", 1, "C4"], ["E5", 1], ["E5", 1.5, "C4"], ["G5", 0.5],
        ["F5", 1, "G3"], ["D5", 1], ["D5", 1.5, "G3"], ["F5", 0.5],
        ["C5", 1, "C4"], ["D5", 1, "G3"], ["E5", 1, "C4"], ["F5", 1, "F4"],
        ["G5", 1, "G3"], ["G5", 1], ["G5", 1.5, "G3"], ["E5", 0.5],
        // 노란 나비 흰 나비 춤을 추며 오너라
        ["G5", 1, "C4"], ["E5", 1], ["E5", 1, "C4"], ["E5", 1],
        ["F5", 1, "G3"], ["D5", 1], ["D5", 1.5, "G3"], ["F5", 0.5],
        ["C5", 1, "C4"], ["E5", 1], ["G5", 1, "G3"], ["G5", 1],
        ["E5", 1, "C4"], ["E5", 1], ["E5", 1.5, "C4"], ["C5", 0.5],
        // 봄바람에 꽃잎도 방긋방긋 웃으며
        ["D5", 1, "G3"], ["D5", 1], ["D5", 1, "G3"], ["D5", 1],
        ["D5", 1, "G3"], ["E5", 1], ["F5", 1.5, "G3"], ["D5", 0.5],
        ["E5", 1, "C4"], ["E5", 1], ["E5", 1, "C4"], ["E5", 1],
        ["E5", 1, "C4"], ["F5", 1, "F4"], ["G5", 1.5, "G3"], ["E5", 0.5],
        // 참새도 짹짹짹 노래하며 춤춘다
        ["G5", 1, "C4"], ["E5", 1], ["E5", 1.5, "C4"], ["G5", 0.5],
        ["F5", 1, "G3"], ["D5", 1], ["D5", 1.5, "G3"], ["B4", 0.5],
        ["C5", 1, "C4"], ["E5", 1], ["G5", 1, "G3"], ["G5", 1],
        ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    },
    {
      id: "baby_shark",
      title: "아기 상어",
      beatMs: 245,
      notes: [
        // 아기 상어 뚜루루 뚜루
        ["D5", 1, "G3"], ["E5", 1, "D4"],
        ["G5", 0.5, "G3"], ["G5", 0.5], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5, "G3"], ["D5", 0.5],
        // 귀여운 뚜루루 뚜루
        ["D5", 0.5, "C4"], ["E5", 0.5],
        ["G5", 0.5, "C4"], ["G5", 0.5], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5, "C4"], ["D5", 0.5],
        // 바닷속 뚜루루 뚜루 아기 상어!
        ["D5", 0.5, "E4"], ["E5", 0.5],
        ["G5", 0.5, "E4"], ["G5", 0.5], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5], ["G5", 0.25], ["G5", 0.5, "E4"], ["E5", 0.5],
        ["G5", 0.5, "D4"], ["G5", 0.5], ["FS5", 1.5, "D4"], ["D5", 0.5]
      ]
    },
    {
      id: "airplane",
      title: "비행기",
      beatMs: 255,
      notes: [
        // 떴다 떴다 비행기 날아라 날아라
        ["E5", 1.5, "C4"], ["D5", 0.5], ["C5", 1, "C4"], ["D5", 1],
        ["E5", 1, "C4"], ["E5", 1], ["E5", 1.5, "C4"], ["C5", 0.5],
        ["D5", 1, "G3"], ["D5", 1], ["D5", 1.5, "G3"], ["B4", 0.5],
        ["E5", 1, "C4"], ["G5", 1], ["G5", 1.5, "C4"], ["G4", 0.5],
        // 높이 높이 날아라 우리 비행기
        ["E5", 1.5, "C4"], ["D5", 0.5], ["C5", 1, "C4"], ["D5", 1],
        ["E5", 1, "C4"], ["E5", 1], ["E5", 1.5, "C4"], ["C5", 0.5],
        ["D5", 1, "G3"], ["D5", 1], ["E5", 1, "G3"], ["D5", 1],
        ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    },
    {
      id: "mountain_rabbit",
      title: "산토끼",
      beatMs: 260,
      notes: [
        // 산토끼 토끼야 어디를 가느냐
        ["G4", 1, "C4"], ["C5", 0.5], ["C5", 0.5], ["E5", 1, "C4"], ["D5", 1], ["C5", 1.5, "C4"], ["E5", 0.5],
        ["D5", 1, "G3"], ["E5", 0.5], ["D5", 0.5], ["C5", 1, "C4"], ["E5", 1], ["G5", 1.5, "G3"], ["E5", 0.5],
        // 깡충깡충 뛰면서 어디를 가느냐
        ["A5", 0.75, "F4"], ["E5", 0.25], ["G5", 1, "C4"], ["E5", 0.75], ["D5", 0.25], ["C5", 1, "C4"], ["D5", 1.5, "G3"], ["G4", 0.5],
        ["E5", 0.75, "C4"], ["G5", 0.25], ["D5", 1, "G3"], ["E5", 1], ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    },
    {
      id: "same_same",
      title: "똑같아요",
      beatMs: 250,
      notes: [
        // 송아지 송아지 얼룩 송아지
        ["C5", 1, "C4"], ["E5", 1], ["G5", 1], ["C5", 1, "C4"], ["E5", 1], ["G5", 1],
        ["A5", 1, "F4"], ["A5", 1], ["A5", 1], ["G5", 2, "C4"], ["E5", 1],
        // 엄마 소도 얼룩소 엄마 닮았네
        ["F5", 1, "F4"], ["F5", 1], ["F5", 1], ["E5", 1, "C4"], ["E5", 1], ["E5", 1],
        ["D5", 1, "G3"], ["D5", 1], ["G4", 1], ["C5", 2, "C4"], ["G5", 1]
      ]
    },
    {
      id: "ten_friends",
      title: "열 꼬마 친구들",
      beatMs: 245,
      notes: [
        // 하나 둘 셋 꼬마 넷 다섯 여섯 꼬마
        ["C5", 1, "C4"], ["C5", 0.5], ["C5", 0.5], ["C5", 1, "C4"], ["C5", 0.5], ["E5", 0.5],
        ["G5", 0.5, "C4"], ["E5", 0.5], ["C5", 1, "C4"], ["C5", 1],
        // 일곱 여덟 아홉 꼬마 열 꼬마 친구들
        ["D5", 1, "G3"], ["D5", 0.5], ["D5", 0.5], ["D5", 1, "G3"], ["D5", 0.5], ["B4", 0.5],
        ["G4", 1.5, "G3"], ["B4", 0.5],
        ["C5", 1, "C4"], ["C5", 0.5], ["C5", 0.5], ["C5", 1, "C4"], ["C5", 0.5], ["E5", 0.5],
        ["G5", 0.5, "C4"], ["E5", 0.5], ["C5", 1, "F4"], ["A5", 1],
        ["G5", 1, "G3"], ["E5", 0.5], ["F5", 0.5], ["D5", 1, "G3"], ["B4", 1],
        ["C5", 1.5, "C4"], ["G5", 0.5]
      ]
    }
  ];

  function refillAndShuffleBgmPlaylist() {
    var pool = BGM_SONGS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    if (bgmCurrentSong && pool.length > 1 && pool[0].id === bgmCurrentSong.id) {
      var first = pool.shift();
      pool.push(first);
    }
    bgmPlaylist = pool;
  }

  function pickNextRandomSong() {
    if (!bgmPlaylist.length) {
      refillAndShuffleBgmPlaylist();
    }
    bgmCurrentSong = bgmPlaylist.shift();
    bgmNoteIndex = 0;
    bgmBeatCounter = 0;
    bgmActiveChord = CHORD_MAP.C4;
    if (typeof HG.onBgmTrackChanged === "function" && bgmCurrentSong) {
      HG.onBgmTrackChanged(bgmCurrentSong.title);
    }
  }

  function getBgmNoiseBuffer(ctx) {
    if (bgmNoiseBuffer) return bgmNoiseBuffer;
    var size = Math.floor(ctx.sampleRate * 0.08);
    var buf = ctx.createBuffer(1, size, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (size * 0.28));
    }
    bgmNoiseBuffer = buf;
    return bgmNoiseBuffer;
  }

  /**
   * 4채널 게임 사운드트랙 합성 (밝은 리드 멜로디 + 화음 아르페지오 + 루트/5도 베이스 + 귀엽고 통통 튀는 퍼커션)
   */
  function playGameBgmStep(freq, durSec, chordKey, stepIndex) {
    if (!bgmEnabled || bgmVolume <= 0 || document.hidden) return false;
    var ctx = getContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      if (ctx.resume) { try { ctx.resume(); } catch (e) {} }
      return false;
    }

    var now = ctx.currentTime;
    var duckFactor = isSpeaking ? 0.22 : 1.0;
    var baseVol = 0.095 * bgmVolume * duckFactor;

    if (chordKey && CHORD_MAP[chordKey]) {
      bgmActiveChord = CHORD_MAP[chordKey];
    }
    var chord = bgmActiveChord || CHORD_MAP.C4;

    // 1. [멜로디 리드 채널] 밝고 통통 튀는 마림바/벨 신스 (Triangle + Sine 코러스 + 배음)
    if (freq > 0) {
      var oscLead = ctx.createOscillator();
      var oscChorus = ctx.createOscillator();
      var oscBell = ctx.createOscillator();
      var leadGain = ctx.createGain();
      var chorusGain = ctx.createGain();
      var bellGain = ctx.createGain();

      oscLead.type = "triangle";
      oscLead.frequency.setValueAtTime(freq, now);

      oscChorus.type = "sine";
      oscChorus.frequency.setValueAtTime(freq * 1.0025, now);
      chorusGain.gain.setValueAtTime(0.45, now);

      oscBell.type = "sine";
      oscBell.frequency.setValueAtTime(freq * 2, now);
      bellGain.gain.setValueAtTime(0.16, now);

      var leadRel = Math.max(durSec * 1.05, 0.22);
      leadGain.gain.setValueAtTime(0.0005, now);
      leadGain.gain.linearRampToValueAtTime(baseVol * 1.15, now + 0.014);
      leadGain.gain.exponentialRampToValueAtTime(baseVol * 0.42, now + Math.min(0.09, leadRel * 0.45));
      leadGain.gain.exponentialRampToValueAtTime(0.0005, now + leadRel);

      oscLead.connect(leadGain);
      oscChorus.connect(chorusGain);
      chorusGain.connect(leadGain);
      oscBell.connect(bellGain);
      bellGain.connect(leadGain);
      leadGain.connect(ctx.destination);

      oscLead.start(now);
      oscChorus.start(now);
      oscBell.start(now);
      oscLead.stop(now + leadRel + 0.02);
      oscChorus.stop(now + leadRel + 0.02);
      oscBell.stop(now + leadRel + 0.02);
    }

    // 2. [화음 아르페지오 & 코드 패드 채널] 게임 음악 특유의 통통 튀는 화음 반주
    var triad = chord.triad;
    if (triad && triad.length === 3) {
      var arpSteps = durSec >= 0.35 ? 3 : 2;
      var subDur = durSec / arpSteps;
      for (var a = 0; a < arpSteps; a++) {
        var arpNoteName = triad[(stepIndex + a) % triad.length];
        var arpFreq = NOTE_FREQ[arpNoteName] || 0;
        if (arpFreq > 0) {
          var arpOsc = ctx.createOscillator();
          var arpGain = ctx.createGain();
          var t0 = now + a * subDur;
          var arpLen = Math.max(subDur * 0.92, 0.12);

          arpOsc.type = "sine";
          arpOsc.frequency.setValueAtTime(arpFreq, t0);

          arpGain.gain.setValueAtTime(0.0004, t0);
          arpGain.gain.linearRampToValueAtTime(baseVol * 0.34, t0 + 0.012);
          arpGain.gain.exponentialRampToValueAtTime(0.0004, t0 + arpLen);

          arpOsc.connect(arpGain);
          arpGain.connect(ctx.destination);
          arpOsc.start(t0);
          arpOsc.stop(t0 + arpLen + 0.02);
        }
      }
    }

    // 3. [통통 튀는 루트-5도 베이스라인 채널]
    var bassNoteName = (stepIndex % 2 === 0) ? chord.bass : chord.fifth;
    var bassFreq = NOTE_FREQ[bassNoteName] || 0;
    if (bassFreq > 0) {
      var bassOsc = ctx.createOscillator();
      var bassGain = ctx.createGain();
      var bassLen = Math.min(Math.max(durSec * 0.78, 0.16), 0.38);

      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.0005, now);
      bassGain.gain.linearRampToValueAtTime(baseVol * 0.68, now + 0.015);
      bassGain.gain.exponentialRampToValueAtTime(0.0005, now + bassLen);

      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + bassLen + 0.02);
    }

    // 4. [경쾌한 게임 리듬 퍼커션 채널] (소프트 킥 + 우드블록 팝 + 셰이커 틱)
    var beatMod = stepIndex % 4;
    if (beatMod === 0 || beatMod === 2) {
      // 부드러운 게임 베이스 킥
      var kickOsc = ctx.createOscillator();
      var kickGain = ctx.createGain();
      kickOsc.type = "sine";
      kickOsc.frequency.setValueAtTime(125, now);
      kickOsc.frequency.exponentialRampToValueAtTime(44, now + 0.075);

      kickGain.gain.setValueAtTime(baseVol * 0.65, now);
      kickGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.08);

      kickOsc.connect(kickGain);
      kickGain.connect(ctx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.085);
    } else {
      // 경쾌한 우드블록 / 스네어 톡!
      var popOsc = ctx.createOscillator();
      var popGain = ctx.createGain();
      popOsc.type = "triangle";
      popOsc.frequency.setValueAtTime(640, now);
      popOsc.frequency.exponentialRampToValueAtTime(280, now + 0.04);

      popGain.gain.setValueAtTime(baseVol * 0.28, now);
      popGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);

      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.05);
    }

    // 셰이커 하이햇 (오프비트 리듬감)
    if (durSec >= 0.2) {
      try {
        var noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = getBgmNoiseBuffer(ctx);
        var hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(4500, now);
        var hhGain = ctx.createGain();
        var hhTime = now + durSec * 0.5;
        hhGain.gain.setValueAtTime(baseVol * 0.18, hhTime);
        hhGain.gain.exponentialRampToValueAtTime(0.0005, hhTime + 0.035);
        noiseSrc.connect(hp);
        hp.connect(hhGain);
        hhGain.connect(ctx.destination);
        noiseSrc.start(hhTime);
      } catch (e) {}
    }

    return true;
  }

  function stepBgmLoop() {
    if (!bgmEnabled || !bgmPlaying) return;
    if (document.hidden) {
      bgmStepTimer = setTimeout(stepBgmLoop, 500);
      return;
    }

    if (!bgmCurrentSong) {
      pickNextRandomSong();
    }

    var notes = bgmCurrentSong.notes;
    if (bgmNoteIndex >= notes.length) {
      pickNextRandomSong();
      bgmStepTimer = setTimeout(stepBgmLoop, 320);
      return;
    }

    var item = notes[bgmNoteIndex];
    var noteName = item[0];
    var beats = item[1] || 1;
    var chordKey = item[2] || null;

    var freq = NOTE_FREQ[noteName] || 0;
    var durMs = Math.round(beats * bgmCurrentSong.beatMs);

    var played = playGameBgmStep(freq, durMs / 1000, chordKey, bgmBeatCounter);
    if (played) {
      bgmNoteIndex += 1;
      bgmBeatCounter += 1;
      bgmStepTimer = setTimeout(stepBgmLoop, durMs);
    } else {
      // 브라우저 자동재생 정책으로 AudioContext가 아직 대기 중인 경우 짧은 주기로 재시도하여 터치 즉시 0초 반응
      bgmStepTimer = setTimeout(stepBgmLoop, 180);
    }
  }

  function startBgm() {
    if (!bgmEnabled) return;
    if (bgmPlaying) return;
    bgmPlaying = true;
    getContext();
    if (!bgmCurrentSong) {
      pickNextRandomSong();
    }
    if (bgmStepTimer) clearTimeout(bgmStepTimer);
    bgmStepTimer = setTimeout(stepBgmLoop, 40);
  }

  function stopBgm() {
    bgmPlaying = false;
    if (bgmStepTimer) {
      clearTimeout(bgmStepTimer);
      bgmStepTimer = null;
    }
  }

  function setBgmEnabled(enabled) {
    bgmEnabled = Boolean(enabled);
    if (bgmEnabled) {
      startBgm();
    } else {
      stopBgm();
    }
  }

  function isBgmEnabled() {
    return bgmEnabled;
  }

  function setBgmVolume(val0to1) {
    bgmVolume = Math.max(0, Math.min(1, Number(val0to1)));
  }

  function getBgmVolume() {
    return bgmVolume;
  }

  function nextBgmTrack() {
    pickNextRandomSong();
    if (bgmEnabled) {
      stopBgm();
      startBgm();
    }
    return bgmCurrentSong ? bgmCurrentSong.title : "";
  }

  function getCurrentBgmTitle() {
    if (!bgmCurrentSong) {
      pickNextRandomSong();
    }
    return bgmCurrentSong ? bgmCurrentSong.title : "곰 세 마리";
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (bgmStepTimer) {
        clearTimeout(bgmStepTimer);
        bgmStepTimer = null;
      }
      bgmPlaying = false;
    } else if (bgmEnabled) {
      startBgm();
    }
  });

  function setVolume(val0to1) {
    masterVolume = Math.max(0, Math.min(1, Number(val0to1)));
  }

  function getVolume() {
    return masterVolume;
  }

  function setSpeechRate(rate) {
    speechRate = Math.max(0.7, Math.min(1.15, Number(rate)));
  }

  function getSpeechRate() {
    return speechRate;
  }

  function setPreferredVoice(voiceURI) {
    var matchedPreset = VOICE_PRESETS.find(function (p) { return p.id === voiceURI; });
    preferredVoiceURI = matchedPreset ? matchedPreset.id : "warm_teacher";
    loadKoreanVoice();
  }

  function getPreferredVoice() {
    var matchedPreset = VOICE_PRESETS.find(function (p) { return p.id === preferredVoiceURI; });
    return matchedPreset ? matchedPreset.id : "warm_teacher";
  }

  HG.Audio = {
    unlockAudio: unlockAudio,
    playTap: playTap,
    playPop: playPop,
    playCorrect: playCorrect,
    playEncourage: playEncourage,
    playSparkle: playSparkle,
    playFanfare: playFanfare,
    speak: speak,
    setVolume: setVolume,
    getVolume: getVolume,
    setSpeechRate: setSpeechRate,
    getSpeechRate: getSpeechRate,
    getKoreanVoices: getKoreanVoices,
    getVoiceOptions: getVoiceOptions,
    setPreferredVoice: setPreferredVoice,
    getPreferredVoice: getPreferredVoice,
    startBgm: startBgm,
    stopBgm: stopBgm,
    setBgmEnabled: setBgmEnabled,
    isBgmEnabled: isBgmEnabled,
    setBgmVolume: setBgmVolume,
    getBgmVolume: getBgmVolume,
    nextBgmTrack: nextBgmTrack,
    getCurrentBgmTitle: getCurrentBgmTitle
  };
})(window.HG);
