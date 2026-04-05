<template>
  <div ref="mountEl" class="brain-cloud"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  state: {
    type: String,
    default: 'sleep',
  },
})

const mountEl = ref(null)

let scene = null
let camera = null
let renderer = null
let cloudGroup = null
let points = null
let lines = null
let animationId = null

const POINTS_COUNT = 420
const pointSeeds = new Float32Array(POINTS_COUNT)

let basePositions = null
let pointsGeometry = null
let linesGeometry = null

const statePresets = {
  sleep: {
    rotationSpeed: 0.0015,
    wobbleStrength: 0.01,
    scaleX: 1.1,
    scaleY: 1.0,
    scaleZ: 1.2,
    lineColor: '#ffffff',
    pointColor: '#ffffff',
    pulseStrength: 0.02,
    chaos: 0.15,
    lineOpacity: 0.16,
    connectionDistance: 0.95,
  },
  thinking: {
    rotationSpeed: 0.0035,
    wobbleStrength: 0.055,
    scaleX: 1.04,
    scaleY: 1.03,
    scaleZ: 1.05,
    lineColor: '#ffffff',
    pointColor: '#ffffff',
    pulseStrength: 0.06,
    chaos: 0.9,
    lineOpacity: 0.18,
    connectionDistance: 1.0,
  },
  talking: {
    rotationSpeed: 0.002,
    wobbleStrength: 0.035,
    scaleX: 1.19,
    scaleY: 1.18,
    scaleZ: 1.20,
    lineColor: '#ffffff',
    pointColor: '#ffffff',
    pulseStrength: 0.03,
    chaos: 0.22,
    lineOpacity: 0.16,
    connectionDistance: 1.12,
  },
  crashing: {
    rotationSpeed: 0.004,
    wobbleStrength: 0.07,
    scaleX: 1.06,
    scaleY: 1.02,
    scaleZ: 1.06,
    lineColor: '#ff3b30',
    pointColor: '#ffd0d0',
    pulseStrength: 0.08,
    chaos: 1.2,
    lineOpacity: 0.26,
    connectionDistance: 1.02,
  },
}

const currentParams = {
  rotationSpeed: statePresets.sleep.rotationSpeed,
  wobbleStrength: statePresets.sleep.wobbleStrength,
  scaleX: statePresets.sleep.scaleX,
  scaleY: statePresets.sleep.scaleY,
  scaleZ: statePresets.sleep.scaleZ,
  pulseStrength: statePresets.sleep.pulseStrength,
  chaos: statePresets.sleep.chaos,
  lineOpacity: statePresets.sleep.lineOpacity,
  connectionDistance: statePresets.sleep.connectionDistance,
}

const targetParams = {
  rotationSpeed: statePresets.sleep.rotationSpeed,
  wobbleStrength: statePresets.sleep.wobbleStrength,
  scaleX: statePresets.sleep.scaleX,
  scaleY: statePresets.sleep.scaleY,
  scaleZ: statePresets.sleep.scaleZ,
  pulseStrength: statePresets.sleep.pulseStrength,
  chaos: statePresets.sleep.chaos,
  lineOpacity: statePresets.sleep.lineOpacity,
  connectionDistance: statePresets.sleep.connectionDistance,
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function updateVisualParams() {
  currentParams.rotationSpeed = lerp(currentParams.rotationSpeed, targetParams.rotationSpeed, 0.05)
  currentParams.wobbleStrength = lerp(currentParams.wobbleStrength, targetParams.wobbleStrength, 0.05)
  currentParams.scaleX = lerp(currentParams.scaleX, targetParams.scaleX, 0.05)
  currentParams.scaleY = lerp(currentParams.scaleY, targetParams.scaleY, 0.05)
  currentParams.scaleZ = lerp(currentParams.scaleZ, targetParams.scaleZ, 0.05)
  currentParams.pulseStrength = lerp(currentParams.pulseStrength, targetParams.pulseStrength, 0.05)
  currentParams.chaos = lerp(currentParams.chaos, targetParams.chaos, 0.05)
  currentParams.lineOpacity = lerp(currentParams.lineOpacity, targetParams.lineOpacity, 0.05)
  currentParams.connectionDistance = lerp(currentParams.connectionDistance, targetParams.connectionDistance, 0.05)
}

function applyStatePreset(state) {
  const preset = statePresets[state] || statePresets.sleep

  targetParams.rotationSpeed = preset.rotationSpeed
  targetParams.wobbleStrength = preset.wobbleStrength
  targetParams.scaleX = preset.scaleX
  targetParams.scaleY = preset.scaleY
  targetParams.scaleZ = preset.scaleZ
  targetParams.pulseStrength = preset.pulseStrength
  targetParams.chaos = preset.chaos
  targetParams.lineOpacity = preset.lineOpacity
  targetParams.connectionDistance = preset.connectionDistance

  if (lines?.material) {
    lines.material.color.set(preset.lineColor)
  }

  if (points?.material) {
    points.material.color.set(preset.pointColor)
  }
}

function buildConnections(positionsArray, pointCount, maxDist = 0.95, maxLinksPerPoint = 3) {
  const segments = []

  for (let i = 0; i < pointCount; i++) {
    const ax = positionsArray[i * 3 + 0]
    const ay = positionsArray[i * 3 + 1]
    const az = positionsArray[i * 3 + 2]

    let links = 0

    for (let j = i + 1; j < pointCount; j++) {
      if (links >= maxLinksPerPoint) break

      const bx = positionsArray[j * 3 + 0]
      const by = positionsArray[j * 3 + 1]
      const bz = positionsArray[j * 3 + 2]

      const dx = ax - bx
      const dy = ay - by
      const dz = az - bz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < maxDist) {
        segments.push(ax, ay, az, bx, by, bz)
        links++
      }
    }
  }

  return new Float32Array(segments)
}

