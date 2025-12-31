# Plan: Fonctionnalités IA pour PenseBete2

## Résumé Exécutif

Ce plan détaille l'implémentation de fonctionnalités IA pour l'application PenseBete2. **Mon avis critique : certaines fonctionnalités demandées sont over-engineered pour une app de listes. Je recommande une approche progressive avec des alternatives plus simples d'abord.**

---

## Analyse Critique des Fonctionnalités Demandées

### 1. Ajout de tâches par la voix

| Aspect | Évaluation |
|--------|------------|
| **Faisabilité** | HAUTE |
| **Complexité** | MOYENNE |
| **Coût** | GRATUIT (Web Speech API native) |
| **Valeur ajoutée** | HAUTE |
| **Recommandation** | **OUI - À implémenter** |

**Points positifs :**
- Web Speech API est native aux navigateurs (Chrome, Safari, Edge)
- Gratuit, pas besoin de serveur backend
- Fonctionne bien pour le français

**Limitations :**
- Ne fonctionne PAS sur Firefox
- Support variable sur iOS Safari
- Nécessite une connexion internet (traitement côté serveur du navigateur)

**Mon avis :** Excellente fonctionnalité avec un bon rapport effort/valeur. Le parsing de la phrase peut être fait avec des regex simples (séparateurs: virgules, "et", "puis") avant d'envisager l'IA.

---

### 2. Scan photo avec reconnaissance IA

| Aspect | Évaluation |
|--------|------------|
| **Faisabilité** | MOYENNE |
| **Complexité** | TRÈS ÉLEVÉE |
| **Coût** | **ÉLEVÉ (0.02-0.03$/image)** |
| **Valeur ajoutée** | MOYENNE |
| **Recommandation** | **NON - Trop coûteux pour le bénéfice** |

**Calcul de coût réaliste :**
```
100 utilisateurs × 5 photos/jour × 30 jours = 15,000 requêtes/mois
À 0.02$/requête = 300$/mois minimum
```

**Problèmes majeurs :**
- Nécessite un backend pour sécuriser les clés API (Supabase Edge Functions)
- Latence de 2-5 secondes par image
- Reconnaissance de marques inconsistante
- Impossible offline

**Mon avis critique :** Cette fonctionnalité est **over-engineered** pour une app de listes. Le rapport coût/bénéfice est défavorable.

**Alternatives recommandées :**
1. **Scan de code-barres** (gratuit, Open Food Facts API) - Beaucoup plus fiable
2. **Templates de listes prédéfinis** - Zero coût, valeur immédiate
3. **OCR local avec Tesseract.js** - Gratuit mais précision limitée

---

### 3. Catégorisation automatique

| Aspect | Évaluation |
|--------|------------|
| **Faisabilité** | HAUTE |
| **Complexité** | FAIBLE |
| **Coût** | GRATUIT (dictionnaire local) |
| **Valeur ajoutée** | HAUTE |
| **Recommandation** | **OUI - Priorité haute** |

**Mon avis :** Un simple dictionnaire de mots-clés couvre 90% des cas pour les courses. L'IA n'est pas nécessaire.

```typescript
const CATEGORIES = {
  'Fruits & Légumes': ['pomme', 'banane', 'tomate', 'salade', 'carotte', ...],
  'Produits Laitiers': ['lait', 'fromage', 'beurre', 'yaourt', 'oeuf', ...],
  'Boulangerie': ['pain', 'baguette', 'croissant', 'brioche', ...],
  // etc.
}
```

---

### 4. Tri intelligent

| Aspect | Évaluation |
|--------|------------|
| **Faisabilité** | HAUTE |
| **Complexité** | FAIBLE |
| **Coût** | GRATUIT |
| **Valeur ajoutée** | MOYENNE |
| **Recommandation** | **OUI - Inclus avec la catégorisation** |

**Mon avis :** C'est essentiellement un tri par catégorie, déjà faisable avec le dictionnaire local.

