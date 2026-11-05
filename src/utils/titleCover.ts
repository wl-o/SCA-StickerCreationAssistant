export type CoverTemplateId =
  | 'warm-paper'
  | 'cool-mist'
  | 'warm-sunset'
  | 'cool-ink'
  | 'warm-terracotta'
  | 'scroll-book'
  | 'fresh-mint'
  | 'fresh-sky'

export type FancyStyle = 'stroke-pop' | 'neon-soft' | 'ink-brush' | 'clean-glow' | 'poster' | 'scroll' | 'fresh'

export interface CoverTemplate {
  id: CoverTemplateId
  name: string
  tone: 'warm' | 'cool'
  background: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  titleFill: string | ((ctx: CanvasRenderingContext2D, y: number, lineHeight: number) => string | CanvasGradient)
  titleStroke?: string
  strokeWidth?: number
  shadowColor?: string
  subColor: string
  fontFamily: string
  fontWeight: string
  fontSize: number
  /** 字间距（相对字宽的比例，如 0.12） */
  letterSpacing: number
  /** 行距倍数 */
  lineHeightRatio: number
  /** 标题区垂直位置 0-1 */
  titleTopRatio: number
  align: 'left' | 'center'
  style: FancyStyle
  /** 是否画默认上下装饰线 */
  sideMarks?: boolean
}

const DISPLAY_STACK =
  '"ZCOOL QingKe HuangYou", "ZCOOL KuaiLe", "Microsoft YaHei", sans-serif'
const BRUSH_STACK = '"Ma Shan Zheng", "Zhi Mang Xing", "KaiTi", serif'
const POSTER_STACK = '"ZCOOL KuaiLe", "ZCOOL QingKe HuangYou", "Microsoft YaHei", sans-serif'

/** 叠一层细颗粒底纹（用绘制叠加，避免 putImageData 整块覆盖成黑底） */
function fillGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rgba: string,
  density = 1800,
) {
  ctx.save()
  ctx.fillStyle = rgba
  for (let i = 0; i < density; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const s = Math.random() < 0.15 ? 2 : 1
    ctx.fillRect(x, y, s, s)
  }
  ctx.restore()
}

function drawWarmPaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#fff4e5')
  g.addColorStop(0.45, '#ffe2c4')
  g.addColorStop(1, '#f5c9a0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const spot = ctx.createRadialGradient(w * 0.2, h * 0.15, 40, w * 0.2, h * 0.15, w * 0.55)
  spot.addColorStop(0, 'rgba(255,255,255,0.55)')
  spot.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.strokeStyle = 'rgba(180,120,70,0.10)'
  ctx.lineWidth = 1
  for (let i = -h; i < w + h; i += 28) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + h, h)
    ctx.stroke()
  }
  ctx.restore()
  fillGrain(ctx, w, h, 'rgba(120,80,40,0.08)', 2200)
}

function drawCoolMist(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#e8f2ff')
  g.addColorStop(0.5, '#d5e7fb')
  g.addColorStop(1, '#b9cfe8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  for (const [cx, cy, r, a] of [
    [w * 0.75, h * 0.22, w * 0.35, 0.35],
    [w * 0.2, h * 0.7, w * 0.4, 0.28],
    [w * 0.55, h * 0.55, w * 0.25, 0.2],
  ] as const) {
    const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, r)
    rg.addColorStop(0, `rgba(255,255,255,${a})`)
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.strokeStyle = 'rgba(70,110,160,0.08)'
  ctx.lineWidth = 1
  for (let x = 40; x < w; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 40; y < h; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  fillGrain(ctx, w, h, 'rgba(60,100,150,0.07)', 1800)
}

function drawWarmSunset(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w * 0.2, h)
  g.addColorStop(0, '#ffd6a5')
  g.addColorStop(0.4, '#ff9e7a')
  g.addColorStop(0.75, '#f07167')
  g.addColorStop(1, '#c94c4c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const sun = ctx.createRadialGradient(w * 0.72, h * 0.28, 20, w * 0.72, h * 0.28, w * 0.42)
  sun.addColorStop(0, 'rgba(255,245,200,0.7)')
  sun.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)

  // 弧形波纹底纹
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath()
    ctx.arc(w * 0.7, h * 0.25, 120 + i * 70, 0, Math.PI * 2)
    ctx.stroke()
  }
  fillGrain(ctx, w, h, 'rgba(120,40,20,0.08)', 2000)
}

