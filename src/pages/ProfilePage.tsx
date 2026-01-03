import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { User, Mail, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const metadata = user.user_metadata as { first_name?: string; last_name?: string; username?: string } | undefined
      setFirstName(metadata?.first_name || '')
      setLastName(metadata?.last_name || '')
      setUsername(metadata?.username || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!firstName.trim() || !lastName.trim()) {
      setMessage({ type: 'error', text: 'Le prénom et le nom sont requis' })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim() || null,
      }
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Mon Profil
          </h1>
        </div>

        <GlassCard hover={false}>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              Mes informations
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="glass-input h-12 rounded-xl bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Prénom *
                  </label>
                  <Input
                    type="text"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-input h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Nom *
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-input h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Pseudo (facultatif)
                </label>
                <Input
                  type="text"
                  placeholder="Pseudo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="glass-input h-12 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Ce sera le nom affiché quand vous partagez des listes
                </p>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-3 rounded-xl text-sm text-center ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                      : 'bg-red-500/20 text-red-700 dark:text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
