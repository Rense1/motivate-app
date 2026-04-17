'use client'

import { Task } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Pencil, Bell } from 'lucide-react'
import { localizedFrequencyLabel } from '@/lib/taskUtils'
import { useI18n } from '@/lib/i18n'

interface TaskCardProps {
  task: Task
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  isEditing?: boolean
}

export default function TaskCard({ task, onDelete, onEdit, isEditing = false }: TaskCardProps) {
  const { t, lang } = useI18n()
  const supabase = createClient()

  async function handleDelete() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
  }

  return (
    <div
      className={`w-full select-none transition-all ${isEditing ? 'scale-[0.98] opacity-80' : 'active:scale-98'}`}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: isEditing
          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%)'
          : 'linear-gradient(135deg, #f87171 0%, #dc2626 60%, #b91c1c 100%)',
        boxShadow: isEditing
          ? '0 4px 16px rgba(217,119,6,0.25)'
          : '0 4px 16px rgba(185,28,28,0.18)',
      }}
    >
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-snug truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-block bg-white/20 text-white/90 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {localizedFrequencyLabel(task.frequency ?? (task.is_daily ? 'daily' : 'none'), t, lang, task.monthly_count, task.interval_value, task.interval_unit)}
            </span>
            {task.notification_enabled && (
              <span className="inline-flex items-center gap-1 bg-white/20 text-white/80 text-xs px-2 py-0.5 rounded-full">
                <Bell className="w-3 h-3" />
                {task.notification_time ?? ''}
              </span>
            )}
            {isEditing && (
              <span className="text-white/70 text-xs">{t('tasks.editingLabel')}</span>
            )}
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onEdit(task) }}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
          aria-label={t('tasks.edit')}
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={e => { e.stopPropagation(); handleDelete() }}
          className="p-1.5 text-white/50 hover:text-white transition-colors"
          aria-label={t('tasks.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
