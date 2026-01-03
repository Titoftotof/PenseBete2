import { X, Settings, Calendar, Bell, Sun, Moon, Monitor, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { useSettingsStore, type DefaultDeadlineRule } from '@/stores/settingsStore'
import { useTheme } from '@/hooks/useTheme'
import packageJson from '../../package.json'

export function SettingsModal() {
    const { defaultDeadlineRule, setDefaultDeadlineRule, isSettingsOpen, setIsSettingsOpen } = useSettingsStore()
    const { theme, setTheme } = useTheme()

    if (!isSettingsOpen) return null

    const onClose = () => setIsSettingsOpen(false)

    const rules: { id: DefaultDeadlineRule; label: string; description: string }[] = [
        { id: 'none', label: 'Aucune', description: 'Pas de date d\'échéance par défaut.' },
        { id: 'tomorrow_9am', label: 'Demain 9h', description: 'Échéance fixée à demain matin.' },
        { id: 'end_of_day', label: 'Fin de journée', description: 'Échéance fixée à aujourd\'hui 23:59.' },
        { id: 'plus_7_days', label: 'J+7 (Une semaine)', description: 'Échéance fixée à dans 7 jours.' },
    ]

    const themes: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
        { id: 'light', label: 'Clair', icon: Sun },
        { id: 'dark', label: 'Sombre', icon: Moon },
        { id: 'system', label: 'Système', icon: Monitor },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-12 pb-12">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-200 my-auto">
                <GlassCard className="border-white/20 shadow-2xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Settings className="h-5 w-5 text-purple-500" />
                            Paramètres
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <GlassCardContent className="p-6 space-y-8">
                        {/* Appearance Section */}
                        <section>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                Apparence
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                {themes.map((t) => {
                                    const Icon = t.icon
                                    const isSelected = theme === t.id
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 ${isSelected
                                                ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/20 text-white'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-900 dark:text-slate-100'
                                                }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-xs font-bold">{t.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Default Deadline Section */}
                        <section>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Échéance par défaut
                            </h4>
                            <div className="grid gap-3">
                                {rules.map((rule) => (
                                    <button
                                        key={rule.id}
                                        onClick={() => setDefaultDeadlineRule(rule.id)}
                                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${defaultDeadlineRule === rule.id
                                            ? 'bg-purple-600 border-purple-400 shadow-xl shadow-purple-500/30 text-white'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-900 dark:text-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-base">
                                                {rule.label}
                                            </span>
                                            {defaultDeadlineRule === rule.id ? (
                                                <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                                            ) : (
                                                <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                                            )}
                                        </div>
                                        <p className={`text-xs leading-relaxed font-medium ${defaultDeadlineRule === rule.id ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {rule.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-start gap-3">
                                <Bell className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <h5 className="text-sm font-semibold text-blue-500">Note sur les rappels</h5>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        La règle par défaut définit uniquement l'échéance (date limite).
                                        Les notifications de rappel doivent toujours être activées manuellement via l'icône de cloche.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Version Section */}
                        <section className="pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Version
                                </span>
                                <span className="font-mono font-semibold text-purple-500">
                                    v{packageJson.version}
                                </span>
                            </div>
                        </section>
                    </GlassCardContent>

                    <div className="p-4 border-t border-white/10 flex justify-end">
                        <Button
                            onClick={onClose}
                            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8"
                        >
                            Fermer
                        </Button>
                    </div>
                </GlassCard>
            </div>
        </div>
    )
}
