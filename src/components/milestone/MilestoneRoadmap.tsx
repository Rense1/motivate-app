'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Lock, Crown, CheckCircle2, Key } from 'lucide-react'
import { deadlineBadge } from '@/lib/taskUtils'
import { getMilestoneRank, isMilestoneLocked, RANK_META, RANK_BG } from '@/lib/progressUtils'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnimationStore } from '@/stores/animationStore'
import { useHaptic } from '@/hooks/useHaptic'
import AchievementOverlay from './AchievementOverlay'

// ── Props ──────────────────────────────────────────────────────────────────
interface MilestoneRoadmapProps {
  milestones: Milestone[]
  goalId: string
  /** 最終目標のタイトル（金カードに表示） */
  goalTitle: string
  visionImageUrl?: string | null
  onMilestoneUpdate: (id: string, updates: Partial<Milestone>) => void
  /** 中央に表示されているカードの visual index が変わったときのコールバック */
  onActiveIndexChange?: (visualIndex: number) => void
}

// ── カードのアニメーションバリアント ──────────────────────────────────────
const cardVariants = {
  inactive: {
    scale: 0.84,
    opacity: 0.45,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
  active: {
    scale: 1.0,
    opacity: 1.0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
  popping: {
    scale: [1.0, 1.14, 0.96, 1.02, 1.0] as number[],
    opacity: 1.0,
    transition: {
      scale: { duration: 0.38, times: [0, 0.28, 0.62, 0.82, 1.0], ease: 'easeOut' as const },
      opacity: { duration: 0.05 },
    },
  },
}

// ── ロードのつなぎ点（スゴロクの道） ──────────────────────────────────────
function RoadDots({ green }: { green: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 5, padding: '4px 0' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ scale: green ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.4, delay: i * 0.05, repeat: 0 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: green ? '#22c55e' : '#d1d5db',
            opacity: green ? 0.95 : 0.5,
          }}
        />
      ))}
    </div>
  )
}

