import React, { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { Plus, ShoppingCart, CheckSquare, Lightbulb, FileText, Trash2, FolderOpen, Share2, ArrowLeft, Menu, Users } from 'lucide-react'
import { useListStore } from '@/stores/listStore'
import { useFolderStore } from '@/stores/folderStore'
import { useShareStore } from '@/stores/shareStore'
import { CreateListDialog } from '@/components/CreateListDialog'
import { ListDetail } from '@/components/ListDetail'
import { Header } from '@/components/Header'
import { FolderManager } from '@/components/FolderManager'
import { SearchBar } from '@/components/SearchBar'
import { ShareDialog } from '@/components/ShareDialog'
import { BottomTabBar } from '@/components/BottomTabBar'
import { SwipeableItem } from '@/components/SwipeableItem'
import { DraggableList } from '@/components/DraggableList'
import type { List, ListCategory } from '@/types'

const categories: { id: ListCategory; label: string; icon: React.ReactNode; color: string; gradient: string }[] = [
  { id: 'shopping', label: 'Courses', icon: <ShoppingCart className="h-6 w-6" />, color: 'bg-green-500', gradient: 'from-green-400 to-emerald-500' },
  { id: 'tasks', label: 'Tâches', icon: <CheckSquare className="h-6 w-6" />, color: 'bg-blue-500', gradient: 'from-blue-400 to-indigo-500' },
  { id: 'ideas', label: 'Idées', icon: <Lightbulb className="h-6 w-6" />, color: 'bg-yellow-500', gradient: 'from-yellow-400 to-orange-500' },
  { id: 'notes', label: 'Notes', icon: <FileText className="h-6 w-6" />, color: 'bg-purple-500', gradient: 'from-purple-400 to-pink-500' },
]

export default function DashboardPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ListCategory | null>(null)
  const [selectedList, setSelectedList] = useState<List | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
  const [sharingList, setSharingList] = useState<List | null>(null)

  const { lists, fetchLists, deleteList, reorderLists, loading } = useListStore()
  const { folders } = useFolderStore()
  const { fetchSharedWithMe, sharedWithMe } = useShareStore()

  useEffect(() => {
    fetchLists()
    fetchSharedWithMe()
  }, [fetchLists, fetchSharedWithMe])

  // Filter lists based on search, folder, and category
  const filteredLists = useMemo(() => {
    let result = lists

    // Filter by folder
    if (selectedFolderId) {
      result = result.filter((list) => list.folder_id === selectedFolderId)
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((list) => list.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((list) => list.name.toLowerCase().includes(query))
    }

    return result
  }, [lists, selectedFolderId, selectedCategory, searchQuery])

  const getListCountByCategory = (category: ListCategory) => {
    const baseLists = selectedFolderId
      ? lists.filter((list) => list.folder_id === selectedFolderId)
      : lists
    return baseLists.filter((list) => list.category === category).length
  }

  const listCounts = useMemo(() => ({
    shopping: getListCountByCategory('shopping'),
    tasks: getListCountByCategory('tasks'),
    ideas: getListCountByCategory('ideas'),
    notes: getListCountByCategory('notes'),
  }), [lists, selectedFolderId])

  const handleCategoryClick = (category: ListCategory) => {
    setSelectedCategory(category)
  }

  const handleCreateList = (category?: ListCategory) => {
    setSelectedCategory(category || null)
    setShowCreateDialog(true)
  }

  const handleListClick = (list: List) => {
    setSelectedList(list)
  }

  const handleDeleteList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation()
    if (confirm('Supprimer cette liste ?')) {
      await deleteList(listId)
    }
  }

  const handleShareList = (e: React.MouseEvent, list: List) => {
    e.stopPropagation()
    setSharingList(list)
  }

  const getFolderName = (folderId: string | null | undefined) => {
    if (!folderId) return null
    const folder = folders.find((f) => f.id === folderId)
    return folder?.name
  }

  // If a list is selected, show the list detail view
  if (selectedList) {
    return (
      <div className="min-h-screen pb-28 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <ListDetail list={selectedList} onBack={() => setSelectedList(null)} />
        </main>
        <BottomTabBar
          selectedCategory={selectedCategory}
          onCategorySelect={(cat) => {
            setSelectedList(null)
            handleCategoryClick(cat)
          }}
          onCreateList={() => {
            setSelectedList(null)
            handleCreateList()
          }}
          listCounts={listCounts}
        />
      </div>
    )
  }

  // If a category is selected, show lists in that category
  if (selectedCategory) {
    const categoryInfo = categories.find((c) => c.id === selectedCategory)!

    return (
      <div className="min-h-screen pb-28 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="glass"
                size="icon"
                className="rounded-xl"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryInfo.gradient} flex items-center justify-center text-white shadow-lg`}>
                {categoryInfo.icon}
              </div>
              <h2 className="text-xl font-bold">{categoryInfo.label}</h2>
            </div>
            <Button
              onClick={() => handleCreateList(selectedCategory)}
              className="hidden md:flex rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle liste
            </Button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <SearchBar onSearch={setSearchQuery} placeholder="Rechercher dans cette catégorie..." />
          </div>

          {filteredLists.length > 0 ? (
            <DraggableList
              items={filteredLists}
              onReorder={(newLists) => reorderLists(newLists)}
              disabled={!!searchQuery}
              renderItem={(list, dragHandle) => (
                <SwipeableItem
                  onDelete={() => {
                    if (confirm('Supprimer cette liste ?')) {
                      deleteList(list.id)
                    }
                  }}
                >
                  <GlassCard
                    className="cursor-pointer"
                    onClick={() => handleListClick(list)}
                    hover={false}
                  >
                    <GlassCardContent className="flex items-center gap-3 p-4">
                      {dragHandle}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{list.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getFolderName(list.folder_id) && (
                            <span className="mr-2">
                              <FolderOpen className="h-3 w-3 inline mr-1" />
                              {getFolderName(list.folder_id)}
                            </span>
                          )}
                          Créée le {new Date(list.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0" data-no-swipe="true">
                        <Button
                          variant="glass"
                          size="icon"
                          className="rounded-xl"
                          onClick={(e) => handleShareList(e, list)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="glass"
                          size="icon"
                          className="rounded-xl text-red-500"
                          onClick={(e) => handleDeleteList(e, list.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                </SwipeableItem>
              )}
            />
          ) : (
            <GlassCard className="border-dashed border-2" hover={false}>
              <GlassCardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Aucun résultat' : 'Aucune liste dans cette catégorie'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => handleCreateList(selectedCategory)}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une liste
                  </Button>
                )}
              </GlassCardContent>
            </GlassCard>
          )}
        </main>

        <BottomTabBar
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategoryClick}
          onCreateList={() => handleCreateList()}
          listCounts={listCounts}
        />

        <CreateListDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          defaultCategory={selectedCategory}
        />

        {sharingList && (
          <ShareDialog
            list={sharingList}
            onClose={() => setSharingList(null)}
          />
        )}
      </div>
    )
  }

  // Default: show categories overview with sidebar
  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <Header />

      <div className="flex">
        {/* Desktop sidebar toggle */}
        <Button
          variant="glass"
          size="icon"
          className="fixed bottom-20 left-4 z-50 md:hidden rounded-xl shadow-lg"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-0 left-0 h-screen w-64 glass border-r border-white/20 p-4 z-40 transition-transform md:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="pt-16 md:pt-4">
            <FolderManager
              selectedFolderId={selectedFolderId}
              onSelectFolder={(id) => {
                setSelectedFolderId(id)
                setShowSidebar(false)
              }}
            />
          </div>
        </aside>

        {/* Overlay for mobile */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {/* Search */}
          <div className="mb-6">
            <SearchBar onSearch={setSearchQuery} placeholder="Rechercher une liste..." />
          </div>

          {/* Current folder indicator */}
          {selectedFolderId && (
            <GlassCard className="mb-4 p-3" hover={false}>
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Dossier: {getFolderName(selectedFolderId)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFolderId(null)}
                  className="ml-auto h-6 w-6 p-0 rounded-full"
                >
                  ✕
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Categories grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {categories.map((category) => (
              <GlassCard
                key={category.id}
                className="cursor-pointer overflow-hidden"
                onClick={() => handleCategoryClick(category.id)}
              >
                <GlassCardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white mb-3 shadow-lg`}>
                    {category.icon}
                  </div>
                  <GlassCardTitle className="text-lg">{category.label}</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground">
                    {getListCountByCategory(category.id)} liste{getListCountByCategory(category.id) !== 1 ? 's' : ''}
                  </p>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>

          {/* Shared lists */}
          {sharedWithMe.length > 0 && !selectedFolderId && !searchQuery && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
                Partagé avec moi
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sharedWithMe.map((share) => {
                  if (!share.list) return null
                  const categoryInfo = categories.find((c) => c.id === share.list!.category) || categories[0]

                  return (
                    <GlassCard
                      key={share.id}
                      className="cursor-pointer"
                      onClick={() => {
                        // Construct a List object from the share info
                        const list: List = {
                          id: share.list_id,
                          name: share.list!.name,
                          category: share.list!.category as ListCategory,
                          folder_id: share.list!.folder_id,
                          user_id: '', // Not needed for display
                          position: 0,
                          created_at: share.created_at,
                          updated_at: share.created_at
                        }
                        handleListClick(list)
                      }}
                      hover={false}
                    >
                      <GlassCardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryInfo.gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
                              <Users className="h-4 w-4" />
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              Partagé par {share.shared_with_email === '...' ? 'un utilisateur' : 'un utilisateur'}
                            </p>
                          </div>
                          <div className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium shrink-0">
                            {share.permission === 'write' ? 'Édition' : 'Lecture'}
                          </div>
                        </div>
                        <h3 className="font-semibold whitespace-pre-wrap break-words w-full">{share.list!.name}</h3>
                      </GlassCardContent>
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lists */}
          {filteredLists.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
                {searchQuery ? `Résultats pour "${searchQuery}"` : 'Listes récentes'}
              </h2>
              <DraggableList
                items={filteredLists.slice(0, searchQuery ? undefined : 10)}
                onReorder={(newLists) => reorderLists(newLists)}
                disabled={!!searchQuery}
                renderItem={(list, dragHandle) => {
                  const categoryInfo = categories.find((c) => c.id === list.category)!
                  return (
                    <SwipeableItem
                      onDelete={() => {
                        if (confirm('Supprimer cette liste ?')) {
                          deleteList(list.id)
                        }
                      }}
                    >
                      <GlassCard
                        className="cursor-pointer"
                        onClick={() => handleListClick(list)}
                        hover={false}
                      >
                        <GlassCardContent className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              {dragHandle}
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryInfo.gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
                                {categoryInfo.icon}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {categoryInfo.label}
                                {getFolderName(list.folder_id) && ` • ${getFolderName(list.folder_id)}`}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0" data-no-swipe="true">
                              <Button
                                variant="glass"
                                size="icon"
                                className="rounded-xl h-8 w-8"
                                onClick={(e) => handleShareList(e, list)}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="glass"
                                size="icon"
                                className="rounded-xl text-red-500 h-8 w-8"
                                onClick={(e) => handleDeleteList(e, list.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <h3 className="font-semibold whitespace-pre-wrap break-words w-full">{list.name}</h3>
                        </GlassCardContent>
                      </GlassCard>
                    </SwipeableItem>
                  )
                }}
              />
            </div>
          ) : (
            <GlassCard className="border-dashed border-2" hover={false}>
              <GlassCardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-2">
                  {searchQuery ? 'Aucun résultat' : 'Aucune liste pour le moment'}
                </h3>
                {!searchQuery && (
                  <>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Créez votre première liste pour commencer à organiser vos idées
                    </p>
                    <Button
                      onClick={() => handleCreateList()}
                      className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une liste
                    </Button>
                  </>
                )}
              </GlassCardContent>
            </GlassCard>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          )}
        </main>

        <BottomTabBar
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategoryClick}
          onCreateList={() => handleCreateList()}
          listCounts={listCounts}
        />
      </div>

      <CreateListDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        defaultCategory={selectedCategory || undefined}
      />

      {sharingList && (
        <ShareDialog
          list={sharingList}
          onClose={() => setSharingList(null)}
        />
      )}
    </div>
  )
}
