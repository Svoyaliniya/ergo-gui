const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

recorder.ondataavailable = async (event) => {
  if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
    const arrayBuffer = await event.data.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    ws.send(JSON.stringify({
      type: 'audio.chunk',
      sessionId,
      mimeType: recorder.mimeType,
      data: base64,
    }))
  }
}

recorder.start(500)
