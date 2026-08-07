let audioCtx: AudioContext | null = null;
let speechUtterance: SpeechSynthesisUtterance | null = null;
let isPlayingSequence = false;
let currentRepetition = 0;
const MAX_REPETITIONS = 3;

// Initialize Web Audio Context lazily
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generate a professional medical beep sound (three short high-pitched beeps)
export function playMedicalBeep(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // 3 short beeps at 1000Hz (0.1s sound, 0.08s silence)
      const beepDuration = 0.1;
      const beepInterval = 0.18;

      for (let i = 0; i < 3; i++) {
        const startTime = now + i * beepInterval;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, startTime); // High frequency alarm beep

        // Smooth volume envelope to avoid clicks
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.setValueAtTime(0.3, startTime + beepDuration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + beepDuration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + beepDuration);
      }

      // Resolve the promise after the total beep pattern ends (approx 0.5s)
      setTimeout(resolve, 600);
    } catch (error) {
      console.error('Error playing Web Audio beep:', error);
      resolve(); // Resolve anyway so speech synthesis can continue
    }
  });
}

// Speak text using Speech Synthesis API
export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel(); // Cancel any current speech

      speechUtterance = new SpeechSynthesisUtterance(text);
      speechUtterance.lang = 'es-ES';
      speechUtterance.volume = 1.0;
      speechUtterance.rate = 0.95; // Slightly slower for clarity in medical instructions

      // Attempt to find a Spanish voice if available
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith('es'));
      if (esVoice) {
        speechUtterance.voice = esVoice;
      }

      speechUtterance.onend = () => {
        speechUtterance = null;
        resolve();
      };

      speechUtterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        speechUtterance = null;
        resolve();
      };

      window.speechSynthesis.speak(speechUtterance);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      resolve();
    }
  });
}

/**
 * Plays a sequence of beep followed by speaking the text.
 * Repeats this sequence 3 times in total.
 */
export async function startAlertSequence(cardTitle: string, cardDescription?: string) {
  if (isPlayingSequence) {
    return; // Already playing
  }

  isPlayingSequence = true;
  currentRepetition = 0;

  const phrase = `Atención. Hora del tratamiento: ${cardTitle}. ${cardDescription ? cardDescription : ''}`;

  // Check for local file first (fallback/option for user's wav files)
  const useLocalFile = false; // By default we use Web Audio + TTS

  while (isPlayingSequence && currentRepetition < MAX_REPETITIONS) {
    if (useLocalFile) {
      // If user had local wav player logic, it could go here
      // But Web Audio + TTS is a much better default
    }

    // Play Beeps
    if (!isPlayingSequence) break;
    await playMedicalBeep();

    // Small delay between beep and speech
    if (!isPlayingSequence) break;
    await new Promise(r => setTimeout(r, 400));

    // Speak treatment name
    if (!isPlayingSequence) break;
    await speakText(phrase);

    // Delay between repetitions
    if (!isPlayingSequence) break;
    currentRepetition++;
    if (currentRepetition < MAX_REPETITIONS) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  isPlayingSequence = false;
}

/**
 * Stops any active alarm beeps and voice synthesis.
 */
export function stopAlertSequence() {
  isPlayingSequence = false;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.error('Failed to cancel speech synthesis:', e);
  }
}
