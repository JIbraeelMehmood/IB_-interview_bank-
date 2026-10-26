#!/usr/bin/env node
/**
 * rebuild-translit.js — Phase 3: Merge roman_urdu_map.json + port urduhack normalization
 *
 * 1. Reads ibx-transliteration.js
 * 2. Reads roman_urdu_map.json (30,888 Urdu→Roman entries)
 * 3. Merges new entries into UR2RU (existing entries kept, new entries added)
 * 4. Generates urduhack 71-character normalization map as JS code
 * 5. Adds normalizeUrduChars() + removeDiacritics() functions
 * 6. Upgrades urduToRoman() to call normalization before lookup
 * 7. Updates stats and writes the updated file
 *
 * Usage: node rebuild-translit.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

var ROOT = __dirname;
var TRANSLIT_FILE = path.join(ROOT, 'ibx-transliteration.js');
var MAP_FILE = path.join(ROOT, 'translkation-INTEGRATIONS', 'roman-urdu-translator', 'roman_urdu_map.json');
var BACKUP = TRANSLIT_FILE + '.bak-' + Date.now();

// ── Step 0: Backup ──────────────────────────────────────────────────────────
fs.copyFileSync(TRANSLIT_FILE, BACKUP);
console.log('Backup:', BACKUP);

var js = fs.readFileSync(TRANSLIT_FILE, 'utf8');

// ── Step 1: Read and merge roman_urdu_map.json ──────────────────────────────
console.log('\n=== Merging roman_urdu_map.json ===');
var newEntries = 0;
if (fs.existsSync(MAP_FILE)) {
  var newMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  var newMapCount = Object.keys(newMap).length;
  console.log('Source entries:', newMapCount);

  // Find the UR2RU object in the JS file and merge new entries
  var ur2ruStart = js.indexOf('var UR2RU = {');
  if (ur2ruStart === -1) { console.error('ERROR: Could not find var UR2RU'); process.exit(1); }

  // Find the closing brace of UR2RU
  var depth = 0, ur2ruEnd = ur2ruStart;
  for (var i = ur2ruStart; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}') { depth--; if (depth === 0) { ur2ruEnd = i; break; } }
  }

  // Extract existing UR2RU object text
  var ur2ruObj = js.substring(ur2ruStart, ur2ruEnd + 1);

  // Build merge code: add new entries that don't already exist
  var mergeParts = [];
  Object.keys(newMap).forEach(function(k) {
    var val = newMap[k];
    if (typeof val !== 'string') val = String(val);
    // Check if key already exists in UR2RU
    var keyPattern = '"' + k.replace(/"/g, '\\"') + '":';
    if (ur2ruObj.indexOf(keyPattern) !== -1) return; // skip existing
    newEntries++;
    mergeParts.push('"' + k.replace(/"/g, '\\"') + '":"' + val.replace(/"/g, '\\"') + '"');
  });

  if (newEntries > 0) {
    var mergeCode = mergeParts.join(',');
    // Insert before the closing brace of UR2RU
    var insertPos = ur2ruEnd;
    var beforeBrace = js.substring(ur2ruStart, insertPos).trimEnd();
    var hasTrailingComma = beforeBrace.endsWith(',');
    var insertion = (hasTrailingComma ? '' : ',') + mergeCode;
    js = js.substring(0, insertPos) + insertion + js.substring(insertPos);
    console.log('New entries merged:', newEntries);
  } else {
    console.log('No new entries to merge (all already exist)');
  }
} else {
  console.log('WARNING: roman_urdu_map.json not found at', MAP_FILE);
  console.log('Skipping merge step.');
}

// ── Step 2: Add urduhack character normalization ────────────────────────────
console.log('\n=== Adding urduhack character normalization ===');

// Build the normalization map as properly quoted JS source
// Each key and value must be a quoted string like '\uFE81':'\u0622'
var normEntries = [
  ["\\uFE81","\\u0622"],["\\uFE82","\\u0622"],
  ["\\uFE83","\\u0623"],
  ["\\uFE8D","\\u0627"],["\\uFE8E","\\u0627"],
  ["\\uFE8F","\\u0628"],["\\uFE90","\\u0628"],["\\uFE91","\\u0628"],["\\uFE92","\\u0628"],
  ["\\uFB56","\\u067E"],["\\uFB57","\\u067E"],["\\uFB58","\\u067E"],["\\uFB59","\\u067E"],
  ["\\uFE95","\\u062A"],["\\uFE96","\\u062A"],["\\uFE97","\\u062A"],["\\uFE98","\\u062A"],
  ["\\uFE99","\\u0679"],["\\uFE9A","\\u0679"],["\\uFE9B","\\u0679"],["\\uFE9C","\\u0679"],
  ["\\uFE9F","\\u062B"],["\\uFEA0","\\u062B"],["\\uFEA1","\\u062B"],
  ["\\uFEA3","\\u062C"],["\\uFEA4","\\u062C"],["\\uFEA5","\\u062C"],["\\uFEA6","\\u062C"],
  ["\\uFEA7","\\u062D"],["\\uFEA8","\\u062D"],["\\uFEA9","\\u062D"],["\\uFEAA","\\u062D"],
  ["\\uFEAB","\\u062E"],["\\uFEAC","\\u062E"],["\\uFEAD","\\u062E"],
  ["\\uFEAF","\\u062F"],["\\uFEB0","\\u062F"],
  ["\\uFEB1","\\u0630"],["\\uFEB2","\\u0630"],
  ["\\uFEB3","\\u0631"],["\\uFEB4","\\u0631"],
  ["\\uFEB5","\\u0632"],["\\uFEB6","\\u0632"],
  ["\\uFEB7","\\u0633"],["\\uFEB8","\\u0633"],["\\uFEB9","\\u0633"],["\\uFEBA","\\u0633"],
  ["\\uFEBB","\\u0634"],["\\uFEBC","\\u0634"],["\\uFEBD","\\u0634"],["\\uFEBE","\\u0634"],
  ["\\uFEBF","\\u0635"],["\\uFEC0","\\u0635"],["\\uFEC1","\\u0635"],["\\uFEC2","\\u0635"],
  ["\\uFEC3","\\u0636"],["\\uFEC4","\\u0636"],["\\uFEC5","\\u0636"],["\\uFEC6","\\u0636"],
  ["\\uFEC7","\\u0637"],["\\uFEC8","\\u0637"],
  ["\\uFECA","\\u0638"],["\\uFECB","\\u0638"],["\\uFECC","\\u0638"],
  ["\\uFECD","\\u0639"],["\\uFECE","\\u0639"],["\\uFECF","\\u0639"],["\\uFED0","\\u0639"],
  ["\\uFED1","\\u063A"],["\\uFED2","\\u063A"],["\\uFED3","\\u063A"],
  ["\\uFED5","\\u0641"],["\\uFED6","\\u0641"],["\\uFED7","\\u0641"],["\\uFED8","\\u0641"],
  ["\\uFED9","\\u0642"],["\\uFEDA","\\u0642"],["\\uFEDB","\\u0642"],["\\uFEDC","\\u0642"],
  ["\\uFEDE","\\u0644"],["\\uFEDF","\\u0644"],["\\uFEE0","\\u0644"],["\\uFEE1","\\u0644"],
  ["\\uFEE3","\\u0645"],["\\uFEE4","\\u0645"],["\\uFEE5","\\u0645"],["\\uFEE6","\\u0645"],
  ["\\uFEE7","\\u0646"],["\\uFEE8","\\u0646"],
  ["\\uFB7A","\\u0686"],["\\uFB7B","\\u0686"],["\\uFB7C","\\u0686"],["\\uFB7D","\\u0686"],
  ["\\uFB88","\\u0688"],["\\uFB89","\\u0688"],
  ["\\uFB8C","\\u0691"],["\\uFB8D","\\u0691"],
  ["\\uFB8A","\\u0698"],
  ["\\uFB8E","\\u06A9"],["\\uFB8F","\\u06A9"],["\\uFB90","\\u06A9"],["\\uFB91","\\u06A9"],["\\uFB92","\\u06A9"],["\\uFB93","\\u06A9"],["\\uFB94","\\u06A9"],["\\uFB95","\\u06A9"],["\\u0643","\\u06A9"],
  ["\\uFB96","\\u06AF"],["\\uFB97","\\u06AF"],["\\uFB98","\\u06AF"],["\\uFB99","\\u06AF"],
  ["\\uFB9E","\\u06BA"],["\\uFB9F","\\u06BA"],
  ["\\uFEEE","\\u0648"],["\\uFEEF","\\u0648"],
  ["\\uFBAA","\\u06C3"],["\\uFBAB","\\u06C3"],["\\uFBAC","\\u06C3"],["\\uFEEC","\\u06C3"],["\\uFEEB","\\u06C3"],["\\uFEAD","\\u06C3"],
  ["\\uFEE9","\\u06C1"],["\\uFBA6","\\u06C1"],["\\uFEEA","\\u06C1"],["\\uFBA7","\\u06C1"],["\\uFBA9","\\u06C1"],["\\uFBA8","\\u06C1"],["\\u0647","\\u06C1"],
  ["\\uFE94","\\u0629"],
  ["\\uFBFC","\\u06CC"],["\\u0649","\\u06CC"],["\\uFBFD","\\u06CC"],["\\uFBFE","\\u06CC"],["\\uFBFF","\\u06CC"],["\\uFEF0","\\u06CC"],["\\uFEF1","\\u06CC"],["\\uFEF2","\\u06CC"],["\\uFEF3","\\u06CC"],["\\u064A","\\u06CC"],
  ["\\uFE89","\\u0626"],["\\uFE8A","\\u0626"],
  ["\\uFBA0","\\u06D2"],["\\uFBA1","\\u06D2"],["\\uFBA2","\\u06D2"],
  ["\\u0660","\\u06F0"],["\\u0661","\\u06F1"],["\\u0662","\\u06F2"],["\\u0663","\\u06F3"],["\\u0664","\\u06F4"],["\\u0665","\\u06F5"],["\\u0666","\\u06F6"],["\\u0667","\\u06F7"],["\\u0668","\\u06F8"],["\\u0669","\\u06F9"],
  ["\\uFEFB","\\u0644\\u0627"],["\\uFEFC","\\u0644\\u0627"],
  ["\\u0640",""]
];

// Generate properly quoted JS: "'\\uFE81':'\\u0622','\\uFE82':'\\u0622'"
var normLines = normEntries.map(function(e) {
  return "  '" + e[0] + "':'" + e[1] + "'";
}).join(',\n');

var URDU_CHAR_NORM_CODE = '\n' +
'// ── Urduhack character normalization (71 mappings) ─────────────────────────\n' +
'// Ported from urduhack/normalization/character.py _CORRECT_URDU_CHARACTERS_MAPPING\n' +
'// Fixes Arabic-variant characters that look identical but have different Unicode codepoints\n' +
'// Without this, Urdu text from WhatsApp/websites/phones fails dictionary lookup\n' +
'var URDU_CHAR_NORM = {\n' +
normLines + '\n' +
'};\n\n' +
'function normalizeUrduChars(text) {\n' +
"  return text.split('').map(function(c) { return URDU_CHAR_NORM[c] || c; }).join('');\n" +
'}\n\n' +
'// ── Diacritic stripping ─────────────────────────────────────────────────────\n' +
'// Removes Urdu/Arabic diacritics (harakat) that break dictionary lookup\n' +
'// Ported from urduhack/preprocessing/util.py remove_diacritics()\n' +
'function removeDiacritics(text) {\n' +
"  return text.normalize('NFC')\n" +
"    .replace(/[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED]/g, '')\n" +
"    .replace(/[\\u200C\\u200D\\u200B\\uFEFF]/g, '')\n" +
"    .replace(/\\s+/g, ' ').trim();\n" +
'}\n\n';

// Insert the normalization code right before the urduToRoman function
var urduToRomanIdx = js.indexOf('// ── Core: urduToRoman');
if (urduToRomanIdx === -1) { console.error('ERROR: Could not find urduToRoman marker'); process.exit(1); }

js = js.substring(0, urduToRomanIdx) + URDU_CHAR_NORM_CODE + js.substring(urduToRomanIdx);
console.log('Added 71-character normalization map + diacritic stripping');

// ── Step 3: Upgrade urduToRoman() to call normalization ────────────────────
console.log('\n=== Upgrading urduToRoman() ===');

var OLD_URDU_TO_ROMAN_START = "function urduToRoman(text) {\n  if(!text) return '';\n  text = String(text);";
var NEW_URDU_TO_ROMAN_START = "function urduToRoman(text) {\n  if(!text) return '';\n  text = String(text);\n  // Normalize Arabic-variant characters to canonical Urdu (urduhack)\n  text = normalizeUrduChars(text);\n  // Strip diacritics and zero-width chars before lookup\n  text = removeDiacritics(text);";

if (js.indexOf(OLD_URDU_TO_ROMAN_START) !== -1) {
  js = js.replace(OLD_URDU_TO_ROMAN_START, NEW_URDU_TO_ROMAN_START);
  console.log('urduToRoman() upgraded with normalization + diacritic stripping');
} else {
  console.log('WARNING: Could not find exact urduToRoman start');
  // Try flexible match
  var flexible = js.match(/function urduToRoman\(text\)\s*\{\s*if\(!text\) return '';\s*text = String\(text\);/);
  if (flexible) {
    js = js.replace(flexible[0], NEW_URDU_TO_ROMAN_START);
    console.log('urduToRoman() upgraded (flexible match)');
  } else {
    console.log('ERROR: Could not patch urduToRoman');
  }
}

// ── Step 4: Update stats ───────────────────────────────────────────────────
console.log('\n=== Updating stats ===');
var oldUr2ru = 12956;
var newUr2ru = oldUr2ru + newEntries;
var oldStatsPattern = 'ur2ru: 12956,';
var newStatsPattern = 'ur2ru: ' + newUr2ru + ',';
if (js.indexOf(oldStatsPattern) !== -1) {
  js = js.replace(oldStatsPattern, newStatsPattern);
  console.log('Stats updated: UR2RU', oldUr2ru, '->', newUr2ru);
} else {
  console.log('WARNING: Could not find stats pattern to update');
}

// Update the header comment
var oldHeader = 'Dictionary sizes: 13084 Roman→Urdu, 12956 Urdu→Roman, 501 English tech triples';
var newHeader = 'Dictionary sizes: 13084 Roman→Urdu, ' + newUr2ru + ' Urdu→Roman, 501 English tech triples\n * + urduhack 71-char normalization + diacritic stripping (Phase 3)';
if (js.indexOf(oldHeader) !== -1) {
  js = js.replace(oldHeader, newHeader);
  console.log('Header updated');
}

// ── Step 5: Write the updated file ─────────────────────────────────────────
fs.writeFileSync(TRANSLIT_FILE, js);
var newSize = fs.statSync(TRANSLIT_FILE).size;
console.log('\n=== Done ===');
console.log('Output file:', TRANSLIT_FILE);
console.log('File size:', (newSize / 1024).toFixed(1) + ' KB');
console.log('New UR2RU entries:', newEntries);
console.log('Total UR2RU entries:', newUr2ru);
console.log('Normalization: 71 char mappings + diacritic strip');
