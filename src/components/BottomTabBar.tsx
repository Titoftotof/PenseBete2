import { ShoppingCart, CheckSquare, Lightbulb, FileText, Plus } from 'lucide-react'
import type { ListCategory } from '@/types'

interface BottomTabBarProps {
  selectedCategory: ListCategory | null
  onCategorySelect: (category: ListCategory) => void
  onCreateList: () => void
  listCounts: Record<ListCategory, number>
}

const tabs: { id: ListCategory; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { id: 'shopping', label: 'Courses', icon: <ShoppingCart className="h-5 w-5" />, activeColor: 'text-green-500' },
  { id: 'tasks', label: 'Tâches', icon: <CheckSquare className="h-5 w-5" />, activeColor: 'text-blue-500' },
  { id: 'ideas', label: 'Idées', icon: <Lightbulb className="h-5 w-5" />, activeColor: 'text-yellow-500' },
  { id: 'notes', label: 'Notes', icon: <FileText className="h-5 w-5" />, activeColor: 'text-purple-500' },
]

export function BottomTabBar({ selectedCategory, onCategorySelect, onCreateList, listCounts }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] md:hidden">
      <div className="glass border-t border-white/20 px-2 pb-safe">
        <div className="flex items-center justify-around py-2">
          {tabs.slice(0, 2).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onCategorySelect(tab.id)}
              className="relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
            >
              <div className={`flex items-center justify-center transition-all duration-200 ${selectedCategory === tab.id
                ? `${tab.activeColor} bg-white/30 dark:bg-slate-800/30 scale-105`
                : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {listCounts[tab.id] > 0 && selectedCategory !== tab.id && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center px-0.5">
                    {listCounts[tab.id]}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${selectedCategory === tab.id
                ? `${tab.activeColor}`
                : 'text-muted-foreground hover:text-foreground'
                }`}>{tab.label}</span>
            </button>
          ))}

          {/* Central Create Button */}
          <button
            onClick={onCreateList}
            className="relative -top-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>

          {tabs.slice(2, 4).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onCategorySelect(tab.id)}
              className="relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
            >
              <div className={`flex items-center justify-center transition-all duration-200 ${selectedCategory === tab.id
                ? `${tab.activeColor} bg-white/30 dark:bg-slate-800/30 scale-105`
                : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {listCounts[tab.id] > 0 && selectedCategory !== tab.id && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center px-0.5">
                    {listCounts[tab.id]}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${selectedCategory === tab.id
                ? `${tab.activeColor}`
                : 'text-muted-foreground hover:text-foreground'
                }`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