---

### 5. Apprentissage des articles fréquents

| Aspect | Évaluation |
|--------|------------|
| **Faisabilité** | TRÈS HAUTE |
| **Complexité** | TRÈS FAIBLE |
| **Coût** | GRATUIT |
| **Valeur ajoutée** | TRÈS HAUTE |
| **Recommandation** | **OUI - Priorité maximale** |

**Mon avis :** **C'est la fonctionnalité avec le meilleur ROI.** Ne nécessite PAS d'IA, juste un compteur de fréquence. Implémentation en 1-2 jours.

---

## Ordre de Priorité Recommandé

| Priorité | Fonctionnalité | Effort | Coût | Impact |
|----------|----------------|--------|------|--------|
| **1** | Articles fréquents | 1-2 jours | 0$ | TRÈS ÉLEVÉ |
| **2** | Saisie vocale (Web Speech) | 2-3 jours | 0$ | ÉLEVÉ |
| **3** | Catégorisation locale (dictionnaire) | 1-2 jours | 0$ | ÉLEVÉ |
| **4** | Rappels améliorés + DateTimePicker | 2-3 jours | 0$ | ÉLEVÉ |
| **5** | Vue Calendrier | 2-3 jours | 0$ | MOYEN |
| **6** | Config multi-providers LLM | 3-4 jours | Variable | MOYEN |
| **7** | Parsing IA pour la voix | 2-3 jours | ~50$/mois | MOYEN |
| **8** | Scan code-barres | 3-5 jours | 0$ | MOYEN |
| **9** | Vision IA (photos) | 2-3 semaines | 200-500$/mois | FAIBLE |

**MVP recommandé : Phases 1-3 = 4-7 jours, 0$ de coût récurrent**

---

## Plan d'Implémentation Détaillé

### PHASE 1 : Articles Fréquents (1-2 jours)

#### 1.1 Migration Supabase
```sql
-- supabase/migrations/add_frequent_items.sql
CREATE TABLE frequent_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  category TEXT,
  use_count INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, normalized_content)
);

CREATE INDEX idx_frequent_items_user ON frequent_items(user_id);
CREATE INDEX idx_frequent_items_count ON frequent_items(user_id, use_count DESC);

-- RLS
ALTER TABLE frequent_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own frequent items" ON frequent_items
  FOR ALL USING (auth.uid() = user_id);
```

#### 1.2 Fichiers à créer

**`src/stores/frequentItemsStore.ts`**
- Zustand store pour gérer les articles fréquents
- Méthodes: `fetchFrequentItems()`, `trackItem()`, `getTopItems(limit)`

**`src/components/FrequentItemsSuggestions.tsx`**
- Affiche les 5-10 articles les plus fréquents
- Chips cliquables pour ajout rapide
- Style glass-morphism cohérent

#### 1.3 Fichiers à modifier

**`src/components/ListDetail.tsx`**
- Ajouter composant `FrequentItemsSuggestions` sous le champ input
- Appeler `trackItem()` lors de la création d'un item

**`src/types/index.ts`**
- Ajouter type `FrequentItem`

---

### PHASE 2 : Saisie Vocale (2-3 jours)

#### 2.1 Fichiers à créer

**`src/hooks/useSpeechRecognition.ts`**
```typescript
interface UseSpeechRecognitionResult {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}
```

**`src/components/VoiceInputButton.tsx`**
- Bouton micro avec animation (pulsation quand actif)
- État visuel : inactif / écoute / traitement
- Gestion d'erreur (navigateur non supporté)

**`src/lib/voiceParser.ts`**
```typescript
// Parser sans IA - séparateurs simples
export function parseVoiceInput(text: string): string[] {
  const separators = /[,;]|\bet\b|\bpuis\b|\baussi\b|\bavec\b/gi
  return text
    .split(separators)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}
```

#### 2.2 Fichiers à modifier

