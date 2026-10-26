import fs from 'node:fs'
const P = '/tmp/parts'
const R = n => JSON.parse(fs.readFileSync(`${P}/${n}.json`, 'utf8'))
const bank = JSON.parse(fs.readFileSync('/tmp/bank.json', 'utf8'))
const OUT = '/home/jibdev/Downloads/modern --ai---interviweer/interview-box-pwa/public/data'
const SRC = '/home/jibdev/Downloads/modern --ai---interviweer/interview-box-pwa/src/lib'
const w = (p, o) => fs.writeFileSync(p, JSON.stringify(o))

// ---- bank: split into a compact shape, keep codes stable ----
const techs = R('BASE_TECHS')
const techSlugs = new Set(techs.map(t => t[0]))
const parts = [...new Set(bank.map(q => q.p))].sort()
const chapters = [...new Set(bank.map(q => q.c))].sort()
const techList = []
for (const [slug, label, kws] of techs) {
  techList.push({ slug, label, keywords: kws })
}
w(`${OUT}/bank.json`, bank)
w(`${OUT}/meta.json`, { parts, chapters, techs: techList, count: bank.length, builtAt: '2026-09-25' })

// ---- lexicons + dictionary + prompt rules ----
w(`${OUT}/lexicons.json`, { ur: R('LEX_UR'), hi: R('LEX_HI'), ru: R('LEX_RU'), ruNorm: R('RU_NORM') })
w(`${OUT}/dictionary.json`, R('DICT_RAW'))
w(`${OUT}/prompts.json`, { trStyle: R('TR_STYLE'), hiStyle: R('HI_STYLE'), ruSpell: R('RU_SPELL') })

// ---- SQL lab ----
w(`${OUT}/sqllab.json`, { seed: R('LAB_SEED'), exercises: R('LAB_EX') })

// ---- speaking coach content ----
w(`${OUT}/speaking.json`, {
  sounds: R('SP_SOUNDS'), fixes: R('SP_FIX'), phrases: R('SP_PHR'),
  fnWords: R('SP_FN'), tabs: R('SP_TABS'), breathing: R('SP_BR'),
  practiceQs: R('SP_QS'), core: R('SP_CORE')
})

console.log('bank', bank.length, 'parts', parts.length, 'chapters', chapters.length, 'techs', techList.length)
console.log('lex ur/hi/ru/norm', R('LEX_UR').length, R('LEX_HI').length, R('LEX_RU').length, R('RU_NORM').length)
console.log('dict', R('DICT_RAW').length, 'sqlex', R('LAB_EX').length, 'seedstmts', R('LAB_SEED').length)
console.log('sounds', Object.keys(R('SP_SOUNDS')).length, 'fixes', R('SP_FIX').length, 'phrases', R('SP_PHR').length)
