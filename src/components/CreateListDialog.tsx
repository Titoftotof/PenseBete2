import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { X, ShoppingCart, CheckSquare, Lightbulb, FileText } from 'lucide-react'
import { useListStore } from '@/stores/listStore'
import type { ListCategory } from '@/types'

interface CreateListDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultCategory?: ListCategory
}

const categories: { id: ListCategory; label: string; icon: React.ReactNode; gradient: string }[] = [
  { id: 'shopping', label: 'Courses', icon: <ShoppingCart className="h-5 w-5" />, gradient: 'from-green-400 to-emerald-500' },
  { id: 'tasks', label: 'Tâches', icon: <CheckSquare className="h-5 w-5" />, gradient: 'from-blue-400 to-indigo-500' },
  { id: 'ideas', label: 'Idées', icon: <Lightbulb className="h-5 w-5" />, gradient: 'from-yellow-400 to-orange-500' },
  { id: 'notes', label: 'Notes', icon: <FileText className="h-5 w-5" />, gradient: 'from-purple-400 to-pink-500' },
]

export function CreateListDialog({ isOpen, onClose, defaultCategory }: CreateListDialogProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ListCategory>(defaultCategory || 'shopping')
  const { createList, loading } = useListStore()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const list = await createList(name.trim(), category)
    if (list) {
      setName('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <GlassCard className="w-full max-w-md" hover={false}>
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-xl">Nouvelle liste</GlassCardTitle>
          <Button variant="glass" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </GlassCardHeader>
        <GlassCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Nom de la liste"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={loading}
                className="glass-input h-12 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    category === cat.id
                      ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white shadow-md`}>
                    {cat.icon}
                  </div>
                  <span className="text-sm font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="glass"
                className="flex-1 h-12 rounded-xl"
                onClick={onClose}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
