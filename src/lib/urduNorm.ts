/**
 * Urdu character normalization — ported from urduhack Python library + v7 Phase-1 patch.
 *
 * Maps Arabic-variant characters to canonical Urdu script so that:
 *   - WhatsApp / phone-copied Urdu text works in translation lookups
 *   - Dictionary cache keys are consistent regardless of input keyboard/app
 *   - Diacritics (tashkeel) that break dictionary lookups are stripped
 *
 * 71 character mappings covering: Alef, Be/Pe/Te, Se, Jeem/Che, He/Khe,
 * Dal/Dhal, Re/Zhe, Seen/Sheen, Sad/Dad, Tah/Zah, Ain/Ghain,
 * Fe/Qaf/Kaf/Gaf, Lam/Meem/Noon, Waw/He/Yeh, digits, and ligatures.
 */

/** Arabic-variant → canonical Urdu character map. */
const URDU_CHAR_NORM: Record<string, string> = {
  // Alef variants
  '\uFE81': '\u0622', '\uFE82': '\u0622',
  '\uFE83': '\u0623',
  '\uFE8D': '\u0627', '\uFE8E': '\u0627',
  // Be / Pe / Te / Tte
  '\uFE8F': '\u0628', '\uFE90': '\u0628', '\uFE91': '\u0628', '\uFE92': '\u0628',
  '\uFB56': '\u067E', '\uFB57': '\u067E', '\uFB58': '\u067E', '\uFB59': '\u067E',
  '\uFE93': '\u062A', '\uFE94': '\u062A', '\uFE95': '\u062A', '\uFE96': '\u062A',
  '\uFB66': '\u0679', '\uFB67': '\u0679', '\uFB68': '\u0679', '\uFB69': '\u0679',
  // Se / Jeem / Che / He / Khe
  '\uFE99': '\u062B', '\uFE9A': '\u062B', '\uFE9B': '\u062B',
  '\uFE9D': '\u062C', '\uFE9E': '\u062C', '\uFE9F': '\u062C', '\uFEA0': '\u062C',
  '\uFB7A': '\u0686', '\uFB7B': '\u0686', '\uFB7C': '\u0686', '\uFB7D': '\u0686',
  '\uFEA1': '\u062D', '\uFEA2': '\u062D', '\uFEA3': '\u062D', '\uFEA4': '\u062D',
  '\uFEA5': '\u062E', '\uFEA6': '\u062E', '\uFEA7': '\u062E',
  // Dal / Dda / Dhal / Re / Rha / Ze / Zhe
  '\uFEA9': '\u062F', '\uFEAA': '\u062F',
  '\uFB88': '\u0688', '\uFB89': '\u0688',
  '\uFEAB': '\u0630', '\uFEAC': '\u0630',
  '\uFEAD': '\u0631', '\uFEAE': '\u0631',
  '\uFB8C': '\u0691', '\uFB8D': '\u0691',
  '\uFEAF': '\u0632', '\uFEB0': '\u0632',
  '\uFB8A': '\u0698',
  // Seen / Sheen / Sad / Dad / Tah / Zah / Ain / Ghain
  '\uFEB1': '\u0633', '\uFEB2': '\u0633', '\uFEB3': '\u0633', '\uFEB4': '\u0633',
  '\uFEB5': '\u0634', '\uFEB6': '\u0634', '\uFEB7': '\u0634', '\uFEB8': '\u0634',
  '\uFEB9': '\u0635', '\uFEBA': '\u0635', '\uFEBB': '\u0635', '\uFEBC': '\u0635',
  '\uFEBD': '\u0636', '\uFEBE': '\u0636', '\uFEBF': '\u0636', '\uFEC0': '\u0636',
  '\uFEC3': '\u0637', '\uFEC4': '\u0637',
  '\uFEC5': '\u0638', '\uFEC6': '\u0638', '\uFEC7': '\u0638',
  '\uFEC9': '\u0639', '\uFECA': '\u0639', '\uFECB': '\u0639', '\uFECC': '\u0639',
  '\uFECD': '\u063A', '\uFECE': '\u063A', '\uFECF': '\u063A',
  // Fe / Qaf / Kaf (ke) / Gaf / Lam / Meem / Noon
  '\uFED1': '\u0641', '\uFED2': '\u0641', '\uFED3': '\u0641', '\uFED4': '\u0641',
  '\uFED5': '\u0642', '\uFED6': '\u0642', '\uFED7': '\u0642', '\uFED8': '\u0642',
  '\uFB8E': '\u06A9', '\uFB8F': '\u06A9', '\uFB90': '\u06A9', '\uFB91': '\u06A9',
  '\uFB4B': '\u06A9', '\u0643': '\u06A9', // Arabic kaf → Urdu ke
  '\uFB92': '\u06AF', '\uFB93': '\u06AF', '\uFB94': '\u06AF', '\uFB95': '\u06AF',
  '\uFEDD': '\u0644', '\uFEDE': '\u0644', '\uFEDF': '\u0644', '\uFEE0': '\u0644',
  '\uFEE1': '\u0645', '\uFEE2': '\u0645', '\uFEE3': '\u0645', '\uFEE4': '\u0645',
  '\uFEE5': '\u0646', '\uFEE6': '\u0646',
  '\uFB9E': '\u06BA', '\uFB9F': '\u06BA',
  // Waw / He variants / Yeh / Bari Yeh
  '\uFEED': '\u0648', '\uFEEE': '\u0648', '\uFEEF': '\u0648',
  '\uFE85': '\u0624',
  '\uFEEA': '\u06BE', '\uFBA6': '\u06BE', '\uFBA7': '\u06BE', '\uFBA8': '\u06BE',
  '\uFBA9': '\u06BE', '\uFBAA': '\u06BE',
  '\uFEE9': '\u06C1', '\uFEEC': '\u06C1', '\u0647': '\u06C1', // Arabic heh → goal he
  '\u0629': '\u06C3', // ta marbuta → te with goal
  '\uFE80': '\u0621',
  '\uFBFC': '\u06CC', '\u0649': '\u06CC', '\uFBFD': '\u06CC', '\uFEF0': '\u06CC',
  '\uFEF1': '\u06CC', '\uFEF2': '\u06CC', '\uFBFE': '\u06CC', '\uFBFF': '\u06CC',
  '\u064A': '\u06CC', // Arabic yeh → Urdu yeh
  '\uFE89': '\u0626', '\uFE8B': '\u0626', '\uFE8C': '\u0626',
  '\uFBEE': '\u06D2', '\uFBEF': '\u06D2', '\uFBF0': '\u06D2', '\uFBF1': '\u06D2',
  '\uFBF2': '\u06D3', '\uFBF3': '\u06D3', '\uFBF4': '\u06D3', '\uFBF5': '\u06D3',
  // Arabic-Indic digits → Extended Arabic-Indic (Urdu)
  '\u0660': '\u06F0', '\u0661': '\u06F1', '\u0662': '\u06F2', '\u0663': '\u06F3',
  '\u0664': '\u06F4', '\u0665': '\u06F5', '\u0666': '\u06F6', '\u0667': '\u06F7',
  '\u0668': '\u06F8', '\u0669': '\u06F9',
  // Lam-alef ligatures → component chars
  '\uFEFB': '\u0644\u0627', '\uFEFC': '\u0644\u0627',
  '\u0640': '',  // tatweel/kashida — remove
}