**`src/components/ListDetail.tsx`**
- Ajouter bouton micro à côté du bouton "+"
- Modal de confirmation avec items parsés avant ajout

---

### PHASE 3 : Catégorisation Automatique (1-2 jours)

#### 3.1 Fichiers à créer

**`src/lib/categoryDictionary.ts`**
```typescript
export const GROCERY_CATEGORIES: Record<string, string[]> = {
  'Fruits & Légumes': ['pomme', 'banane', 'orange', 'citron', 'tomate', 'salade', 'carotte', 'courgette', 'aubergine', 'poivron', 'concombre', 'haricot', 'petit pois', 'épinard', 'brocoli', 'chou', 'oignon', 'ail', 'échalote', 'poireau', 'céleri', 'fenouil', 'artichaut', 'asperge', 'radis', 'navet', 'betterave', 'patate douce', 'pomme de terre', 'champignon', 'avocat', 'poire', 'pêche', 'abricot', 'prune', 'cerise', 'fraise', 'framboise', 'myrtille', 'mûre', 'cassis', 'groseille', 'raisin', 'melon', 'pastèque', 'kiwi', 'mangue', 'ananas', 'papaye', 'fruit de la passion', 'litchi', 'grenade', 'figue', 'datte', 'noix de coco', 'citron vert', 'pamplemousse', 'clémentine', 'mandarine'],
  'Produits Laitiers': ['lait', 'fromage', 'beurre', 'yaourt', 'crème', 'crème fraîche', 'oeuf', 'oeufs', 'mozzarella', 'parmesan', 'gruyère', 'emmental', 'comté', 'camembert', 'brie', 'roquefort', 'chèvre', 'feta', 'mascarpone', 'ricotta', 'cottage cheese', 'petit suisse', 'fromage blanc', 'faisselle', 'kéfir', 'lait de coco', 'lait d\'amande', 'lait de soja', 'lait d\'avoine'],
  'Boulangerie': ['pain', 'baguette', 'croissant', 'brioche', 'pain de mie', 'pain complet', 'pain aux céréales', 'pain de campagne', 'ficelle', 'pain au chocolat', 'chausson aux pommes', 'pain aux raisins', 'éclair', 'religieuse', 'mille-feuille', 'tarte', 'gâteau', 'cookie', 'madeleine', 'financier', 'macaron', 'meringue', 'chouquette', 'beignet', 'donut', 'crêpe', 'gaufre', 'pancake', 'bagel', 'muffin', 'scone'],
  'Viandes & Poissons': ['poulet', 'boeuf', 'porc', 'agneau', 'veau', 'canard', 'dinde', 'lapin', 'saumon', 'thon', 'cabillaud', 'colin', 'merlu', 'sole', 'bar', 'loup', 'dorade', 'truite', 'sardine', 'maquereau', 'hareng', 'anchois', 'crevette', 'gambas', 'langoustine', 'homard', 'crabe', 'moule', 'huître', 'coquille saint-jacques', 'calmar', 'poulpe', 'steak', 'côtelette', 'rôti', 'escalope', 'filet', 'entrecôte', 'bavette', 'onglet', 'rumsteak', 'jambon', 'bacon', 'lardons', 'saucisse', 'merguez', 'chipolata', 'boudin', 'andouillette', 'pâté', 'terrine', 'rillettes'],
  'Surgelés': ['glace', 'sorbet', 'pizza surgelée', 'légumes surgelés', 'frites surgelées', 'poisson pané', 'nuggets', 'cordon bleu', 'crêpes surgelées', 'pain surgelé', 'fruits surgelés', 'plat cuisiné surgelé', 'bûche glacée', 'gâteau surgelé'],
  'Épicerie': ['pâtes', 'riz', 'huile', 'sel', 'sucre', 'café', 'thé', 'chocolat', 'confiture', 'miel', 'nutella', 'céréales', 'farine', 'levure', 'maïzena', 'semoule', 'quinoa', 'boulgour', 'lentilles', 'pois chiches', 'haricots secs', 'conserves', 'sauce tomate', 'ketchup', 'mayonnaise', 'moutarde', 'vinaigre', 'épices', 'herbes', 'bouillon', 'soupe', 'biscuits', 'chips', 'crackers', 'pop-corn', 'fruits secs', 'noix', 'amandes', 'noisettes', 'cacahuètes', 'pistaches'],
  'Boissons': ['eau', 'eau gazeuse', 'jus', 'jus d\'orange', 'jus de pomme', 'soda', 'coca', 'limonade', 'vin', 'vin rouge', 'vin blanc', 'vin rosé', 'bière', 'cidre', 'champagne', 'whisky', 'vodka', 'rhum', 'gin', 'tequila', 'apéritif', 'digestif', 'sirop', 'smoothie', 'milkshake', 'café moulu', 'café en grains', 'capsules café', 'thé vert', 'thé noir', 'tisane', 'infusion'],
  'Hygiène & Maison': ['savon', 'shampoing', 'après-shampoing', 'gel douche', 'dentifrice', 'brosse à dents', 'déodorant', 'crème hydratante', 'rasoir', 'mousse à raser', 'coton', 'coton-tige', 'mouchoirs', 'papier toilette', 'essuie-tout', 'lessive', 'adoucissant', 'liquide vaisselle', 'éponge', 'sac poubelle', 'produit ménager', 'désinfectant', 'javel', 'nettoyant sol', 'nettoyant vitres'],
}
```