function createPoints() {
  const pointPositions = new Float32Array(POINTS_COUNT * 3)

  for (let i = 0; i < POINTS_COUNT; i++) {
    const u = Math.random()
    const v = Math.random()

    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const radius = 1.1 + Math.pow(Math.random(), 0.8) * 1.2

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    pointPositions[i * 3 + 0] = x
    pointPositions[i * 3 + 1] = y
    pointPositions[i * 3 + 2] = z

    pointSeeds[i] = Math.random() * 1000
  }

  basePositions = pointPositions.slice()

  pointsGeometry = new THREE.BufferGeometry()
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))

  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.045,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
  })

  points = new THREE.Points(pointsGeometry, pointsMaterial)
  cloudGroup.add(points)

  const initialLinePositions = buildConnections(pointPositions, POINTS_COUNT, currentParams.connectionDistance)

  linesGeometry = new THREE.BufferGeometry()
  linesGeometry.setAttribute('position', new THREE.BufferAttribute(initialLinePositions, 3))

  const linesMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  lines = new THREE.LineSegments(linesGeometry, linesMaterial)
  cloudGroup.add(lines)
}

function resize() {
  if (!mountEl.value || !renderer || !camera) return

  const width = mountEl.value.clientWidth
  const height = mountEl.value.clientHeight || 320

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
}

function updatePoints(time) {
  if (!pointsGeometry) return

  const pos = pointsGeometry.attributes.position.array
  const tBase = time * 0.00055

  for (let i = 0; i < POINTS_COUNT; i++) {
    const i3 = i * 3
    const seed = pointSeeds[i]

    const bx = basePositions[i3 + 0] * currentParams.scaleX
    const by = basePositions[i3 + 1] * currentParams.scaleY
    const bz = basePositions[i3 + 2] * currentParams.scaleZ

    const t = tBase + seed

    const wobble = currentParams.wobbleStrength
    const pulse = currentParams.pulseStrength
    const chaos = currentParams.chaos

    const pulseFactor = 1 + Math.sin(time * 0.003 + seed) * pulse

    pos[i3 + 0] =
      bx * pulseFactor +
      Math.sin(t * (1.4 + chaos * 0.9)) * wobble +
      Math.cos(t * (0.6 + chaos * 0.4)) * wobble * 0.5

    pos[i3 + 1] =
      by * pulseFactor +
      Math.cos(t * (1.1 + chaos * 0.7)) * wobble +
      Math.sin(t * (0.8 + chaos * 0.35)) * wobble * 0.5

    pos[i3 + 2] =
      bz * pulseFactor +
      Math.sin(t * (0.9 + chaos * 0.8)) * wobble * 1.15
  }

  pointsGeometry.attributes.position.needsUpdate = true
}

let lastLineUpdate = 0
const LINE_UPDATE_INTERVAL = 120

function updateLines(time) {
  if (!pointsGeometry || !lines) return
  if (time - lastLineUpdate < LINE_UPDATE_INTERVAL) return

  lastLineUpdate = time

  const currentPositions = pointsGeometry.attributes.position.array
  const newLinePositions = buildConnections(
    currentPositions,
    POINTS_COUNT,
    currentParams.connectionDistance
  )

  lines.geometry.dispose()
  linesGeometry = new THREE.BufferGeometry()
  linesGeometry.setAttribute('position', new THREE.BufferAttribute(newLinePositions, 3))
  lines.geometry = linesGeometry
}

function animate(time = 0) {
  animationId = requestAnimationFrame(animate)

  updateVisualParams()
  updatePoints(time)
  updateLines(time)

  const timeSeconds = time * 0.001

  const speedMod =
    1 +
    Math.sin(timeSeconds * 2.3) * currentParams.chaos * 0.35 +
    Math.sin(timeSeconds * 0.9 + 1.7) * currentParams.chaos * 0.2

  cloudGroup.rotation.y += currentParams.rotationSpeed * speedMod
  cloudGroup.rotation.x = Math.sin(time * 0.0002) * 0.05 * (1 + currentParams.chaos * 0.4)
  cloudGroup.rotation.z = Math.cos(time * 0.00015) * 0.025 * (1 + currentParams.chaos * 0.25)

  if (lines?.material) {
    if (props.state === 'crashing') {
      lines.material.opacity =
        currentParams.lineOpacity * (0.65 + Math.abs(Math.sin(time * 0.01)) * 0.85)
    } else {
      lines.material.opacity = currentParams.lineOpacity
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

watch(
  () => props.state,
  (newState) => {
    applyStatePreset(newState)
  },
  { immediate: true }
)

onMounted(() => {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.z = 9

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  cloudGroup = new THREE.Group()
  scene.add(cloudGroup)

  createPoints()

  mountEl.value.appendChild(renderer.domElement)

  resize()
  window.addEventListener('resize', resize)

  applyStatePreset(props.state)
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)

  pointsGeometry?.dispose()
  linesGeometry?.dispose()
  points?.material?.dispose()
  lines?.material?.dispose()
  renderer?.dispose()

  if (renderer?.domElement && mountEl.value?.contains(renderer.domElement)) {
    mountEl.value.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.brain-cloud {
  width: 100%;
  height: 320px;
  position: relative;
  overflow: hidden;
}

.brain-cloud :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
