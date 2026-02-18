/**
 * Cinsiyet / yönelim uyumluluğu: kim kimi "görebilir" (possible match).
 * A, B'yi görebilir <=> A'nın aradığı cinsiyet B'nin cinsiyeti VE B'nin aradığı cinsiyet A'nın cinsiyeti.
 */
const WANTED: Record<string, Record<string, string[]>> = {
  erkek: {
    heteroseksuel: ['kadin'],
    homoseksuel: ['erkek'],
    biseksuel: ['erkek', 'kadin'],
  },
  kadin: {
    heteroseksuel: ['erkek'],
    homoseksuel: ['kadin'],
    biseksuel: ['erkek', 'kadin'],
  },
};

export function getWantedGenders(gender: string, sexualPreference: string): string[] {
  const byGender = WANTED[gender];
  if (!byGender) return [];
  return byGender[sexualPreference] ?? [];
}

export function isCompatible(
  genderA: string,
  preferenceA: string,
  genderB: string,
  preferenceB: string
): boolean {
  const wantedByA = getWantedGenders(genderA, preferenceA);
  const wantedByB = getWantedGenders(genderB, preferenceB);
  return (
    wantedByA.includes(genderB) &&
    wantedByB.includes(genderA)
  );
}
