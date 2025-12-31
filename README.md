# Pense-Bête 2

![Pense-Bête](https://img.shields.io/badge/Pense--Bête-2.0-purple)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7.0-646CFF)
![PWA](https://img.shields.io/badge/PWA-Enabled-green)

Une application moderne de gestion de listes avec style glassmorphism, optimisée pour mobile, avec support offline et synchronisation.

## ✨ Fonctionnalités

### 📱 Gestion de Listes
- **4 catégories** : Courses, Tâches, Idées, Notes
- **Dossiers** : Organisez vos listes par dossiers colorés
- **Priorités** : Définissez des priorités (Basse, Normale, Haute, Urgente)
- **Dates d'échéance** : Ajoutez des dates limites à vos éléments
- **Drag & Drop** : Réordonnez facilement vos éléments
- **Recherche** : Trouvez rapidement vos listes et éléments

### 👆 Interface Mobile
- **Navigation par onglets** : Barre de navigation fixe en bas de l'écran
- **Bouton d'action flottant** : Créez rapidement une nouvelle liste
- **Design responsive** : Optimisé pour mobile et desktop

### 🎨 Design
- **Glassmorphism** : Effet de verre moderne avec blur et transparence
- **Dégradés** : Accents colorés sur toute l'interface
- **Thème sombre/clair** : Changez selon vos préférences
- **Animations fluides** : Transitions et interactions soignées

### 🌐 Mode Offline
- **Indicateur de connexion** : Voyez quand vous êtes hors ligne
- **File d'attente** : Les modifications sont synchronisées automatiquement
- **Service Worker** : PWA installable pour accès rapide

### 🔔 Notifications
- **Rappels** : Recevez des notifications pour les tâches à échéance
- **Alertes de retard** : Soyez notifié des éléments en retard

### 👥 Partage
- **Partage de listes** : Partagez vos listes avec d'autres utilisateurs
- **Permissions** : Contrôlez qui peut modifier vos listes

## 🛠️ Stack Technique

| Catégorie | Technologie |
|----------|-------------|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 7 |
| **Styling** | Tailwind CSS 4.1 + shadcn/ui |
| **State** | Zustand |
| **Backend** | Supabase (PostgreSQL) |
| **Drag & Drop** | @dnd-kit |
| **Gestes** | @use-gesture/react |
| **PWA** | vite-plugin-pwa |

## 🚀 Installation

### Prérequis
- Node.js 20+
- npm ou yarn
- Un compte Supabase

### Configuration

1. **Clonez le dépôt**
```bash
git clone https://github.com/Titoftotof/PenseBete2.git
cd PenseBete2
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Configurez Supabase**
- Créez un projet sur [supabase.com](https://supabase.com)
- Exécutez le script SQL dans `supabase/schema.sql` dans l'éditeur SQL Supabase
- Exécutez les migrations dans `supabase/migration_*.sql`
- Copiez vos identifiants depuis Settings > API

4. **Configurez les variables d'environnement**
```bash
cp .env.example .env
```

Editez `.env` avec vos identifiants :
```env
VITE_SUPABASE_URL=votre_supabase_project_url
VITE_SUPABASE_ANON_KEY=votre_supabase_anon_key
```

5. **Lancez l'application**
```bash
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173) dans votre navigateur.

## 📦 Build pour Production

```bash
npm run build
```

Les fichiers générés seront dans le dossier `dist/`.

## 🌐 Déploiement

### Netlify
1. Poussez votre code sur GitHub
2. Connectez votre compte GitHub sur [Netlify](https://app.netlify.com/start)
3. Sélectionnez le dépôt `PenseBete2`
4. Les paramètres de build sont automatiquement configurés via `netlify.toml`

### Variables d'environnement sur Netlify
Ajoutez dans Netlify > Site Settings > Environment Variables :
```
VITE_SUPABASE_URL=votre_supabase_url
VITE_SUPABASE_ANON_KEY=votre_supabase_key
```

### Autres plateformes
L'application peut être déployée sur :
- **Vercel** : `vercel deploy`
- **GitHub Pages** : Configurez `base` dans vite.config.ts
- **Firebase Hosting** : `firebase deploy`

## 📁 Structure du Projet

```
src/
├── components/          # Composants React
│   ├── ui/              # Composants UI réutilisables (shadcn/ui)
│   ├── BottomTabBar.tsx # Navigation mobile
│   ├── CreateListDialog.tsx
│   ├── FolderManager.tsx
│   ├── Header.tsx
│   ├── ListDetail.tsx
│   ├── SearchBar.tsx
│   ├── ShareDialog.tsx
│   └── SwipeableItem.tsx
├── hooks/               # Hooks React personnalisés
│   ├── useNotifications.ts
│   ├── useOnlineStatus.ts
│   └── useTheme.ts
├── lib/                 # Utilitaires et configuration
│   ├── notifications.ts
│   ├── supabase.ts
│   └── utils.ts
├── pages/               # Pages principales
│   ├── DashboardPage.tsx
│   └── LoginPage.tsx
├── stores/              # Stores Zustand
│   ├── folderStore.ts
│   ├── listStore.ts
│   ├── shareStore.ts
│   └── syncStore.ts
├── types/               # Types TypeScript
│   └── index.ts
├── App.tsx
├── index.css
└── main.tsx
```

## 🎯 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build pour production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Exécute ESLint |

## 🔐 Sécurité

- **Row Level Security (RLS)** : Activé sur toutes les tables Supabase
- **Authentification** : Gérée par Supabase Auth
- **Variables d'environnement** : Jamais commitées (.gitignore)

## 🗄️ Schéma de la Base de Données

### Tables principales
- **folders** : Dossiers d'organisation
- **lists** : Listes (courses, tâches, idées, notes)
- **list_items** : Éléments des listes
- **shared_lists** : Partage de listes entre utilisateurs

### Colonnes importantes
- `priority` : low, normal, high, urgent
- `due_date` : Date d'échéance pour les rappels
- `position` : Ordre d'affichage

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Forker le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Committer (`git commit -m 'Add some AmazingFeature'`)
4. Pousser (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.

## 👤 Auteur

**Titoftotof** - [GitHub](https://github.com/Titoftotof)

## 🙏 Remerciements

- [Supabase](https://supabase.com) pour le backend
- [shadcn/ui](https://ui.shadcn.com) pour les composants UI
- [Tailwind CSS](https://tailwindcss.com) pour le styling
- [Vite](https://vitejs.dev) pour le build tool
- [Lucide](https://lucide.dev) pour les icônes

---

**Note** : N'oubliez pas de remplir le fichier `.env` avec vos propres identifiants Supabase avant de lancer l'application !
