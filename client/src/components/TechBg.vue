<template>
  <canvas ref="canvas" class="tech-particles"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  theme: { type: String, default: 'light' },
})

const canvas = ref(null)
let raf = null
let nodes = []
let travelers = []
let pulses = []
let hexagons = []
let mouse = { x: -9999, y: -9999 }
let W = 0, H = 0, tick = 0

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 色板 — 亮色用 slate/blue/purple 混合，深色用 blue/cyan/indigo
const PALETTE = {
  light: {
    hubs: [[59, 130, 246], [99, 102, 241], [6, 182, 212]],
    nodes: [[100, 116, 139], [59, 130, 246], [99, 102, 241]],
    traveler: [59, 130, 246],
    pulse: [59, 130, 246],
    hex: [100, 116, 139],
    mouse: [59, 130, 246],
  },
  dark: {
    hubs: [[6, 182, 212], [99, 102, 241], [59, 130, 246]],
    nodes: [[59, 130, 246], [99, 102, 241], [6, 182, 212]],
    traveler: [6, 182, 212],
    pulse: [6, 182, 212],
    hex: [59, 130, 246],
    mouse: [6, 182, 212],
  },
}

const LINE_DIST = 160
const SPEED = 0.25

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function createNodes(w, h) {
  const mobile = w < 768
  const hubN = mobile ? 4 : 7
  const nodeN = mobile ? 18 : 35
  const out = []
  for (let i = 0; i < hubN; i++) {
    out.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED * 0.5,
      vy: (Math.random() - 0.5) * SPEED * 0.5,
      r: 2.8 + Math.random() * 1.2,
      hub: true,
      color: pick(PALETTE[props.theme].hubs),
      freq: 0.005 + Math.random() * 0.01,
      amp: 0.15 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      pulseTimer: Math.random() * 300,
      pulseInterval: 280 + Math.random() * 220,
    })
  }
  for (let i = 0; i < nodeN; i++) {
    out.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: 0.8 + Math.random() * 1.6,
      hub: false,
      color: pick(PALETTE[props.theme].nodes),
      freq: 0.008 + Math.random() * 0.015,
      amp: 0.1 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return out
}

function createHexagons(w, h) {
  const n = w < 768 ? 2 : 3
  return Array.from({ length: n }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    size: 20 + Math.random() * 30,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.002,
    alpha: 0.04 + Math.random() * 0.04,
  }))
}

function spawnTraveler() {
  if (nodes.length < 2) return null
  const a = Math.floor(Math.random() * nodes.length)
  let b = Math.floor(Math.random() * nodes.length)
  let tries = 0
  while (b === a && tries < 10) { b = Math.floor(Math.random() * nodes.length); tries++ }
  return { from: a, to: b, t: 0, speed: 0.003 + Math.random() * 0.005 }
}

function spawnPulse(node) {
  pulses.push({ x: node.x, y: node.y, r: 0, maxR: 50 + Math.random() * 50, alpha: 0.2 })
}

// --- 更新逻辑 ---
function update() {
  if (REDUCED) return
  tick++

  for (const n of nodes) {
    // 正弦波有机运动
    n.x += n.vx + Math.sin(tick * n.freq + n.phase) * n.amp
    n.y += n.vy + Math.cos(tick * n.freq * 0.7 + n.phase) * n.amp
    if (n.x < -20) n.x = W + 20
    if (n.x > W + 20) n.x = -20
    if (n.y < -20) n.y = H + 20
    if (n.y > H + 20) n.y = -20
    if (n.hub) {
      n.pulseTimer++
      if (n.pulseTimer >= n.pulseInterval) {
        n.pulseTimer = 0
        if (pulses.length < 8) spawnPulse(n)
      }
    }
  }

  // 流动点
  for (let i = travelers.length - 1; i >= 0; i--) {
    travelers[i].t += travelers[i].speed
    if (travelers[i].t >= 1) travelers.splice(i, 1)
  }
  while (travelers.length < 12) {
    const t = spawnTraveler()
    if (t) travelers.push(t)
  }

  // 脉冲
  for (let i = pulses.length - 1; i >= 0; i--) {
    pulses[i].r += 0.55
    pulses[i].alpha -= 0.0018
    if (pulses[i].alpha <= 0 || pulses[i].r >= pulses[i].maxR) pulses.splice(i, 1)
  }

  // 六边形
  for (const h of hexagons) {
    h.x += h.vx
    h.y += h.vy
    h.rot += h.rotSpeed
    if (h.x < -50) h.x = W + 50
    if (h.x > W + 50) h.x = -50
    if (h.y < -50) h.y = H + 50
    if (h.y > H + 50) h.y = -50
  }
}

