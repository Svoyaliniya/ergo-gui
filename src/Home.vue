<template>
  <div class="home-page">
    <div class="answer-box">
      <p class="answer-text">{{ displayedText }}</p>
    </div>

    <div class="visual-wrap">
      <BrainCloud :state="assistantState" />
    </div>

    <div class="input-wrap inside" @pointerdown="tryUnlockAudio">
      <input
        v-model="message"
        class="input-field"
        type="text"
        placeholder="Введите текст..."
        @focus="tryUnlockAudio"
        @keyup.enter="sendMessage"
      />

      <button
        class="send-btn inside-btn"
        @click="sendMessage"
        :disabled="!message.trim()"
        aria-label="Отправить"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="send-icon"
        >
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { unlockAudio, playTts } from './utils/playTts'
import { typeText } from './utils/typeText'

import BrainCloud from '@/components/BrainCloud.vue'

const API_KEY = import.meta.env.VITE_API_KEY || "";
const API_LINK = import.meta.env.VITE_API_LINK || "";

const assistantState = ref('sleep') //sleep, thinking, talking, crashing
const message = ref('')
const displayedText = ref('')
const fullText = ref('')
const isTyping = ref(false)
const currentAudio = ref(null)
const isAudioReady = ref(false)

const tryUnlockAudio = async () => {
  if (isAudioReady.value) return

  const ok = await unlockAudio()
  if (ok) {
    isAudioReady.value = true
    console.log('audio unlocked')
  }
}
onMounted(() => {
  window.addEventListener('pointerdown', tryUnlockAudio, { once: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', tryUnlockAudio)
})

const sendMessage = async () => {
  if (!message.value.trim()) return

  try {
    assistantState.value = 'thinking'

    const res = await fetch(`${API_LINK}/v1/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        text: message.value,
        source: 'web-ui'
      })
    })

    const data = await res.json()
    const reply = String(data.reply || '').trim()

    if (!reply) {
      assistantState.value = 'crashing'
      return
    }

    assistantState.value = 'talking'

    const typingPromise = typeText(reply, fullText, isTyping, displayedText)

    const ttsPromise = isAudioReady.value
      ? playTts(reply, currentAudio).catch((error) => {
          console.error(error)
        })
      : Promise.resolve()

    await Promise.all([typingPromise, ttsPromise])

    if (assistantState.value === 'talking') {
      assistantState.value = 'sleep'
    }

    message.value = ''
  } catch (error) {
    assistantState.value = 'crashing'
    console.error(error)
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.home-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  padding: 24px;
  background: #050505;
  transition: background-color 0.5s ease;
}

.answer-box {
  width: auto;
  max-width: 560px;
  min-height: 120px;
  padding: 20px;
}

.answer-text {
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: #f5f5f5;
}

.visual-wrap {
  width: 100%;
  max-width: 420px;
  margin-bottom: 8px;
}

.input-wrap.inside {
  position: relative;
  width: 100%;
  max-width: 700px;
}

.input-field {
  width: 100%;
  min-height: 52px;
  padding: 14px 64px 14px 18px;
  font-size: 16px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 16px;
  outline: none;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.input-field:focus {
  border-color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
}

.send-btn {
  border: none;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.inside-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.inside-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
}

.inside-btn:active:not(:disabled) {
  transform: translateY(-50%) scale(0.96);
}

.inside-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.send-icon {
  width: 17px;
  height: 17px;
}

@media (max-width: 768px) {
  .home-page {
    padding: 18px;
    gap: 24px;
  }

  .answer-text {
    font-size: 16px;
  }

  .input-field {
    min-height: 50px;
    padding: 13px 60px 13px 16px;
    font-size: 16px;
  }

  .inside-btn {
    width: 38px;
    height: 38px;
    right: 6px;
  }

  .send-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