function drawCoolInk(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#1a2744')
  g.addColorStop(0.55, '#243b55')
  g.addColorStop(1, '#141e30')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 墨晕
  for (const [cx, cy, r] of [
    [w * 0.15, h * 0.2, w * 0.35],
    [w * 0.85, h * 0.75, w * 0.4],
  ] as const) {
    const rg = ctx.createRadialGradient(cx, cy, 20, cx, cy, r)
    rg.addColorStop(0, 'rgba(120,170,220,0.18)')
    rg.addColorStop(1, 'rgba(120,170,220,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }

  // 细横线底纹
  ctx.strokeStyle = 'rgba(180,210,255,0.06)'
  ctx.lineWidth = 1
  for (let y = 60; y < h; y += 36) {
    ctx.beginPath()
    ctx.moveTo(60, y)
    ctx.lineTo(w - 60, y)
    ctx.stroke()
  }
  fillGrain(ctx, w, h, 'rgba(180,210,255,0.06)', 1600)
}

function drawWarmTerracotta(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#f6e7d8')
  g.addColorStop(0.5, '#e8c3a4')
  g.addColorStop(1, '#d39b76')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 菱形底纹
  ctx.save()
  ctx.strokeStyle = 'rgba(120,70,40,0.08)'
  ctx.lineWidth = 1.5
  const step = 56
  for (let y = -step; y < h + step; y += step) {
    for (let x = -step; x < w + step; x += step) {
      ctx.strokeRect(x + ((y / step) % 2) * (step / 2), y, step * 0.7, step * 0.7)
    }
  }
  ctx.restore()

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(90,40,20,0.12)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
  fillGrain(ctx, w, h, 'rgba(100,50,25,0.08)', 2000)
}

/** 古风书卷：卷轴木杆 + 宣纸面 */
function drawScrollBook(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 深色案几底
  const desk = ctx.createLinearGradient(0, 0, 0, h)
  desk.addColorStop(0, '#3a2a1c')
  desk.addColorStop(0.5, '#2a1d14')
  desk.addColorStop(1, '#1c140e')
  ctx.fillStyle = desk
  ctx.fillRect(0, 0, w, h)
  fillGrain(ctx, w, h, 'rgba(255,220,160,0.04)', 1200)

  const paperX = w * 0.1
  const paperW = w * 0.8
  const paperY = h * 0.14
  const paperH = h * 0.72
  const rodH = 42

  // 纸面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  roundRect(ctx, paperX + 10, paperY + 14, paperW, paperH, 18)
  ctx.fill()

  // 宣纸
  const paper = ctx.createLinearGradient(paperX, paperY, paperX + paperW, paperY + paperH)
  paper.addColorStop(0, '#f7ecd6')
  paper.addColorStop(0.5, '#f1e2c2')
  paper.addColorStop(1, '#e8d4aa')
  ctx.fillStyle = paper
  ctx.beginPath()
  roundRect(ctx, paperX, paperY, paperW, paperH, 16)
  ctx.fill()

  // 纸面竖纹
  ctx.strokeStyle = 'rgba(140,100,50,0.06)'
  ctx.lineWidth = 1
  for (let x = paperX + 36; x < paperX + paperW - 20; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, paperY + 50)
    ctx.lineTo(x, paperY + paperH - 50)
    ctx.stroke()
  }

  // 卷轴上下木杆
  drawScrollRod(ctx, paperX - 18, paperY - rodH * 0.35, paperW + 36, rodH)
  drawScrollRod(ctx, paperX - 18, paperY + paperH - rodH * 0.55, paperW + 36, rodH)

  // 纸面内框线
  ctx.strokeStyle = 'rgba(120,70,30,0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(paperX + 36, paperY + 56, paperW - 72, paperH - 112)

  // 角饰
  ctx.strokeStyle = 'rgba(140,80,30,0.35)'
  ctx.lineWidth = 3
  const inset = 48
  const corner = 28
  // 左上
  ctx.beginPath()
  ctx.moveTo(paperX + inset, paperY + inset + corner)
  ctx.lineTo(paperX + inset, paperY + inset)
  ctx.lineTo(paperX + inset + corner, paperY + inset)
  ctx.stroke()
  // 右上
  ctx.beginPath()
  ctx.moveTo(paperX + paperW - inset - corner, paperY + inset)
  ctx.lineTo(paperX + paperW - inset, paperY + inset)
  ctx.lineTo(paperX + paperW - inset, paperY + inset + corner)
  ctx.stroke()
  // 左下
  ctx.beginPath()
  ctx.moveTo(paperX + inset, paperY + paperH - inset - corner)
  ctx.lineTo(paperX + inset, paperY + paperH - inset)
  ctx.lineTo(paperX + inset + corner, paperY + paperH - inset)
  ctx.stroke()
  // 右下
  ctx.beginPath()
  ctx.moveTo(paperX + paperW - inset - corner, paperY + paperH - inset)
  ctx.lineTo(paperX + paperW - inset, paperY + paperH - inset)
  ctx.lineTo(paperX + paperW - inset, paperY + paperH - inset - corner)
  ctx.stroke()

  fillGrain(ctx, w, h, 'rgba(120,80,30,0.05)', 900)
}

function drawScrollRod(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const g = ctx.createLinearGradient(x, y, x, y + height)
  g.addColorStop(0, '#8b5a2b')
  g.addColorStop(0.35, '#c48a4a')
  g.addColorStop(0.55, '#6e4018')
  g.addColorStop(1, '#4a2c10')
  ctx.fillStyle = g
  ctx.beginPath()
  roundRect(ctx, x, y, width, height, height / 2)
  ctx.fill()

  // 两端高光
  ctx.fillStyle = 'rgba(255,230,180,0.28)'
  ctx.beginPath()
  roundRect(ctx, x + 12, y + 6, width - 24, height * 0.28, 8)
  ctx.fill()

  // 两端两端
  for (const cx of [x + 8, x + width - 8]) {
    const eg = ctx.createRadialGradient(cx, y + height / 2, 2, cx, y + height / 2, height * 0.7)
    eg.addColorStop(0, '#d4a574')
    eg.addColorStop(1, '#5a3414')
    ctx.fillStyle = eg
    ctx.beginPath()
    ctx.arc(cx, y + height / 2, height * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/** 清新薄荷绿 */
function drawFreshMint(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#f3fff8')
  g.addColorStop(0.45, '#d9f5e6')
  g.addColorStop(1, '#b8e8d2')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 柔光
  const spot = ctx.createRadialGradient(w * 0.8, h * 0.18, 20, w * 0.8, h * 0.18, w * 0.5)
  spot.addColorStop(0, 'rgba(255,255,255,0.7)')
  spot.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, w, h)

  // 叶片色块点缀
  const leaves = [
    [120, 220, 70, -0.4],
    [960, 360, 90, 0.5],
    [180, 1180, 80, 0.2],
    [900, 1100, 60, -0.6],
  ] as const
  for (const [x, y, r, rot] of leaves) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = 'rgba(72, 168, 120, 0.14)'
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // 轻波纹线
  ctx.strokeStyle = 'rgba(60,140,110,0.10)'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i += 1) {
    const y = h * 0.62 + i * 36
    ctx.beginPath()
    ctx.moveTo(80, y)
    ctx.bezierCurveTo(w * 0.35, y - 24, w * 0.65, y + 24, w - 80, y)
    ctx.stroke()
  }
  fillGrain(ctx, w, h, 'rgba(40,120,90,0.05)', 1400)
}

/** 清新晴空 */
function drawFreshSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#eaf7ff')
  g.addColorStop(0.4, '#d2efff')
  g.addColorStop(1, '#b9e0f7')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 云团
  const clouds = [
    [200, 260, 90],
    [320, 240, 70],
    [780, 320, 110],
    [900, 300, 70],
    [160, 1080, 80],
    [920, 1160, 100],
  ] as const
  for (const [x, y, r] of clouds) {
    const cloud = ctx.createRadialGradient(x, y, 8, x, y, r)
    cloud.addColorStop(0, 'rgba(255,255,255,0.85)')
    cloud.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = cloud
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 细斜线底纹
  ctx.strokeStyle = 'rgba(80,150,200,0.07)'
  ctx.lineWidth = 1
  for (let i = -h; i < w + h; i += 34) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + h * 0.35, h)
    ctx.stroke()
  }
  fillGrain(ctx, w, h, 'rgba(50,120,180,0.05)', 1300)
}

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'warm-paper',
    name: '暖色纸纹',
    tone: 'warm',
    background: drawWarmPaper,
    titleFill: '#c23b22',
    titleStroke: '#3a1d12',
    strokeWidth: 14,
    shadowColor: 'rgba(90,40,20,0.16)',
    subColor: 'rgba(90,50,30,0.62)',
    fontFamily: DISPLAY_STACK,
    fontWeight: '700',
    fontSize: 104,
    letterSpacing: 0.12,
    lineHeightRatio: 1.38,
    titleTopRatio: 0.34,
    align: 'center',
    style: 'stroke-pop',
  },
  {
    id: 'cool-mist',
    name: '冷色薄雾',
    tone: 'cool',
    background: drawCoolMist,
    titleFill: '#1f4b7a',
    titleStroke: '#ffffff',
    strokeWidth: 16,
    shadowColor: 'rgba(40,80,130,0.18)',
    subColor: 'rgba(40,70,110,0.58)',
    fontFamily: DISPLAY_STACK,
    fontWeight: '700',
    fontSize: 102,
    letterSpacing: 0.13,
    lineHeightRatio: 1.4,
    titleTopRatio: 0.36,
    align: 'center',
    style: 'stroke-pop',
  },
  {
    id: 'warm-sunset',
    name: '暖色暮光',
    tone: 'warm',
    background: drawWarmSunset,
    titleFill: '#ffffff',
    titleStroke: 'rgba(120,40,30,0.45)',
    strokeWidth: 12,
    shadowColor: 'rgba(80,20,10,0.25)',
    subColor: 'rgba(255,245,230,0.82)',
    fontFamily: POSTER_STACK,
    fontWeight: '700',
    fontSize: 106,
    letterSpacing: 0.11,
    lineHeightRatio: 1.36,
    titleTopRatio: 0.33,
    align: 'center',
    style: 'clean-glow',
  },
  {
    id: 'cool-ink',
    name: '冷色夜墨',
    tone: 'cool',
    background: drawCoolInk,
    titleFill: (ctx, y, lineHeight) => {
      const g = ctx.createLinearGradient(0, y, 0, y + lineHeight)
      g.addColorStop(0, '#f4fbff')
      g.addColorStop(1, '#9fd0ff')
      return g
    },
    titleStroke: 'rgba(120,180,255,0.35)',
    strokeWidth: 10,
    shadowColor: 'rgba(80,160,255,0.45)',
    subColor: 'rgba(190,220,255,0.65)',
    fontFamily: DISPLAY_STACK,
    fontWeight: '700',
    fontSize: 104,
    letterSpacing: 0.12,
    lineHeightRatio: 1.38,
    titleTopRatio: 0.35,
    align: 'center',
    style: 'neon-soft',
  },
  {
    id: 'warm-terracotta',
    name: '暖陶底纹',
    tone: 'warm',
    background: drawWarmTerracotta,
    titleFill: '#2a1810',
    titleStroke: undefined,
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.08)',
    subColor: 'rgba(70,40,25,0.55)',
    fontFamily: BRUSH_STACK,
    fontWeight: '400',
    fontSize: 112,
    letterSpacing: 0.14,
    lineHeightRatio: 1.42,
    titleTopRatio: 0.32,
    align: 'center',
    style: 'ink-brush',
  },
  {
    id: 'scroll-book',
    name: '古风书卷',
    tone: 'warm',
    background: drawScrollBook,
    titleFill: '#3b2412',
    titleStroke: undefined,
    strokeWidth: 0,
    shadowColor: 'rgba(80,40,10,0.12)',
    subColor: 'rgba(90,55,25,0.62)',
    fontFamily: BRUSH_STACK,
    fontWeight: '400',
    fontSize: 108,
    letterSpacing: 0.16,
    lineHeightRatio: 1.48,
    titleTopRatio: 0.38,
    align: 'center',
    style: 'scroll',
    sideMarks: false,
  },
  {
    id: 'fresh-mint',
    name: '清新薄荷',
    tone: 'cool',
    background: drawFreshMint,
    titleFill: '#1f7a58',
    titleStroke: '#ffffff',
    strokeWidth: 14,
    shadowColor: 'rgba(40,120,90,0.16)',
    subColor: 'rgba(40,100,75,0.58)',
    fontFamily: DISPLAY_STACK,
    fontWeight: '700',
    fontSize: 104,
    letterSpacing: 0.13,
    lineHeightRatio: 1.4,
    titleTopRatio: 0.34,
    align: 'center',
    style: 'fresh',
    sideMarks: false,
  },
  {
    id: 'fresh-sky',
    name: '清新晴空',
    tone: 'cool',
    background: drawFreshSky,
    titleFill: '#1d6fa5',
    titleStroke: '#ffffff',
    strokeWidth: 14,
    shadowColor: 'rgba(40,110,160,0.16)',
    subColor: 'rgba(40,90,130,0.55)',
    fontFamily: DISPLAY_STACK,
    fontWeight: '700',
    fontSize: 104,
    letterSpacing: 0.13,
    lineHeightRatio: 1.4,
    titleTopRatio: 0.34,
    align: 'center',
    style: 'fresh',
    sideMarks: false,
  },
]

