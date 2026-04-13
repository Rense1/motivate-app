'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { useAnimationStore } from '@/stores/animationStore'

// ── パーティクル型 ────────────────────────────────────────────────────────
interface Particle {
  id: number
  x: number
  y: number
  color: string
  angle: number
  distance: number
  size: number
  /** 形状: circle / diamond / rect */
  shape: 'circle' | 'diamond' | 'rect'
}

// ── 紙吹雪の欠片型 ───────────────────────────────────────────────────────
interface ConfettiPiece {
  id: number
  /** 落下開始の横位置（vw 単位、0–100） */
  x: number
  delay: number
  color: string
  size: number
  rotate: number
  /** 形状: rect / circle / diamond */
  shape: 'rect' | 'circle' | 'diamond'
}

// ── 大王冠（最終達成専用）の状態 ─────────────────────────────────────────
interface BigCrownState {
  key: number
  /** ボタン位置（飛翔起点） */
  fromX: number
  fromY: number
}

// ── 王冠飛翔の状態 ──────────────────────────────────────────────────────
interface CrownAnimState {
  key: number
  fromX: number
  fromY: number
  midX: number
  midY: number
  toX: number
  toY: number
}

// ── バーストリングの状態 ─────────────────────────────────────────────────
interface BurstRingState {
  key: number
  x: number
  y: number
}

// ── カラーパレット ───────────────────────────────────────────────────────
const PARTICLE_COLORS = [
  '#fbbf24', '#f59e0b', // ゴールド
  '#10b981', '#34d399', // グリーン
  '#ef4444', '#f87171', // レッド
  '#a78bfa', '#8b5cf6', // パープル
  '#38bdf8', '#0ea5e9', // スカイブルー
  '#fb923c', '#f97316', // オレンジ
]

const CONFETTI_COLORS = [
  '#fbbf24', '#fde047', // ゴールド
  '#22c55e', '#86efac', // グリーン
  '#f43f5e', '#fb7185', // ピンク
  '#818cf8', '#a5b4fc', // インディゴ
  '#fb923c', '#fdba74', // オレンジ
  '#e2e8f0', '#f8fafc', // ホワイト
]

// ── パーティクル生成 ──────────────────────────────────────────────────────
function generateParticles(cx: number, cy: number, count = 20): Particle[] {
  const shapes: Particle['shape'][] = ['circle', 'circle', 'circle', 'diamond', 'rect']
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: cx,
    y: cy,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    // 360度均等＋少しのランダムブレで自然に広がる
    angle: (360 / count) * i + (Math.random() * 16 - 8),
    distance: 70 + Math.random() * 80,
    size: 5 + Math.random() * 9,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }))
}

// ── 紙吹雪生成 ───────────────────────────────────────────────────────────
function generateConfetti(count = 48): ConfettiPiece[] {
  const shapes: ConfettiPiece['shape'][] = ['rect', 'rect', 'rect', 'circle', 'diamond']
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 7 + Math.random() * 12,
    rotate: Math.random() * 360,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }))
}

// ── パーティクル1個のインラインスタイル ──────────────────────────────────
function particleStyle(p: Particle): CSSProperties {
  const base: CSSProperties = {
    position: 'fixed',
    background: p.color,
    pointerEvents: 'none',
  }
  if (p.shape === 'diamond') {
    return { ...base, width: p.size, height: p.size, transform: 'rotate(45deg)' }
  }
  if (p.shape === 'rect') {
    return { ...base, width: p.size * 1.9, height: p.size * 0.65, borderRadius: 2 }
  }
  // circle
  return { ...base, width: p.size, height: p.size, borderRadius: '50%' }
}

// ── 紙吹雪1枚のインラインスタイル ────────────────────────────────────────
function confettiStyle(c: ConfettiPiece): CSSProperties {
  const base: CSSProperties = {
    position: 'fixed',
    background: c.color,
    pointerEvents: 'none',
  }
  if (c.shape === 'circle') {
    return { ...base, width: c.size, height: c.size, borderRadius: '50%' }
  }
  if (c.shape === 'diamond') {
    return { ...base, width: c.size, height: c.size, transform: 'rotate(45deg)' }
  }
  // rect
  return { ...base, width: c.size, height: c.size * 0.45, borderRadius: 2 }
}

