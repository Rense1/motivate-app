'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TutorialTooltipProps {
  visible: boolean
  message: string
  /** 'up' = tail points up (shown below button), 'down' = tail points down (shown above button) */
  arrowDir?: 'up' | 'down'
  className?: string
}

export function TutorialTooltip({ visible, message, arrowDir = 'down', className = '' }: TutorialTooltipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: arrowDir === 'down' ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={`pointer-events-none z-50 ${className}`}
        >
          <div
            className="relative px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-xl"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', whiteSpace: 'nowrap' }}
          >
            {message}
            {arrowDir === 'down' && (
              <span
                className="absolute left-1/2 -translate-x-1/2 -bottom-2"
                style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #b91c1c' }}
              />
            )}
            {arrowDir === 'up' && (
              <span
                className="absolute left-1/2 -translate-x-1/2 -top-2"
                style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #ef4444' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface TutorialPulseProps {
  visible: boolean
}

export function TutorialPulse({ visible }: TutorialPulseProps) {
  if (!visible) return null
  return (
    <motion.span
      className="absolute inset-0 rounded-2xl pointer-events-none z-10"
      animate={{ boxShadow: ['0 0 0 0px rgba(239,68,68,0.7)', '0 0 0 10px rgba(239,68,68,0)'] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
    />
  )
}

interface MilestoneTutorialBannerProps {
  visible: boolean
  message: string
  hint: string
  tapAction: string
  onDismiss: () => void
}

export function MilestoneTutorialBanner({ visible, message, hint, tapAction, onDismiss }: MilestoneTutorialBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-20 left-0 right-0 flex flex-col items-center px-4 gap-2 pointer-events-none"
          style={{ zIndex: 58 }}
        >
          {/* Bouncing arrow pointing UP at the card above */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none"
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <motion.path
                d="M18 28 L18 4 M18 4 L8 14 M18 4 L28 14"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{ filter: 'drop-shadow(0 2px 6px rgba(185,28,28,0.7))' }}
              />
            </svg>
          </motion.div>

          {/* Banner card */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="pointer-events-auto max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' }}
            onClick={onDismiss}
          >
            <div className="px-5 py-4 flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -15, 15, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
                className="text-2xl flex-shrink-0"
              >
                👆
              </motion.div>
              <div className="flex-1">
                <p className="text-white font-bold text-base">{message}</p>
                <p className="text-white/70 text-xs mt-0.5">{hint}</p>
              </div>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="text-white/60 text-xs font-bold"
              >
                {tapAction}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface TutorialBlockingOverlayProps {
  visible: boolean
  onSkip: () => void
  skipLabel: string
}

export function TutorialBlockingOverlay({ visible, onSkip, skipLabel }: TutorialBlockingOverlayProps) {
  if (!visible) return null
  return (
    <>
      {/* Semi-transparent dim layer — blocks all pointer events */}
      <div
        className="fixed inset-0 pointer-events-auto"
        style={{ background: 'rgba(0,0,0,0.45)', zIndex: 48 }}
        onClick={e => e.stopPropagation()}
      />
      {/* Skip button — rendered above the overlay */}
      <button
        onClick={onSkip}
        className="fixed top-4 right-4 pointer-events-auto bg-white/90 backdrop-blur text-gray-700 font-semibold text-sm px-4 py-2 rounded-full shadow-lg"
        style={{ zIndex: 65 }}
      >
        {skipLabel}
      </button>
    </>
  )
}