const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&family=ZCOOL+QingKe+HuangYou&family=Zhi+Mang+Xing&display=swap'

let fontsReady: Promise<void> | null = null

export function ensureCoverFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!fontsReady) {
    fontsReady = (async () => {
      if (!document.getElementById('cover-fonts')) {
        const link = document.createElement('link')
        link.id = 'cover-fonts'
        link.rel = 'stylesheet'
        link.href = FONT_CSS
        document.head.appendChild(link)
      }
      await new Promise((r) => setTimeout(r, 50))
      if (document.fonts?.load) {
        await Promise.all([
          document.fonts.load('700 86px "ZCOOL KuaiLe"'),
          document.fonts.load('700 86px "ZCOOL QingKe HuangYou"'),
          document.fonts.load('400 96px "Ma Shan Zheng"'),
          document.fonts.load('400 96px "Zhi Mang Xing"'),
        ]).catch(() => undefined)
        await document.fonts.ready.catch(() => undefined)
      }
    })()
  }
  return fontsReady
}

/** 更自然的折行：优先在标点/语气处断开，避免一行过满 */
function wrapTitleLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacing: number,
  maxLines: number,
): string[] {
  const chars = [...text]
  if (!chars.length) return ['']

  const measure = (s: string) => measureSpacedWidth(ctx, s, letterSpacing)
  const lines: string[] = []
  let current = ''

  const breakScore = (ch: string) => {
    if (/[，。！？、；：,.!?;:\s]/.test(ch)) return 3
    if (/[的了着过和与]/.test(ch)) return 2
    return 0
  }

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    const next = current + ch
    if (measure(next) <= maxWidth || !current) {
      current = next
      continue
    }

    // 回溯找更好断点
    let best = current.length
    for (let j = current.length - 1; j >= Math.max(1, current.length - 4); j -= 1) {
      if (breakScore(current[j - 1] || '') > 0) {
        best = j
        break
      }
    }
    lines.push(current.slice(0, best).trim())
    current = `${current.slice(best)}${ch}`.trim()
    if (lines.length >= maxLines - 1) {
      current += chars.slice(i + 1).join('')
      break
    }
  }
  if (current) lines.push(current)

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines)
    clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(1, clipped[maxLines - 1].length - 1))}…`
    return clipped
  }
  return lines.map((l) => l.trim()).filter(Boolean)
}

function measureSpacedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
): number {
  const chars = [...text]
  if (!chars.length) return 0
  let width = 0
  chars.forEach((ch, index) => {
    width += ctx.measureText(ch).width
    if (index < chars.length - 1) {
      width += ctx.measureText(ch).width * letterSpacing
    }
  })
  return width
}

function resolveFill(
  ctx: CanvasRenderingContext2D,
  template: CoverTemplate,
  y: number,
  lineHeight: number,
): string | CanvasGradient {
  if (typeof template.titleFill === 'function') {
    return template.titleFill(ctx, y, lineHeight)
  }
  return template.titleFill
}

function drawSpacedFancyLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  template: CoverTemplate,
  lineHeight: number,
  align: 'left' | 'center',
) {
  const chars = [...text]
  const total = measureSpacedWidth(ctx, text, template.letterSpacing)
  let cursor = align === 'center' ? centerX - total / 2 : centerX
  const fill = resolveFill(ctx, template, y, lineHeight)
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  chars.forEach((ch, index) => {
    const chWidth = ctx.measureText(ch).width
    const x = cursor
    const jitterY =
      template.style === 'ink-brush' || template.style === 'scroll'
        ? ((index % 3) - 1) * 4
        : 0

    ctx.save()
    if (template.style === 'ink-brush' || template.style === 'scroll') {
      ctx.translate(x + chWidth / 2, y + jitterY)
      ctx.rotate(((index % 5) - 2) * 0.015)
      ctx.translate(-(x + chWidth / 2), -(y + jitterY))
    }

    if (template.style === 'neon-soft') {
      ctx.shadowColor = template.shadowColor || 'rgba(80,160,255,0.5)'
      ctx.shadowBlur = 22
      if (template.titleStroke) {
        ctx.strokeStyle = template.titleStroke
        ctx.lineWidth = template.strokeWidth || 8
        ctx.strokeText(ch, x, y + jitterY)
      }
      ctx.fillStyle = fill
      ctx.fillText(ch, x, y + jitterY)
      ctx.shadowBlur = 0
    } else if (
      template.style === 'stroke-pop' ||
      template.style === 'clean-glow' ||
      template.style === 'poster' ||
      template.style === 'fresh'
    ) {
      if (template.shadowColor) {
        ctx.shadowColor = template.shadowColor
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 6
      }
      if (template.titleStroke) {
        ctx.strokeStyle = template.titleStroke
        ctx.lineWidth = template.strokeWidth || 12
        ctx.strokeText(ch, x, y + jitterY)
      }
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.fillStyle = fill
      ctx.fillText(ch, x, y + jitterY)
      if (template.style === 'stroke-pop' || template.style === 'fresh') {
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillText(ch, x, y + jitterY - 2)
        ctx.fillStyle = fill
        ctx.fillText(ch, x, y + jitterY)
      }
    } else if (template.style === 'scroll' || template.style === 'ink-brush') {
      ctx.shadowColor = template.shadowColor || 'transparent'
      ctx.shadowBlur = 3
      ctx.fillStyle = fill
      ctx.fillText(ch, x, y + jitterY)
    } else {
      ctx.shadowColor = template.shadowColor || 'transparent'
      ctx.shadowBlur = 0
      ctx.fillStyle = fill
      ctx.fillText(ch, x, y + jitterY)
    }
    ctx.restore()

    cursor += chWidth + chWidth * template.letterSpacing
  })
}

function drawSideMarks(
  ctx: CanvasRenderingContext2D,
  template: CoverTemplate,
  width: number,
  height: number,
) {
  if (template.sideMarks === false) return
  ctx.save()
  if (template.tone === 'warm') {
    ctx.strokeStyle = 'rgba(140,70,40,0.22)'
  } else {
    ctx.strokeStyle = 'rgba(70,110,160,0.25)'
  }
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(width * 0.28, height * 0.22)
  ctx.lineTo(width * 0.72, height * 0.22)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width * 0.34, height * 0.78)
  ctx.lineTo(width * 0.66, height * 0.78)
  ctx.stroke()
  ctx.restore()
}

export function renderTitleCover(options: {
  title: string
  subtitle?: string
  templateId: CoverTemplateId
  width?: number
  height?: number
}): HTMLCanvasElement {
  const width = options.width ?? 1080
  const height = options.height ?? 1440
  const template =
    COVER_TEMPLATES.find((item) => item.id === options.templateId) || COVER_TEMPLATES[0]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  template.background(ctx, width, height)
  drawSideMarks(ctx, template, width, height)

  ctx.textBaseline = 'top'
  ctx.font = `${template.fontWeight} ${template.fontSize}px ${template.fontFamily}`

  const title = (options.title || '未命名标题').trim()
  const contentWidth = template.id === 'scroll-book' ? width * 0.62 : width * 0.78
  const lineHeight = Math.round(template.fontSize * template.lineHeightRatio)
  const lines = wrapTitleLines(ctx, title, contentWidth, template.letterSpacing, 4)

  const blockHeight = lines.length * lineHeight
  let y = height * template.titleTopRatio - blockHeight * 0.15
  y = Math.max(height * 0.24, Math.min(y, height * 0.48))

  const originX = template.align === 'center' ? width / 2 : width * 0.14
  for (const line of lines) {
    drawSpacedFancyLine(ctx, line, originX, y, template, lineHeight, template.align)
    y += lineHeight
  }

  if (options.subtitle?.trim()) {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.fillStyle = template.subColor
    ctx.font = `500 34px ${DISPLAY_STACK}`
    const sub = options.subtitle.trim()
    const subWidth = measureSpacedWidth(ctx, sub, 0.18)
    const sx = (width - subWidth) / 2
    const subY = template.id === 'scroll-book' ? height * 0.74 : height * 0.82
    let cursor = sx
    for (const ch of [...sub]) {
      ctx.fillText(ch, cursor, subY)
      const w = ctx.measureText(ch).width
      cursor += w + w * 0.18
    }
  }

  return canvas
}

export async function renderTitleCoverAsync(options: {
  title: string
  subtitle?: string
  templateId: CoverTemplateId
  width?: number
  height?: number
}): Promise<HTMLCanvasElement> {
  await ensureCoverFonts()
  return renderTitleCover(options)
}

export async function downloadCoverPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  )
  if (!blob) throw new Error('封面导出失败')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
