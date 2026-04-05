function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function typeText(text, fullText, isTyping, displayedText) {
  displayedText.value = ''
  fullText.value = text
  isTyping.value = true

  for (let i = 0; i < text.length; i++) {
    displayedText.value += text[i]

    const char = text[i]
    if (char === '.' || char === '!' || char === '?') {
      await sleep(45)
    } else if (char === ',' || char === ';' || char === ':') {
      await sleep(25)
    } else if (char === ' ') {
      await sleep(10)
    } else {
      await sleep(18)
    }
  }

  isTyping.value = false
}
