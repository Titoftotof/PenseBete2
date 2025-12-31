import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { Share2, X, Users, Trash2, Mail } from 'lucide-react'
import { useShareStore, type SharePermission } from '@/stores/shareStore'
import type { List } from '@/types'

interface ShareDialogProps {
  list: List
  onClose: () => void
}

export function ShareDialog({ list, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('read')
  const { shares, fetchShares, shareList, updateSharePermission, removeShare, loading, error } = useShareStore()

  useEffect(() => {
    fetchShares(list.id)
  }, [list.id, fetchShares])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    const result = await shareList(list.id, email.trim(), permission)
    if (result) {
      setEmail('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md" hover={false}>
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2 text-xl">
            <Share2 className="h-5 w-5 text-purple-500" />
            Partager "{list.name}"
          </GlassCardTitle>
          <Button variant="glass" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {/* Share form */}
          <form onSubmit={handleShare} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl glass-input"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as SharePermission)}
                className="flex h-12 rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring glass-input"
              >
                <option value="read">Lecture seule</option>
                <option value="write">Lecture et écriture</option>
              </select>
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Shared with */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Partagé avec ({shares.length})
            </h4>

            {shares.length === 0 ? (
              <GlassCard className="border-dashed border-2" hover={false}>
                <GlassCardContent className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Cette liste n'est pas encore partagée.
                  </p>
                </GlassCardContent>
              </GlassCard>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <GlassCard key={share.id} className="group" hover={false}>
                    <GlassCardContent className="flex items-center justify-between p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {share.shared_with_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {share.permission === 'write' ? 'Lecture et écriture' : 'Lecture seule'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={share.permission}
                          onChange={(e) => updateSharePermission(share.id, e.target.value as SharePermission)}
                          className="h-9 text-xs rounded-lg border border-input bg-card px-2 glass-input"
                        >
                          <option value="read">Lecture</option>
                          <option value="write">Écriture</option>
                        </select>
                        <Button
                          variant="glass"
                          size="icon"
                          className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                          onClick={() => removeShare(share.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