// --- 绘制 ---
function drawHex(ctx, x, y, size, rot, color, alpha) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    const px = size * Math.cos(a)
    const py = size * Math.sin(a)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  const [cr, cg, cb] = color
  ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`
  ctx.lineWidth = 0.6
  ctx.stroke()
  ctx.restore()
}

function draw(ctx) {
  ctx.clearRect(0, 0, W, H)
  const pal = PALETTE[props.theme] || PALETTE.light

  // --- 六边形 ---
  for (const h of hexagons) {
    drawHex(ctx, h.x, h.y, h.size, h.rot, pal.hex, h.alpha)
  }

  // --- 连线 ---
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d >= LINE_DIST) continue
      const ratio = 1 - d / LINE_DIST
      const bothHub = nodes[i].hub && nodes[j].hub
      const alpha = ratio * (bothHub ? 0.18 : 0.08)
      const c = bothHub ? nodes[i].color : nodes[i].color
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
      ctx.lineWidth = bothHub ? 1.2 : 0.5
      ctx.beginPath()
      ctx.moveTo(nodes[i].x, nodes[i].y)
      ctx.lineTo(nodes[j].x, nodes[j].y)
      ctx.stroke()
    }
  }

  // --- 鼠标连线 + 光晕 ---
  if (mouse.x > 0 && mouse.y > 0) {
    const [mr, mg, mb] = pal.mouse
    for (const n of nodes) {
      const dx = mouse.x - n.x
      const dy = mouse.y - n.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 200) {
        const a = (1 - d / 200) * 0.18
        ctx.strokeStyle = `rgba(${mr},${mg},${mb},${a})`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(mouse.x, mouse.y)
        ctx.lineTo(n.x, n.y)
        ctx.stroke()
      }
    }
  }

  // --- 脉冲波纹 ---
  for (const p of pulses) {
    const [pr, pg, pb] = pal.pulse
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${pr},${pg},${pb},${p.alpha})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // --- 数据流动点（带轨迹） ---
  const [tr, tg, tb] = pal.traveler
  for (const tv of travelers) {
    const a = nodes[tv.from]
    const b = nodes[tv.to]
    if (!a || !b) continue
    const bright = Math.sin(tv.t * Math.PI)
    // 轨迹（3 段）
    for (let k = 3; k >= 0; k--) {
      const tt = tv.t - k * 0.02
      if (tt < 0) continue
      const tx = a.x + (b.x - a.x) * tt
      const ty = a.y + (b.y - a.y) * tt
      const fa = bright * (1 - k * 0.25) * 0.65
      const fr = 1.6 - k * 0.3
      ctx.beginPath()
      ctx.arc(tx, ty, fr, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${tr},${tg},${tb},${fa})`
      ctx.fill()
    }
  }

  // --- 节点 ---
  for (const n of nodes) {
    if (n.hub) {
      const [cr, cg, cb] = n.color
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.55)`
      ctx.fill()
    } else {
      const [cr, cg, cb] = n.color
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.3)`
      ctx.fill()
    }
  }
}

function loop(ctx) {
  update()
  draw(ctx)
  raf = requestAnimationFrame(() => loop(ctx))
}

function setup() {
  const el = canvas.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  W = window.innerWidth
  H = window.innerHeight
  el.width = W * dpr
  el.height = H * dpr
  const ctx = el.getContext('2d')
  ctx.scale(dpr, dpr)
  nodes = createNodes(W, H)
  hexagons = createHexagons(W, H)
  travelers = []
  pulses = []
  tick = 0
  if (raf) cancelAnimationFrame(raf)
  loop(ctx)
}

let resizeTimer = null
function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(setup, 250) }
function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY }
function onMouseLeave() { mouse.x = -9999; mouse.y = -9999 }

onMounted(() => {
  setup()
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseleave', onMouseLeave)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseleave', onMouseLeave)
})
</script>

<style scoped>
.tech-particles {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
