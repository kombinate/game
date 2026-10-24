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

  let audioCtx = null;
  let isUnlocked = false;
  let masterVolume = 0.85;
  let speechRate = 0.92; // 자연스러운 여선생님 말하기 속도 (기계음 타임스트레칭 왜곡 최소화)
  let koreanVoice = null;
  let preferredVoiceURI = ""; // 사용자가 부모 설정에서 직접 지정한 음성 URI

  // 단일 자음/모음을 읽을 때 특수문자 없이 깨끗한 한국어 발음만 전달
  const PHONETIC_MAP = {
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
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  /**
   * 한국어 음성 목록 중 가장 자연스럽고 상냥한 여성(여선생님) 신경망 음성을 점수로 판별
   * - 기존에 v.localService(오프라인 구형 기계음 Heami 등)를 우선 선택하던 문제를 해결하고,
   *   SunHi Natural(Edge), Google 한국의(Chrome WaveNet), Yuna Enhanced/Premium(Apple) 등을 최우선 선택합니다.
   */
  function scoreKoreanVoice(v) {
    const name = (v.name || "").toLowerCase();
    const uri = (v.voiceURI || "").toLowerCase();
    let score = 0;

    // 남성 음성(InJoon, BongJin, GookMin 등)은 여선생님 컨셉에서 후순위로 배치
    if (
      name.includes("injoon") ||
      name.includes("bongjin") ||
      name.includes("gookmin") ||
      name.includes("male") ||
      name.includes("남성")
    ) {
      score -= 50;
    }

    // 1순위: Microsoft SunHi Online (Natural) / SeoHyeon / JiMin 등 고품질 신경망 여성 음성
    if (name.includes("sunhi") || name.includes("선희")) score += 120;
    if (name.includes("seohyeon") || name.includes("서현")) score += 115;
    if (name.includes("jimin") || name.includes("지민")) score += 110;
    if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 90;

    // 2순위: Apple macOS / iOS 고품질 여성 음성 (Yuna Premium/Enhanced, Sora)
    if (name.includes("premium") || name.includes("enhanced") || uri.includes("premium")) score += 85;
    if (name.includes("yuna") || name.includes("유나") || name.includes("sora") || name.includes("소라")) score += 75;

    // 3순위: Chrome Google 한국어 클라우드 음성 (WaveNet 여성 보이스)
    if (name.includes("google") && (name.includes("한국") || name.includes("korean"))) score += 80;

    // 구형 오프라인 SAPI5 (Heami Desktop 등)는 다른 자연스러운 음성이 없을 때만 폴백으로 사용
    if (v.localService && !name.includes("natural") && !name.includes("premium") && !name.includes("enhanced")) {
      score -= 20;
    }

    return score;
  }

  function getKoreanVoices() {
    if (!("speechSynthesis" in window)) return [];
    const all = window.speechSynthesis.getVoices() || [];
    return all
      .filter((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith("ko"))
      .sort((a, b) => scoreKoreanVoice(b) - scoreKoreanVoice(a));
  }

  function loadKoreanVoice() {
    const koVoices = getKoreanVoices();
    if (!koVoices.length) return;

    if (preferredVoiceURI) {
      const matched = koVoices.find((v) => v.voiceURI === preferredVoiceURI || v.name === preferredVoiceURI);
      if (matched) {
        koreanVoice = matched;
        return;
      }
    }

    koreanVoice = koVoices[0];
  }

  if ("speechSynthesis" in window) {
    loadKoreanVoice();
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = () => {
        loadKoreanVoice();
        if (typeof HG.onVoicesUpdated === "function") {
          HG.onVoicesUpdated(getKoreanVoices(), koreanVoice);
        }
      };
    }
  }

  // 모바일 오디오 잠금 해제 (첫 터치/클릭 이벤트에 바인딩)
  function unlockAudio() {
    if (isUnlocked) return;
    const ctx = getContext();
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      try {
        source.start(0);
      } catch (e) {}
    }
    if ("speechSynthesis" in window) {
      loadKoreanVoice();
      try {
        const warmUp = new SpeechSynthesisUtterance("");
        warmUp.volume = 0;
        warmUp.lang = "ko-KR";
        window.speechSynthesis.speak(warmUp);
      } catch (e) {}
    }
    isUnlocked = true;
  }

  ["pointerdown", "touchstart", "click", "keydown"].forEach((evtName) => {
    window.addEventListener(evtName, unlockAudio, { once: true, passive: true });
  });

  /**
   * 1. 터치 피드백 효과음
   */
  function playTap() {
    if (masterVolume <= 0) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

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
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);

    oscGain.gain.setValueAtTime(0.5 * masterVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);

    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);

    const noiseGain = ctx.createGain();
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
    const ctx = getContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.22 },
      { freq: 659.25, start: 0.11, dur: 0.22 },
      { freq: 783.99, start: 0.22, dur: 0.26 },
      { freq: 1046.5, start: 0.34, dur: 0.45 }
    ];

    const now = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(n.freq * 2, now + n.start);

      const overtoneGain = ctx.createGain();
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
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 392.0, start: 0.0, dur: 0.16 },
      { freq: 440.0, start: 0.12, dur: 0.24 }
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
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
  function playSparkle(stepIndex = 0) {
    if (masterVolume <= 0) return;
    const ctx = getContext();
    if (!ctx) return;

    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    const freq = scale[stepIndex % scale.length];
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
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
    const ctx = getContext();
    if (!ctx) return;

    const melody = [
      { freq: 523.25, start: 0.0, dur: 0.16 },
      { freq: 659.25, start: 0.16, dur: 0.16 },
      { freq: 783.99, start: 0.32, dur: 0.16 },
      { freq: 1046.5, start: 0.48, dur: 0.32 },
      { freq: 783.99, start: 0.82, dur: 0.16 },
      { freq: 1046.5, start: 1.0, dur: 0.65 }
    ];

    const now = ctx.currentTime;
    melody.forEach((m) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(m.freq, now + m.start);
      osc2.frequency.setValueAtTime(m.freq * 1.5, now + m.start);

      const subGain = ctx.createGain();
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
    const trimmed = String(rawText).trim();
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
      .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, (ch) => PHONETIC_MAP[ch] || ch)
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
    const EXCLAIM_PATTERN = /^(우와아!|와아!|참 잘했어요[!.]?|정말 잘했어요[!.]?|우와아!\s*(잘했어요|맞았어요|멋져요|끝까지 순서대로 참 잘 썼어요)[!.]?|와아!\s*(맞았어요|정답이에요|참 잘했어요)[!.]?|안녕!|안녕하세요[,!]?)\s*(.*)$/;
    const match = text.match(EXCLAIM_PATTERN);

    if (match && match[1]) {
      const emotionPart = match[1].trim().replace(/[,]+$/, "!");
      const contentPart = (match[4] || "").trim();
      const segments = [
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
    const isQuestionOrInvite = /[?!]$/.test(text);
    return [
      {
        text,
        pitch: isNeuralOrCloud ? (isQuestionOrInvite ? 1.07 : 1.03) : 1.08,
        rate: baseRate
      }
    ];
  }

  /**
   * 한글 음성 발음 (커스텀 mp3 폴백 + 감정 억양이 살아있는 여선생님 Web Speech API)
   */
  function speak(text, options = {}) {
    if (!text || masterVolume <= 0) {
      if (options.onEnd) options.onEnd();
      return;
    }

    const spokenText = humanizeTeacherText(text);

    // 1순위: 커스텀 mp3 파일이 지정된 경우 우선 재생
    if (options.audioSrc) {
      const audio = new Audio(options.audioSrc);
      audio.volume = masterVolume;
      audio.onended = () => {
        if (options.onEnd) options.onEnd();
      };
      audio.onerror = () => {
        speakWithWebSpeech(spokenText, options);
      };
      audio.play().catch(() => {
        speakWithWebSpeech(spokenText, options);
      });
      return;
    }

    // 2순위: 브라우저 내장 Web Speech API (감정 구간 분리 발화)
    speakWithWebSpeech(spokenText, options);
  }

  function speakWithWebSpeech(spokenText, options = {}) {
    if (!("speechSynthesis" in window)) {
      if (options.onEnd) options.onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      loadKoreanVoice();

      const vName = koreanVoice ? (koreanVoice.name || "").toLowerCase() : "";
      const isNeuralOrCloud =
        vName.includes("natural") ||
        vName.includes("online") ||
        vName.includes("google") ||
        vName.includes("premium") ||
        vName.includes("enhanced");

      const baseRate = options.rate || (isNeuralOrCloud ? Math.max(0.92, speechRate) : speechRate);
      const segments = splitIntoEmotionalSegments(spokenText, baseRate, isNeuralOrCloud);

      segments.forEach((seg, idx) => {
        const utter = new SpeechSynthesisUtterance(seg.text);
        utter.lang = "ko-KR";
        if (koreanVoice) {
          utter.voice = koreanVoice;
        }
        utter.rate = seg.rate;
        utter.pitch = options.pitch || seg.pitch;
        utter.volume = masterVolume;

        if (idx === segments.length - 1 && options.onEnd) {
          utter.onend = options.onEnd;
          utter.onerror = options.onEnd;
        }

        window.speechSynthesis.speak(utter);
      });
    } catch (err) {
      if (options.onEnd) options.onEnd();
    }
  }

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
    preferredVoiceURI = voiceURI || "";
    loadKoreanVoice();
  }

  function getPreferredVoice() {
    return preferredVoiceURI || (koreanVoice ? koreanVoice.voiceURI : "");
  }

  HG.Audio = {
    unlockAudio,
    playTap,
    playPop,
    playCorrect,
    playEncourage,
    playSparkle,
    playFanfare,
    speak,
    setVolume,
    getVolume,
    setSpeechRate,
    getSpeechRate,
    getKoreanVoices,
    setPreferredVoice,
    getPreferredVoice
  };
})(window.HG);