// ── メインコンポーネント ──────────────────────────────────────────────────
export default function AchievementOverlay() {
  const { queue, shift } = useAnimationStore()
  const event = queue[0] ?? null

  // ── ローカルステート ─────────────────────────────────────────────────
  const [particles, setParticles] = useState<Particle[]>([])
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [showFinalText, setShowFinalText] = useState(false)
  const [bigCrown, setBigCrown] = useState<BigCrownState | null>(null)
  const [crownAnim, setCrownAnim] = useState<CrownAnimState | null>(null)
  const [burstRing, setBurstRing] = useState<BurstRingState | null>(null)

  // ── イベント処理 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!event || event.type !== 'achievement') return

    const { id, buttonRect, crownCounterRect, isFinal } = event

    // ボタン中心を起点とする
    const fromX = buttonRect.left + buttonRect.width / 2
    const fromY = buttonRect.top + buttonRect.height / 2

    // 王冠カウンターが取れなければ右上へ飛ばす
    const toX = crownCounterRect
      ? crownCounterRect.left + crownCounterRect.width / 2
      : window.innerWidth - 40
    const toY = crownCounterRect
      ? crownCounterRect.top + crownCounterRect.height / 2
      : 60

    // ── Phase 1: パーティクル + バーストリング ────────────────────────
    setParticles(generateParticles(fromX, fromY))
    setBurstRing({ key: id, x: fromX, y: fromY })

    if (isFinal) {
      // ── 最終達成シーケンス ────────────────────────────────────────

      // Phase 2: 大きな王冠がボタン位置に出現 → 画面中央へ膨らむ
      setBigCrown({ key: id, fromX, fromY })

      // Phase 3: 「獲得！」テキスト + 紙吹雪（0.75s 後）
      const timerText = setTimeout(() => {
        setShowFinalText(true)
        setConfetti(generateConfetti())
      }, 750)

      // Phase 4: テキスト消え + 大王冠消え + 王冠が counter へ飛翔（2.6s 後）
      const timerFly = setTimeout(() => {
        setShowFinalText(false)
        setBigCrown(null)
        // 中央付近から counter へ飛ぶ
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight * 0.32
        const midX = centerX + (toX - centerX) * 0.4
        const midY = Math.min(centerY, toY) - 80
        setCrownAnim({ key: id + 10000, fromX: centerX, fromY: centerY, midX, midY, toX, toY })
      }, 2600)

      // Cleanup（3.8s 後）
      const timerClean = setTimeout(() => {
        setParticles([])
        setCrownAnim(null)
        setBurstRing(null)
        setConfetti([])
        shift()
      }, 3800)

      return () => {
        clearTimeout(timerText)
        clearTimeout(timerFly)
        clearTimeout(timerClean)
      }
    } else {
      // ── 通常達成シーケンス ────────────────────────────────────────

      // ベジェ中間点: 弧を描かせるために上方向へオフセット
      const midX = fromX + (toX - fromX) * 0.45
      const midY = Math.min(fromY, toY) - 115
      setCrownAnim({ key: id, fromX, fromY, midX, midY, toX, toY })

      const timer = setTimeout(() => {
        setParticles([])
        setCrownAnim(null)
        setBurstRing(null)
        shift()
      }, 1350)

      return () => clearTimeout(timer)
    }
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 何も描画するものがなければ DOM に出力しない
  const hasContent =
    particles.length > 0 ||
    crownAnim !== null ||
    confetti.length > 0 ||
    showFinalText ||
    bigCrown !== null ||
    burstRing !== null

  if (!hasContent) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    >

      {/* ── バーストリング（Duolingo 風の拡張する輪） ─────────────────── */}
      <AnimatePresence>
        {burstRing && (
          <>
            {/* 外側のリング */}
            <motion.div
              key={`ring-outer-${burstRing.key}`}
              initial={{ scale: 0.1, opacity: 0.9, x: burstRing.x - 36, y: burstRing.y - 36 }}
              animate={{ scale: 4.5, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.2, 0, 0.6, 1] }}
              style={{
                position: 'fixed',
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '3.5px solid #fbbf24',
              }}
            />
            {/* 内側のリング（少し遅れて）*/}
            <motion.div
              key={`ring-inner-${burstRing.key}`}
              initial={{ scale: 0.1, opacity: 0.7, x: burstRing.x - 24, y: burstRing.y - 24 }}
              animate={{ scale: 3.0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0.6, 1], delay: 0.08 }}
              style={{
                position: 'fixed',
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '2.5px solid #f59e0b',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── パーティクルバースト ──────────────────────────────────────── */}
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180
          // 重力効果: y 方向に少し余分に落下させる
          const endX = p.x + Math.cos(rad) * p.distance - p.size / 2
          const endY = p.y + Math.sin(rad) * p.distance - p.size / 2 + 18
          return (
            <motion.div
              key={p.id}
              initial={{ x: p.x - p.size / 2, y: p.y - p.size / 2, opacity: 1, scale: 1 }}
              animate={{ x: endX, y: endY, opacity: 0, scale: 0.08 }}
              transition={{ duration: 0.78, ease: [0.15, 0.85, 0.4, 1] }}
              style={particleStyle(p)}
            />
          )
        })}
      </AnimatePresence>

      {/* ── 大王冠（最終達成時: ボタン位置 → 画面中央へ膨らむ） ──────── */}
      <AnimatePresence>
        {bigCrown && (
          <motion.div
            key={`bigcrown-${bigCrown.key}`}
            initial={{
              scale: 0,
              opacity: 0,
              x: bigCrown.fromX - 56,
              y: bigCrown.fromY - 56,
            }}
            animate={{
              scale: [0, 2.2, 1.9],
              opacity: [0, 1, 1],
              x: [bigCrown.fromX - 56, window.innerWidth / 2 - 56, window.innerWidth / 2 - 56],
              y: [
                bigCrown.fromY - 56,
                window.innerHeight * 0.3 - 56,
                window.innerHeight * 0.3 - 56 - 12,
              ],
            }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.28 } }}
            transition={{
              duration: 0.75,
              times: [0, 0.55, 1],
              ease: [0.34, 1.5, 0.64, 1],
            }}
            style={{
              position: 'fixed',
              width: 112,
              height: 112,
              filter:
                'drop-shadow(0 0 18px #fbbf24) drop-shadow(0 0 36px #f59e0b) drop-shadow(0 0 60px rgba(251,191,36,0.6))',
            }}
          >
            <Crown style={{ width: 112, height: 112, color: '#fbbf24' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 王冠飛翔（ベジェ曲線でキーゲージへ） ────────────────────── */}
      <AnimatePresence>
        {crownAnim && (
          <motion.div
            key={crownAnim.key}
            initial={{
              x: crownAnim.fromX - 20,
              y: crownAnim.fromY - 20,
              scale: 1,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              x: [crownAnim.fromX - 20, crownAnim.midX - 20, crownAnim.toX - 20],
              y: [crownAnim.fromY - 20, crownAnim.midY - 20, crownAnim.toY - 20],
              scale: [1, 1.45, 0.3],
              opacity: [1, 1, 0],
              rotate: [0, -14, 8],
            }}
            transition={{
              duration: 0.9,
              ease: [0.34, 0, 0.36, 1],
              times: [0, 0.52, 1],
            }}
            style={{ position: 'fixed' }}
          >
            <Crown
              style={{
                width: 40,
                height: 40,
                color: '#fbbf24',
                filter: 'drop-shadow(0 0 8px #fbbf24) drop-shadow(0 0 16px #f59e0b)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 全達成テキスト「👑 王冠獲得！」 ──────────────────────────── */}
      <AnimatePresence>
        {showFinalText && (
          <>
            {/* 背景の黒モヤ（テキストを見やすくする） */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'fixed', inset: 0, background: '#000' }}
            />
            {/* メインテキスト */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.12, y: -28 }}
              transition={{ type: 'spring', stiffness: 440, damping: 20 }}
              style={{
                position: 'fixed',
                top: '52%',
                left: '50%',
                translateX: '-50%',
                translateY: '-50%',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: 38,
                borderRadius: 26,
                padding: '22px 44px',
                boxShadow:
                  '0 8px 48px rgba(251,191,36,0.75), 0 2px 12px rgba(0,0,0,0.25)',
                zIndex: 10001,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Crown
                  style={{
                    width: 46,
                    height: 46,
                    color: 'white',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.22))',
                    flexShrink: 0,
                  }}
                />
                王冠獲得！
              </span>
            </motion.div>
            {/* サブテキスト */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              style={{
                position: 'fixed',
                top: 'calc(52% + 64px)',
                left: '50%',
                translateX: '-50%',
                color: 'rgba(255,255,255,0.88)',
                fontWeight: 700,
                fontSize: 16,
                zIndex: 10001,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              すべての目標を達成しました！
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 紙吹雪（全達成時のみ） ────────────────────────────────────── */}
      <AnimatePresence>
        {confetti.map((c) => (
          <motion.div
            key={c.id}
            initial={{
              x: `${c.x}vw`,
              y: -c.size * 2,
              rotate: c.rotate,
              opacity: 1,
            }}
            animate={{
              y: '112vh',
              rotate: c.rotate + 360 * (c.id % 2 === 0 ? 4 : -3),
              opacity: [1, 1, 1, 0.6, 0],
            }}
            transition={{
              duration: 2.3 + c.delay * 1.3,
              delay: c.delay,
              ease: 'linear',
              opacity: { times: [0, 0.5, 0.7, 0.88, 1] },
            }}
            style={confettiStyle(c)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