// ── 達成スタンプ（カード上のアニメーション） ──────────────────────────────
function AchievementStamp() {
  return (
    <motion.div
      initial={{ scale: 2.8, opacity: 0, rotate: -18 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 16 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 16 }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '5px solid rgba(255,255,255,0.92)',
          background: 'rgba(22,163,74,0.78)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <CheckCircle2 style={{ width: 42, height: 42, color: 'white' }} />
        <span style={{ fontSize: 14, fontWeight: 900, color: 'white', letterSpacing: '0.5px' }}>
          達成！
        </span>
      </div>
    </motion.div>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────────────
export default function MilestoneRoadmap({
  milestones,
  goalId,
  goalTitle,
  visionImageUrl,
  onMilestoneUpdate,
  onActiveIndexChange,
}: MilestoneRoadmapProps) {
  const router = useRouter()
  const supabase = createClient()
  const pushAnimation = useAnimationStore((s) => s.push)
  const haptic = useHaptic()

  // ── スクロール / アクティブ管理 ──────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── アニメーション状態管理 ──────────────────────────────────────────
  /** カードポップアニメーション中のマイルストーン ID */
  const [poppingId, setPoppingId] = useState<string | null>(null)
  /** ロック解除アニメーション中のマイルストーン ID */
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  /** 解除後グロー中のマイルストーン ID */
  const [glowingId, setGlowingId] = useState<string | null>(null)
  /** 新着達成スタンプを表示中のマイルストーン ID セット */
  const [newlyAchievedIds, setNewlyAchievedIds] = useState<Set<string>>(new Set())
  /** ゴールカード達成フラグ（ゴールカードのボタン用） */
  const [goalCardTriggered, setGoalCardTriggered] = useState(false)

  // ── ボタン DOM 参照 ──────────────────────────────────────────────────
  const achieveBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const crownCounterRef = useRef<HTMLDivElement>(null)
  const goalAchieveBtnRef = useRef<HTMLButtonElement>(null)

  // ── やる理由の先頭文キャッシュ ───────────────────────────────────────
  const [firstReasonMap, setFirstReasonMap] = useState<Record<string, string>>({})

  const total = milestones.length

  // キーゲージ: 達成済みマイルストーン数 / 全マイルストーン数
  const keys = milestones.filter((m) => m.is_achieved).length
  const maxKeys = total
  const hasCrown = maxKeys > 0 && keys >= maxKeys

  // 達成率（0.0 〜 1.0）
  const achievedPercent = total > 0 ? keys / total : 0

  // 達成率に応じた背景グラデーション（暗→明るい暖色）
  const scrollBg = useMemo(() => {
    const h = 220 - achievedPercent * 200 // 220(冷) → 20(暖)
    const s = 5 + achievedPercent * 18
    const l = 96 - achievedPercent * 4
    return `linear-gradient(180deg, hsl(${h},${s}%,${l}%) 0%, hsl(${h + 10},${s + 6}%,${l - 2}%) 100%)`
  }, [achievedPercent])

  /*
   * ビジュアルインデックスとオリジナルインデックスの対応:
   *   vi=0          : 最終目標カード（金、合成カード）
   *   vi=1          : milestones[total-1]  （最終目標直前のマイルストーン）
   *   vi=total      : milestones[0]        （最初のマイルストーン）
   */
  const totalVisual = total + 1

  // ── やる理由を一括取得 ────────────────────────────────────────────────
  useEffect(() => {
    if (total === 0) return
    const ids = milestones.map((m) => m.id)
    supabase
      .from('milestone_reasons')
      .select('milestone_id, reason, order_index')
      .in('milestone_id', ids)
      .order('order_index')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const row of data) {
          if (!(row.milestone_id in map)) map[row.milestone_id] = row.reason
        }
        setFirstReasonMap(map)
      })
  }, [milestones.map((m) => m.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── マウント時に現在のマイルストーンへスクロール ─────────────────────
  useEffect(() => {
    const firstNonAchievedOrig = milestones.findIndex((m) => !m.is_achieved)
    const targetVI = firstNonAchievedOrig === -1 ? 0 : total - firstNonAchievedOrig

    setActiveIndex(targetVI)
    onActiveIndexChange?.(targetVI)

    setTimeout(() => {
      const card = cardRefs.current[targetVI]
      const c = containerRef.current
      if (card && c) {
        c.scrollTop = card.offsetTop + card.offsetHeight / 2 - c.clientHeight / 2
      }
    }, 60)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── スクロール中のアクティブカード検出 ──────────────────────────────
  const updateActiveIndex = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const center = c.scrollTop + c.clientHeight / 2
    let closest = 0
    let minDist = Infinity
    cardRefs.current.forEach((card, i) => {
      if (!card) return
      const dist = Math.abs(card.offsetTop + card.offsetHeight / 2 - center)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    setActiveIndex((prev) => {
      if (prev !== closest) setTimeout(() => onActiveIndexChange?.(closest), 0)
      return closest
    })
  }, [onActiveIndexChange])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.addEventListener('scroll', updateActiveIndex, { passive: true })
    return () => c.removeEventListener('scroll', updateActiveIndex)
  }, [milestones, updateActiveIndex])

  // ── 特定の vi のカードへスムーズスクロール ───────────────────────────
  const scrollToCardAtVI = useCallback((vi: number) => {
    const card = cardRefs.current[vi]
    const c = containerRef.current
    if (!card || !c) return
    const targetScrollTop = card.offsetTop + card.offsetHeight / 2 - c.clientHeight / 2
    c.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }, [])

  // ── カードタップ → タスク画面へ遷移 ─────────────────────────────────
  function handleCardTap(milestone: Milestone, locked: boolean) {
    if (locked) return
    router.push(`/tasks?goalId=${goalId}&milestoneId=${milestone.id}`)
  }

  // ── 達成トグル ────────────────────────────────────────────────────────
  async function toggleAchieved(
    milestone: Milestone,
    originalIndex: number,
    btnEl: HTMLButtonElement | null,
  ) {
    const newVal = !milestone.is_achieved

    if (newVal) {
      // ── 即時 UI フィードバック ────────────────────────────────────
      haptic.medium()
      setPoppingId(milestone.id)
      setTimeout(() => setPoppingId(null), 420)
    }

    await supabase
      .from('milestones')
      .update({ is_achieved: newVal, achieved_at: newVal ? new Date().toISOString() : null })
      .eq('id', milestone.id)

    onMilestoneUpdate(milestone.id, {
      is_achieved: newVal,
      achieved_at: newVal ? new Date().toISOString() : null,
    })

    if (newVal) {
      const newAchievedCount = milestones.filter((m) => m.is_achieved).length + 1
      const isFinal = newAchievedCount >= total

      const buttonRect = btnEl?.getBoundingClientRect() ?? null
      const crownRect = crownCounterRef.current?.getBoundingClientRect() ?? null

      if (buttonRect) {
        pushAnimation({
          type: 'achievement',
          milestoneId: milestone.id,
          isFinal,
          buttonRect,
          crownCounterRect: crownRect,
        })
      }

      // ── 達成スタンプを一時表示 ─────────────────────────────────────
      setNewlyAchievedIds((prev) => new Set([...prev, milestone.id]))
      setTimeout(() => {
        setNewlyAchievedIds((prev) => {
          const next = new Set(prev)
          next.delete(milestone.id)
          return next
        })
      }, 1800)

      // ── 次マイルストーンのロック解除アニメーション ────────────────
      if (originalIndex + 1 < total) {
        const nextMilestone = milestones[originalIndex + 1]
        // ロック破壊（650ms）
        setUnlockingId(nextMilestone.id)
        setTimeout(() => {
          setUnlockingId(null)
          // グロー（1.3s）
          setGlowingId(nextMilestone.id)
          setTimeout(() => setGlowingId(null), 1300)
        }, 680)
      }

      // ── 達成後に次のカードへスムーズスクロール ────────────────────
      const nextVI = total - originalIndex - 1 // 次のマイルストーン or 0（ゴールカード）
      setTimeout(() => scrollToCardAtVI(Math.max(0, nextVI)), 520)

      // 全達成時はゴールカードへスクロール
      if (isFinal) {
        setTimeout(() => scrollToCardAtVI(0), 2800)
      }
    }
  }

  // ── ゴールカードの「目標を達成した！」ボタン ──────────────────────────
  function handleGoalCardAchieve(btnEl: HTMLButtonElement | null) {
    if (goalCardTriggered) return
    haptic.heavy()
    setGoalCardTriggered(true)
    const buttonRect = btnEl?.getBoundingClientRect() ?? null
    const crownRect = crownCounterRef.current?.getBoundingClientRect() ?? null
    if (buttonRect) {
      pushAnimation({
        type: 'achievement',
        milestoneId: 'goal-final',
        isFinal: true,
        buttonRect,
        crownCounterRect: crownRect,
      })
    }
  }

  // ── マイルストーンがない場合 ──────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center pb-20">
        <p className="text-gray-400 text-sm">マイルストーンを追加してください</p>
      </div>
    )
  }

  const goldMeta = RANK_META[5]

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── キーゲージ ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
          <div
            ref={crownCounterRef}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: '#fefce8', border: '1.5px solid #fde047' }}
          >
            <Key className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-black text-yellow-700">{keys}/{maxKeys}</span>
          </div>

          {/* 進捗バー */}
          <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
            <motion.div
              animate={{ width: `${achievedPercent * 100}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              style={{
                height: '100%',
                borderRadius: 99,
                background: hasCrown
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              }}
            />
          </div>

          {/* 全達成時に王冠を表示 */}
          <motion.div
            animate={{ opacity: hasCrown ? 1 : 0.22, scale: hasCrown ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-1.5"
          >
            <Crown className="w-5 h-5" style={{ color: hasCrown ? '#eab308' : '#9ca3af' }} />
            {hasCrown && (
              <span className="text-xs font-bold text-yellow-600 whitespace-nowrap">王冠獲得！</span>
            )}
          </motion.div>
        </div>

        {/* ── スクロールエリア ────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll"
          style={{
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            background: scrollBg,
            transition: 'background 1.5s ease',
          }}
        >
          {/* 上部の余白 */}
          <div style={{ height: 'calc(50vh - 230px)', flexShrink: 0 }} />

          {/* ── vi=0: 最終目標カード（金・合成）────────────────────── */}
          <div>
            <div
              ref={(el) => { cardRefs.current[0] = el }}
              className="px-5"
              style={{ scrollSnapAlign: 'center' }}
            >
              <motion.div
                animate={{
                  scale: activeIndex === 0 ? 1.0 : 0.84,
                  opacity: activeIndex === 0 ? 1 : 0.45,
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                style={{
                  boxShadow:
                    activeIndex === 0
                      ? `0 32px 64px ${goldMeta.glow}, 0 12px 32px rgba(0,0,0,0.14)`
                      : '0 4px 16px rgba(0,0,0,0.06)',
                  borderRadius: 28,
                  border: hasCrown ? '3px solid #22c55e' : goldMeta.border,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="relative flex flex-col justify-between p-8 select-none"
                  style={{ minHeight: 280 }}
                >
                  <div className="absolute inset-0" style={{ background: RANK_BG[5] }} />
                  {visionImageUrl && (
                    <>
                      <img
                        src={visionImageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50" />
                    </>
                  )}
                  <div className="absolute rounded-full bg-white/5" style={{ width: 200, height: 200, top: -50, right: -50 }} />
                  <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />

                  <div className="relative flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      最終目標
                    </span>
                    <motion.div
                      animate={hasCrown ? { rotate: [0, -12, 12, -8, 0], scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    >
                      <Crown className="w-6 h-6 text-yellow-400" />
                    </motion.div>
                  </div>

                  <div className="relative flex-1 flex flex-col justify-center py-4">
                    <h2
                      className="font-bold leading-tight text-white"
                      style={{ fontSize: 'clamp(22px, 6.5vw, 34px)' }}
                    >
                      {goalTitle}
                    </h2>
                    {hasCrown && (
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm font-bold mt-2"
                        style={{ color: '#86efac' }}
                      >
                        🎉 すべてのマイルストーンを達成しました！
                      </motion.p>
                    )}
                  </div>

                  <div className="relative">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {hasCrown
                        ? 'あなたは目標を達成しました'
                        : 'すべてのマイルストーンを達成してここに到達しよう'}
                    </p>
                  </div>
                </div>

                {/* ゴールカード「目標を達成した！」ボタン
                    ・全マイルストーン未達成時はグレーアウト（押せない）
                    ・1回押したら「達成済み」表示に切り替わる */}
                <motion.button
                  ref={goalAchieveBtnRef}
                  onClick={() => {
                    if (hasCrown && !goalCardTriggered) {
                      handleGoalCardAchieve(goalAchieveBtnRef.current)
                    }
                  }}
                  whileTap={hasCrown && !goalCardTriggered ? { scale: 1.06 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  disabled={!hasCrown || goalCardTriggered}
                  className="w-full py-3.5 text-sm font-bold transition-colors"
                  style={{
                    minHeight: 52,
                    background: goalCardTriggered
                      ? '#fef9c3'
                      : hasCrown
                      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      : 'rgba(255,255,255,0.12)',
                    color: goalCardTriggered
                      ? '#92400e'
                      : hasCrown
                      ? 'white'
                      : 'rgba(255,255,255,0.35)',
                    cursor: hasCrown && !goalCardTriggered ? 'pointer' : 'default',
                    letterSpacing: '0.3px',
                  }}
                >
                  {goalCardTriggered
                    ? '👑 目標達成！おめでとう！'
                    : hasCrown
                    ? '🎯 目標を達成した！'
                    : `🔒 残り ${maxKeys - keys} 個のマイルストーンを達成しよう`}
                </motion.button>
              </motion.div>
            </div>

            {/* 最終目標と直前マイルストーンを繋ぐ道 */}
            <div className="flex justify-center py-1">
              <RoadDots green={milestones[total - 1]?.is_achieved ?? false} />
            </div>
          </div>

          {/* ── vi=1..total: マイルストーンカード（逆順で上から表示） ── */}
          {[...milestones].reverse().map((milestone, revIdx) => {
            const originalIndex = total - 1 - revIdx
            const visualIndex = revIdx + 1

            const rank = getMilestoneRank(originalIndex, total + 1)
            const locked = isMilestoneLocked(originalIndex, milestones)
            const isActive = visualIndex === activeIndex
            const isPopping = poppingId === milestone.id
            const isUnlocking = unlockingId === milestone.id
            const isGlowing = glowingId === milestone.id
            const isNewlyAchieved = newlyAchievedIds.has(milestone.id)
            const meta = RANK_META[rank]

            const bgColor = milestone.is_achieved ? '#15803d' : locked ? '#1f2937' : RANK_BG[rank]

            const reason = firstReasonMap[milestone.id]

            const hasNextCard = visualIndex < total
            const nextMilestone = hasNextCard ? milestones[originalIndex - 1] : null
            const lineGreen = nextMilestone
              ? milestone.is_achieved && nextMilestone.is_achieved
              : false

            // カードの variant を決定
            const cardVariant: keyof typeof cardVariants = isPopping
              ? 'popping'
              : isActive
              ? 'active'
              : 'inactive'

            return (
              <div key={milestone.id}>
                <div
                  ref={(el) => { cardRefs.current[visualIndex] = el }}
                  className="px-5"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {/* Framer Motion カードラッパー */}
                  <motion.div
                    variants={cardVariants}
                    animate={cardVariant}
                    style={{
                      boxShadow: isActive
                        ? milestone.is_achieved
                          ? '0 32px 64px rgba(22,163,74,0.28), 0 12px 32px rgba(0,0,0,0.14)'
                          : `0 32px 64px ${meta.glow}, 0 12px 32px rgba(0,0,0,0.14)`
                        : '0 4px 16px rgba(0,0,0,0.06)',
                      borderRadius: 28,
                      border: milestone.is_achieved ? '3px solid #22c55e' : meta.border,
                      overflow: 'hidden',
                    }}
                  >
                    {/* カード本体（タップでタスク画面へ） */}
                    <div
                      className="relative flex flex-col justify-between p-8 select-none"
                      style={{ minHeight: 280, cursor: locked ? 'default' : 'pointer' }}
                      onClick={() => handleCardTap(milestone, locked)}
                    >
                      <div className="absolute inset-0" style={{ background: bgColor }} />

                      {/* ビジョン画像 */}
                      {visionImageUrl && !locked && !milestone.is_achieved && (
                        <>
                          <img
                            src={visionImageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/55" />
                        </>
                      )}

                      {/* 装飾用の円 */}
                      <div className="absolute rounded-full bg-white/5" style={{ width: 200, height: 200, top: -50, right: -50 }} />
                      <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />

                      {/* ── 解錠グロー ──────────────────────────────── */}
                      <AnimatePresence>
                        {isGlowing && (
                          <motion.div
                            key={`glow-${milestone.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.75, 0.55, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 1.3,
                              times: [0, 0.2, 0.6, 1],
                              ease: 'easeOut',
                            }}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.4) 40%, transparent 75%)',
                              borderRadius: 28,
                              zIndex: 12,
                            }}
                          />
                        )}
                      </AnimatePresence>

                      {/* ── 達成スタンプ（新着達成時のみ） ─────────── */}
                      <AnimatePresence>
                        {isNewlyAchieved && <AchievementStamp key={`stamp-${milestone.id}`} />}
                      </AnimatePresence>

                      {/* ヘッダー行 */}
                      <div className="relative flex items-start justify-between">
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: locked ? '#6b7280' : 'rgba(255,255,255,0.65)' }}
                        >
                          {meta.label || `ステップ ${originalIndex + 1}/${total}`}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          {!locked && (() => {
                            const badge = deadlineBadge(milestone.deadline)
                            if (!badge) return null
                            return (
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  badge.urgent
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : 'bg-white/20 text-white'
                                }`}
                              >
                                {badge.text}
                              </span>
                            )
                          })()}
                          {milestone.is_achieved && (
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>

                      {/* タイトル + やる理由 */}
                      <div className="relative flex-1 flex flex-col justify-center py-4 gap-2">
                        <h2
                          className="font-bold leading-tight"
                          style={{
                            fontSize: 'clamp(22px, 6.5vw, 34px)',
                            color: locked ? '#4b5563' : 'white',
                          }}
                        >
                          {milestone.title}
                        </h2>
                        {!locked && (
                          <p
                            style={{
                              fontSize: 12,
                              color: reason
                                ? 'rgba(255,255,255,0.72)'
                                : 'rgba(255,255,255,0.38)',
                              fontStyle: reason ? 'normal' : 'italic',
                              lineHeight: 1.4,
                            }}
                          >
                            {reason || 'タスク管理画面でやる理由を設定'}
                          </p>
                        )}
                      </div>

                      {/* フッターヒント */}
                      <div className="relative">
                        <p
                          className="text-xs"
                          style={{ color: locked ? '#4b5563' : 'rgba(255,255,255,0.4)' }}
                        >
                          {locked
                            ? 'ひとつ前のマイルストーンを達成すると解放されます'
                            : 'タップでタスクを管理'}
                        </p>
                      </div>

                      {/* ── ロックオーバーレイ（解錠時にアニメーション）─ */}
                      <AnimatePresence>
                        {locked && (
                          <motion.div
                            key="lock-overlay"
                            initial={{ opacity: 1 }}
                            animate={isUnlocking ? { opacity: 0 } : { opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.55, ease: 'easeOut', delay: isUnlocking ? 0.35 : 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.72)', borderRadius: 28 }}
                          >
                            <motion.div
                              animate={
                                isUnlocking
                                  ? {
                                      scale: [1, 0.85, 1.5, 1.8, 0],
                                      rotate: [0, -18, 24, 48, 72],
                                      opacity: [1, 1, 0.7, 0.3, 0],
                                      filter: [
                                        'brightness(1)',
                                        'brightness(1)',
                                        'brightness(3)',
                                        'brightness(4)',
                                        'brightness(1)',
                                      ],
                                    }
                                  : { scale: 1, rotate: 0, opacity: 1 }
                              }
                              transition={{
                                duration: 0.62,
                                times: isUnlocking ? [0, 0.18, 0.45, 0.72, 1] : undefined,
                                ease: 'easeOut',
                              }}
                            >
                              <Lock
                                className="w-12 h-12"
                                style={{ color: 'rgba(255,255,255,0.55)' }}
                              />
                            </motion.div>
                            {/* ロック破壊フラッシュ */}
                            {isUnlocking && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.5, 0] }}
                                transition={{ duration: 0.4, delay: 0.25, times: [0, 0.3, 1] }}
                                className="absolute inset-0"
                                style={{ background: 'white', borderRadius: 28 }}
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── 達成ボタン ──────────────────────────────────── */}
                    {!locked && (
                      <motion.button
                        ref={(el) => { achieveBtnRefs.current[originalIndex] = el }}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAchieved(
                            milestone,
                            originalIndex,
                            achieveBtnRefs.current[originalIndex],
                          )
                        }}
                        whileTap={!milestone.is_achieved ? { scale: 1.06 } : undefined}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        className={`w-full py-3.5 text-sm font-bold transition-colors ${
                          milestone.is_achieved
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        style={{ minHeight: 52 }}
                      >
                        {milestone.is_achieved ? '✓ 達成済み' : '🏆 達成する'}
                      </motion.button>
                    )}
                  </motion.div>
                </div>

                {/* カード間の道（ドット） */}
                {hasNextCard && (
                  <div className="flex justify-center py-1">
                    <RoadDots green={lineGreen} />
                  </div>
                )}
              </div>
            )
          })}

          {/* 下部の余白 */}
          <div style={{ height: 'calc(50vh - 230px)', flexShrink: 0 }} />
        </div>

        {/* ── 進捗ドット（画面下部のページインジケーター） ──────────── */}
        {totalVisual > 1 && (
          <div className="flex justify-center gap-2 py-3 flex-shrink-0 bg-white/60 backdrop-blur-sm">
            {/* 金カード用ドット */}
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: activeIndex === 0 ? 22 : 6,
                height: 6,
                background:
                  activeIndex === 0
                    ? goldMeta.color
                    : hasCrown
                    ? '#22c55e'
                    : '#d1d5db',
              }}
            />
            {/* マイルストーン用ドット */}
            {milestones.map((m, origI) => {
              const rank = getMilestoneRank(origI, total + 1)
              const vi = total - origI
              const isActiveDot = vi === activeIndex
              return (
                <div
                  key={m.id}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: isActiveDot ? 22 : 6,
                    height: 6,
                    background: isActiveDot
                      ? m.is_achieved
                        ? '#22c55e'
                        : RANK_META[rank].color
                      : m.is_achieved
                      ? '#22c55e'
                      : '#d1d5db',
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ── アチーブメントオーバーレイ ──────────────────────────────── */}
      <AchievementOverlay />
    </>
  )
}
