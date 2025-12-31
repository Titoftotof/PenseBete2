import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Folder, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { useFolderStore } from '@/stores/folderStore'
import { useListStore } from '@/stores/listStore'

const FOLDER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
]

interface FolderManagerProps {
  onSelectFolder: (folderId: string | null) => void
  selectedFolderId: string | null
}

export function FolderManager({ onSelectFolder, selectedFolderId }: FolderManagerProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[4])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { folders, fetchFolders, createFolder, updateFolder, deleteFolder, loading } = useFolderStore()
  const { lists } = useListStore()

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim(), newFolderColor)
    setNewFolderName('')
    setShowCreate(false)
  }

  const handleStartEdit = (folder: { id: string; name: string }) => {
    setEditingId(folder.id)
    setEditName(folder.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await updateFolder(editingId, { name: editName.trim() })
    setEditingId(null)
  }

  const handleDeleteFolder = async (id: string) => {
    if (confirm('Supprimer ce dossier ? Les listes ne seront pas supprimées.')) {
      await deleteFolder(id)
      if (selectedFolderId === id) {
        onSelectFolder(null)
      }
    }
  }

  const getListCountInFolder = (folderId: string) => {
    return lists.filter((list) => list.folder_id === folderId).length
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Folder className="h-4 w-4 text-purple-500" />
          Dossiers
        </h3>
        <Button
          variant="glass"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-xl"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Create folder form */}
      {showCreate && (
        <GlassCard className="border-dashed border-2" hover={false}>
          <GlassCardContent className="p-4 space-y-3">
            <Input
              placeholder="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="glass-input rounded-xl h-10"
            />
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    newFolderColor === color ? 'scale-125 ring-2 ring-offset-2 ring-purple-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Button
              className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
            >
              Créer le dossier
            </Button>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* All lists button */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
          selectedFolderId === null
            ? 'glass bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400'
            : 'glass hover:bg-white/40 dark:hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="flex-1 font-medium">Toutes les listes</span>
          <span className="text-sm bg-primary/20 px-2 py-0.5 rounded-full">{lists.length}</span>
        </div>
      </button>

      {/* Folders list */}
      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`group flex items-center gap-2 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
              selectedFolderId === folder.id
                ? 'glass bg-purple-500/20 border-purple-500/30'
                : 'glass hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
            onClick={() => onSelectFolder(folder.id)}
          >
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: folder.color }}
            />

            {editingId === folder.id ? (
              <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  className="h-8 text-sm rounded-lg glass-input"
                  autoFocus
                />
                <Button size="icon" variant="glass" className="h-8 w-8 rounded-lg" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3 text-green-500" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 font-medium truncate">{folder.name}</span>
                <span className="text-sm bg-primary/20 px-2 py-0.5 rounded-full">{getListCountInFolder(folder.id)}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="glass"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => handleStartEdit(folder)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="glass"
                    className="h-7 w-7 rounded-lg text-red-500"
                    onClick={() => handleDeleteFolder(folder.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {folders.length === 0 && !showCreate && (
        <GlassCard className="border-dashed border-2" hover={false}>
          <GlassCardContent className="flex flex-col items-center justify-center py-6">
            <Folder className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Aucun dossier. Créez-en un pour organiser vos listes.
            </p>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}
