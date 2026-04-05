const API_KEY = import.meta.env.VITE_API_KEY || "";
const API_LINK = import.meta.env.VITE_API_LINK || "";

let mediaUnlocked = false;
let sharedAudio = null;
let currentObjectUrl = null;

function getSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.playsInline = true;
    sharedAudio.preload = "auto";
  }

  return sharedAudio;
}

export async function unlockAudio() {
  if (mediaUnlocked) return true;

  try {
    const audio = getSharedAudio();
    audio.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    audio.muted = true;

    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;

    mediaUnlocked = true;
    return true;
  } catch (error) {
    console.error("unlockAudio failed:", error);
    return false;
  }
}

export async function playTts(text, currentAudioRef) {
  if (!mediaUnlocked) {
    throw new Error("Audio is locked. Call unlockAudio() from a user gesture first.");
  }

  const audio = getSharedAudio();

  // остановить текущее воспроизведение
  audio.pause();
  audio.currentTime = 0;

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  const res = await fetch(`${API_LINK}/v1/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status}`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;

  audio.src = objectUrl;
  audio.load();

  currentAudioRef.value = audio;

  audio.onended = () => {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    if (currentAudioRef.value === audio) {
      currentAudioRef.value = null;
    }
  };

  audio.onerror = (e) => {
    console.error("audio element error:", e);

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    if (currentAudioRef.value === audio) {
      currentAudioRef.value = null;
    }
  };

  try {
    await audio.play();
  } catch (error) {
    console.error("play() failed:", error);
    throw error;
  }
}