**`src/lib/categorizer.ts`**
```typescript
import { GROCERY_CATEGORIES } from './categoryDictionary'

export type GroceryCategory = keyof typeof GROCERY_CATEGORIES | 'Autres'

export interface CategorizedItem {
  content: string
  category: GroceryCategory
  confidence: 'high' | 'low'
}

export function categorizeItem(content: string): CategorizedItem {
  const normalizedContent = content.toLowerCase().trim()

  for (const [category, keywords] of Object.entries(GROCERY_CATEGORIES)) {
    for (const keyword of keywords) {
      if (normalizedContent.includes(keyword) || keyword.includes(normalizedContent)) {
        return {
          content,
          category: category as GroceryCategory,
          confidence: normalizedContent === keyword ? 'high' : 'low'
        }
      }
    }
  }

  return { content, category: 'Autres', confidence: 'low' }
}

export function categorizeItems(items: string[]): CategorizedItem[] {
  return items.map(categorizeItem)
}

export function groupByCategory(items: CategorizedItem[]): Record<GroceryCategory, CategorizedItem[]> {
  const groups: Record<string, CategorizedItem[]> = {}

  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
  }

  return groups as Record<GroceryCategory, CategorizedItem[]>
}
```

#### 3.2 Fichiers à modifier

**`src/types/index.ts`**
```typescript
export type GroceryCategory =
  | 'Fruits & Légumes' | 'Produits Laitiers' | 'Boulangerie'
  | 'Viandes & Poissons' | 'Surgelés' | 'Épicerie' | 'Boissons' | 'Hygiène & Maison' | 'Autres'

export interface ListItem {
  // ... existant
  grocery_category?: GroceryCategory  // NOUVEAU
}
```

**`src/components/ListDetail.tsx`**
- Option pour afficher les items groupés par catégorie (toggle)
- Auto-catégorisation à la création

---

### PHASE 4 : Système de Rappels Amélioré (2-3 jours)

**État actuel :** Un système de base existe (`src/lib/notifications.ts`) avec :
- Permissions notifications navigateur
- Stockage localStorage
- Vérification toutes les minutes
- Notification 1h avant et quand en retard

**Améliorations à implémenter :**

#### 4.1 Interface de sélection date/heure précise

**Fichiers à créer :**
- `src/components/DateTimePicker.tsx` - Composant date + heure

