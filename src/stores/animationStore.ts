import { create } from 'zustand'

// イベントごとに一意の ID を振るカウンター（同じマイルストーンを 2 回連続達成しても別イベントとして扱う）
let _nextId = 0

// ── イベント型定義 ─────────────────────────────────────────────────────────
export type AnimationEvent =
  | {
      id: number
      type: 'achievement'
      milestoneId: string
      /** 全マイルストーン達成（王冠獲得）かどうか */
      isFinal: boolean
      /** 「達成する」ボタンの画面上の位置（パーティクル起点） */
      buttonRect: DOMRect
      /** キーゲージ（王冠カウンター）の位置（王冠の飛び先） */
      crownCounterRect: DOMRect | null
    }
  | {
      id: number
      type: 'lockBreak'
      milestoneId: string
    }

// Union 型に対して Omit を分配させるユーティリティ
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

// ── ストア型定義 ───────────────────────────────────────────────────────────
interface AnimationStore {
  /** 処理待ちアニメーションのキュー */
  queue: AnimationEvent[]
  /** キューにイベントを追加する（id は自動採番） */
  push: (event: DistributiveOmit<AnimationEvent, 'id'>) => void
  /** 先頭イベントをキューから取り出す */
  shift: () => void
  /** キューを全クリアする */
  clear: () => void
}

export const useAnimationStore = create<AnimationStore>((set) => ({
  queue: [],
  push: (event) =>
    set((s) => ({
      queue: [...s.queue, { ...event, id: ++_nextId } as AnimationEvent],
    })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}))
