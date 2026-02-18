-- MatchUp: Like / Dislike / Match verilerini sıfırla (test için)
-- Supabase SQL Editor'da çalıştır. DİKKAT: Tüm like, dislike ve eşleşmeler silinir!

-- Sıra önemli: foreign key'ler yüzünden önce matches, sonra rejected_matches, sonra likes/dislikes
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE rejected_matches CASCADE;
TRUNCATE TABLE likes CASCADE;
TRUNCATE TABLE dislikes CASCADE;

-- (İsteğe bağlı: logs tablosundaki eşleşme loglarını da temizlemek istersen)
-- DELETE FROM logs WHERE action IN ('create_match', 'delete_match');