**Fichiers à modifier :**
- `src/components/ListDetail.tsx` - Ajouter bouton pour définir rappel avec heure précise

**UI proposée :**
```
[Icône calendrier] → Modal avec :
├── Calendrier pour choisir la date
├── Sélecteur d'heure (HH:MM)
├── Boutons rapides : "Dans 1h", "Demain 9h", "Semaine prochaine"
└── Bouton "Définir le rappel"
```

#### 4.2 Persistance en base de données

**Migration Supabase :**
```sql
-- supabase/migrations/add_reminders.sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, reminder_time)
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_time ON reminders(reminder_time) WHERE is_sent = FALSE;
```

**Fichiers à créer :**
- `src/stores/reminderStore.ts` - Store Zustand pour les rappels

**Fichiers à modifier :**
- `src/lib/notifications.ts` - Utiliser Supabase au lieu de localStorage
- `src/types/index.ts` - Ajouter type `Reminder`

---

### PHASE 5 : Vue Calendrier des échéances (2-3 jours)

**Fichiers à créer :**
- `src/components/CalendarView.tsx` - Vue calendrier mensuelle
- `src/pages/CalendarPage.tsx` - Page dédiée au calendrier

**Fonctionnalités :**
- Vue mensuelle avec points colorés sur les jours avec échéances
- Clic sur un jour → liste des items en échéance
- Navigation mois précédent/suivant
- Distinction visuelle : à venir (bleu), aujourd'hui (orange), en retard (rouge)

**Dépendance suggérée :**
```bash
npm install date-fns  # Pour manipulation des dates
```

---

### PHASE 6 : Configuration Multi-Providers LLM (3-4 jours)

**Architecture choisie :** Clés API côté serveur (admin seul) avec Vercel AI SDK

#### 6.1 Installation Vercel AI SDK

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

**Avantages de Vercel AI SDK :**
- API unifiée pour tous les providers
- Streaming natif
- TypeScript complet
- Fallback automatique possible

#### 6.2 Configuration des providers

**Variables d'environnement :**
```env
# .env (côté serveur - Supabase Edge Functions)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Provider par défaut
DEFAULT_AI_PROVIDER=openai  # ou "anthropic" ou "google"
```

#### 6.3 Edge Function pour les appels IA

**Fichier à créer : `supabase/functions/ai-process/index.ts`**

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

const providers = {
  openai: createOpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') }),
  anthropic: createAnthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') }),
  google: createGoogleGenerativeAI({ apiKey: Deno.env.get('GOOGLE_AI_API_KEY') }),
}

serve(async (req) => {
  const { prompt, action, provider = 'openai' } = await req.json()

  const model = providers[provider]

  const result = await generateText({
    model: model('gpt-4o-mini'), // ou claude-3-haiku, gemini-1.5-flash
    prompt,
  })

  return new Response(JSON.stringify({ result: result.text }))
})
```

#### 6.4 Client côté frontend

**Fichier à créer : `src/lib/aiClient.ts`**

```typescript
import { supabase } from './supabase'

