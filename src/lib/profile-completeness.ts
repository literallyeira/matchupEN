import type { Application } from './supabase';

/** Profil tamamlama yuzdesi (0-100) */
export function getProfileCompleteness(app: {
  first_name?: string | null;
  last_name?: string | null;
  age?: number | null;
  gender?: string | null;
  sexual_preference?: string | null;
  description?: string | null;
  photo_url?: string | null;
  facebrowser?: string | null;
  extra_photos?: string[] | null;
  prompts?: Record<string, string> | null;
}): number {
  let score = 0;
  if (app.photo_url?.trim()) score += 20;
  if (app.first_name?.trim()) score += 5;
  if (app.last_name?.trim()) score += 5;
  if (app.age != null && app.age > 0) score += 5;
  if (app.gender?.trim()) score += 5;
  if (app.sexual_preference?.trim()) score += 5;
  if (app.description?.trim() && app.description.length > 20) score += 15;
  if (app.facebrowser?.trim()) score += 10;
  const extraCount = Array.isArray(app.extra_photos)
    ? app.extra_photos.filter((u) => u?.trim()).length
    : 0;
  score += Math.min(extraCount * 5, 20);
  const promptCount = app.prompts && typeof app.prompts === 'object'
    ? Object.values(app.prompts).filter((v) => v?.trim()).length
    : 0;
  if (promptCount > 0) score += 10;
  return Math.min(100, score);
}
