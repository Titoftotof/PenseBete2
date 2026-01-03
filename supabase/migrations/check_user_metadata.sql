-- Requête pour vérifier les métadonnées des utilisateurs
-- Exécute ceci dans le SQL Editor de Supabase

SELECT
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ORDER BY created_at DESC;