export async function callAI(prompt: string, action: string) {
  const { data, error } = await supabase.functions.invoke('ai-process', {
    body: { prompt, action }
  })

  if (error) throw error
  return data.result
}
```

#### 6.5 Sélection du provider (admin)

**Option 1 : Variable d'environnement**
- Simple, changement nécessite redéploiement

**Option 2 : Table de configuration Supabase**
```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_config (key, value) VALUES ('ai_provider', 'openai');
```

---

### PHASE 7 : Intégration IA pour parsing vocal (Optionnelle - 2-3 jours)

> **Prérequis :** Phases 1-6 terminées et testées. Budget IA validé (< 50$/mois).

**`supabase/functions/ai-parse/index.ts`**
- Edge Function Supabase
- Rate limiting par utilisateur
- Appel OpenAI/Claude pour parsing intelligent

**`src/lib/aiService.ts`**
- Client pour appeler les Edge Functions
- Fallback sur parsing local si erreur/offline

**`src/hooks/useAIParser.ts`**
- Hook avec gestion d'état (loading, error)
- Cache des résultats

---

### PHASE 8 : Scan Code-barres (Alternative à Vision IA - 3-5 jours)

> **Recommandé à la place de Vision IA**

#### 8.1 Dépendances
```bash
npm install @ericblade/quagga2
```

#### 8.2 Fichiers à créer

**`src/components/BarcodeScanner.tsx`**
- Composant caméra pour scan
- Utilise quagga2 pour la détection

**`src/lib/productLookup.ts`**
- API Open Food Facts (gratuite)
- Cache local des produits scannés

---

### PHASE 9 : Vision IA (NON RECOMMANDÉE)

> **À implémenter uniquement si :**
> - Budget IA confirmé (200-500$/mois minimum)
> - Version premium de l'app avec monétisation
> - Phases 1-8 terminées

---

## Décisions Validées avec l'Utilisateur

- **Vision IA : REPORTÉE** - Trop coûteux, on commence par les fonctionnalités gratuites
- **Affichage par catégorie : OUI** - Les items seront groupés visuellement par catégorie
- **Budget IA : < 50$/mois** - Permet d'envisager le parsing IA pour la voix plus tard
- **Rappels : Heure exacte** - Date picker + time picker pour choisir précisément
- **Config LLM : Admin seul** - Clés API dans les variables d'environnement serveur
- **Vue Calendrier : OUI** - Page dédiée avec calendrier mensuel

---

## Fichiers Critiques à Modifier

| Fichier | Phases | Modifications |
|---------|--------|---------------|
| `src/components/ListDetail.tsx` | 1, 2, 3, 4 | Suggestions, bouton micro, groupement, rappels |
| `src/types/index.ts` | 1, 3, 4 | Types FrequentItem, GroceryCategory, Reminder |
| `src/stores/listStore.ts` | 1 | Tracker les items créés |
| `src/lib/notifications.ts` | 4 | Utiliser Supabase au lieu de localStorage |

## Fichiers à Créer

| Fichier | Phase |
|---------|-------|
| `src/stores/frequentItemsStore.ts` | 1 |
| `src/components/FrequentItemsSuggestions.tsx` | 1 |
| `src/hooks/useSpeechRecognition.ts` | 2 |
| `src/components/VoiceInputButton.tsx` | 2 |
| `src/lib/voiceParser.ts` | 2 |
| `src/lib/categoryDictionary.ts` | 3 |
| `src/lib/categorizer.ts` | 3 |
| `src/components/DateTimePicker.tsx` | 4 |
| `src/stores/reminderStore.ts` | 4 |
| `src/components/CalendarView.tsx` | 5 |
| `src/pages/CalendarPage.tsx` | 5 |
| `src/lib/aiClient.ts` | 6 |
| `supabase/functions/ai-process/index.ts` | 6 |
| `supabase/migrations/add_frequent_items.sql` | 1 |
| `supabase/migrations/add_reminders.sql` | 4 |

---

## Résumé des Recommandations

1. **Implémenter les Phases 1-5 en priorité** : Maximum de valeur, zéro coût
2. **Reporter la Vision IA** : Coût prohibitif pour le bénéfice
3. **Groupement par catégorie** : Activer l'affichage groupé dans ListDetail
4. **Tester sur iOS Safari** : Support Web Speech API variable
5. **Prévoir un fallback** : Message explicite si navigateur non supporté
6. **Phase 6-7 envisageable** : Le budget < 50$/mois permet d'ajouter le parsing IA voix plus tard

**Estimation totale avec toutes les fonctionnalités : 15-25 jours de développement**

**MVP (Phases 1-5) : 9-13 jours de développement, 0$ de coût récurrent**