/**
 * Normalize Urdu text for consistent lookups and display:
 *  1. NFC normalisation
 *  2. Zero-width character removal (common in WhatsApp/SMS Urdu)
 *  3. Diacritics / tashkeel removal (harakat that break dictionary lookups)
 *  4. Arabic-variant → canonical Urdu character mapping (71 mappings)
 *  5. Collapse whitespace
 */
export function normalizeUrduText(text: string): string {
  if (!text) return ''
  // Step 1 & 2: NFC + zero-width removal
  let out = text.normalize('NFC').replace(/[\u200C\u200D\u200B\uFEFF]/g, '')
  // Step 3: Diacritics (tashkeel: harakat, shadda, etc.)
  out = out.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
  // Step 4: Character normalization — check 2-char pairs before single chars (for ligatures)
  let result = ''
  for (let i = 0; i < out.length; i++) {
    const pair = out[i] + (out[i + 1] ?? '')
    if (URDU_CHAR_NORM[pair] !== undefined) {
      result += URDU_CHAR_NORM[pair]
      i++ // skip second char of the pair
      continue
    }
    const mapped = URDU_CHAR_NORM[out[i]]
    result += mapped !== undefined ? mapped : out[i]
  }
  // Step 5: collapse whitespace
  return result.replace(/\s+/g, ' ').trim()
}

/** Is this character in the Urdu script range? */
export function isUrduChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x0600 && cp <= 0x06FF) || (cp >= 0xFB50 && cp <= 0xFDFF) || (cp >= 0xFE70 && cp <= 0xFEFF)
}

/** True if the string is primarily Urdu/Arabic script. */
export function isUrduText(text: string): boolean {
  if (!text) return false
  const total = text.replace(/\s/g, '').length
  if (total === 0) return false
  const urduChars = [...text].filter((c) => isUrduChar(c)).length
  return urduChars / total > 0.4
}
