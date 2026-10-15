// Collect every distinct Afrikaans string the game can speak, plus the
// atomic Luister-parts. Writes audio/lines.json as {cyrb53hash: text}.
// Run: node tools/enumerate.js   (from repo root)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const js = html.split('<script>')[1].split('</script>')[0];

const stubEl = () => ({ addEventListener() {}, textContent: '', innerHTML: '', disabled: false, setAttribute() {}, classList: { remove() {}, add() {}, toggle() {} }, focus() {}, dataset: {} });
const sandbox = {
  Math, JSON, Array, Object, String, Number, Set, Map,
  document: { querySelector: () => stubEl(), querySelectorAll: () => [] },
  window: {}, localStorage: { getItem: () => null, setItem: () => {} },
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(`Math.random=(()=>{let s=987654321;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();`, sandbox);
const inner = js.replace(/\}\)\(\);\s*$/, ';globalThis.G={TILES,SEQS,W,RH,SY,BL,HFW,ORD,NAME,FR,DAYS,MONTHS,SEAS,QNAMES,n2,n3,ck,nk,COL,PL,SND,PRAISE_SAID,DONE_SAID};})();');
vm.runInContext(inner, sandbox);
const { TILES, SEQS, W, RH, SY, BL, HFW, ORD, NAME, FR, DAYS, MONTHS, SEAS, QNAMES, n2, n3, ck, nk, COL, PL, SND, PRAISE_SAID, DONE_SAID } = sandbox.G;

const found = new Map();
const add = s => found.set(s, (found.get(s) || 0) + 1);
const quizTiles = TILES.filter(t => t.gen);
let quiet = 0, rounds = 0;
while (quiet < 3000 && rounds < 60000) {
  rounds++;
  const t = quizTiles[Math.floor(sandbox.Math.random() * quizTiles.length)];
  const before = found.size;
  for (const q of t.gen()) add(q.spoken);
  quiet = (found.size === before) ? quiet + 1 : 0;
}
// Storievolgorde speaks title + fixed fragments (finite: SEQS x 2).
for (const sq of SEQS) {
  add(`${sq.t}. Tik die prentjies in die regte volgorde. Wat het eerste gebeur?`);
  add(`${sq.t}. Tik die prentjies in die regte volgorde.`);
}
// Luister-en-doen is combinatorial, so the game plays atomic parts in
// sequence instead (see speakSeq in index.html): "Tik", "dan", "die <item>".
// ITEMS lives inside runLuister's scope, so extract it with balanced brackets.
function balanced(src, from) {
  let i = src.indexOf('[', from), depth = 0, start = i;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced brackets in ITEMS');
}
const itemsSrc = balanced(html, html.indexOf('const ITEMS='));
const names = [...itemsSrc.matchAll(/\[\s*'([^']+)'/g)].map(m => m[1]);
add('Tik'); add('dan');
for (const n of names) add('die ' + n);

// ---- Exhaustive template coverage (mirrors the q* builders above; sampling
// alone once missed a rare qWord combo). Lists come live from the game, so
// only the sentence shapes are mirrored here. Keep in sync with index.html.
const L = Object.keys(W);
for (const nm of QNAMES) {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= Math.min(4, 10 - a); b++)
    add(`${nm} het ${a} blokkies en kry nog ${b}. Hoeveel het ${nm} nou?`); // qWord +
  for (let a = 3; a <= 9; a++) for (let b = 1; b <= a - 1; b++)
    add(`${nm} het ${a} koekies en eet ${b}. Hoeveel bly oor?`); // qWord −
}
for (let a = 1; a <= 6; a++) for (let b = 1; b <= Math.min(5, 10 - a); b++)
  add(`Hoeveel is ${a} plus ${b}?`); // qAdd
for (let a = 3; a <= 10; a++) for (let b = 1; b <= a - 1; b++)
  add(`Hoeveel is ${a} minus ${b}?`); // qSub (spoken: voluit "minus")
for (let n = 1; n <= 10; n++) add(`Watter syfer is ${NAME[n]}?`); // qNameDig
for (let n = 0; n <= 9; n++) add(`Watter getal kom ná ${n}?`); // qAfterBefore +
for (let n = 2; n <= 10; n++) add(`Watter getal kom net voor ${n}?`); // qAfterBefore −
for (let s = 5; s <= 10; s++) add(`Tel terug: ${s}, ${s - 1}, wat kom volgende?`); // qBack
for (const o of ORD) add(`Wie is die ${o} in die ry?`); // qOrdinal
add(`Tel in 2's. Wat kom volgende?`); add(`Tel in 10's. Wat kom volgende?`); // qSkip
for (const g of RH) for (const w of g) add(`Watter woord rym met “${w[0]}”?`); // qRhyme
for (const w of SY) add(`Klap die woord. Hoeveel lettergrepe het “${w[0]}”?`); // qSyll
for (const w of BL) add(`Trek die klanke saam. ${w[2].split(' – ').map(ch => SND[ch]).join(', ')}. Watter prentjie is dit?`); // qBlend (spoken: sounds)
for (const l of L) add(`Watter prentjie begin met die klank ${SND[l]}?`); // qSndPic (spoken: sound, no quotes)
for (const l of L) for (const w of W[l]) add(`Met watter klank begin die woord ${w[0]}?`); // qSndLetter
for (const w of HFW) add(`Lees die woord. Tik dieselfde woord: “${w}”.`); // qHFW
for (const k of ck) add(`Watter muntstuk is ${k.replace('R', 'R ')}?`); // qFindCoin (spoken)
for (const k of nk) add(`Watter noot is ${k.replace('R', 'R ')}?`); // qFindNote (spoken)
for (const n of n2) add(`Wys die ${n}.`); // qFind2
for (const c of Object.keys(COL)) add(`Watter staaf is ewe lank as die ${c} een?`); // qEqualLen
for (const t of [[`Die tafel is 6 hande lank. Waarmee het ons gemeet?`],[`Die mat is 4 voete lank. Waarmee het ons gemeet?`],[`Die toring is 7 blokkies hoog. Waarmee het ons gemeet?`]])
  add(t[0]); // qHands
for (const tc of Object.keys(COL)) for (const ts of Object.keys(PL))
  add(`Hoeveel ${tc} ${PL[ts]} is daar?`); // qSort (2 eienskappe)
for (const f of FR) add(`Hoeveel ${f[1]} is daar?`); // qPicto count
for (const a of FR) for (const b of FR) if (a !== b)
  add(`Hoeveel meer ${a[1]} as ${b[1]} is daar?`); // qPicto diff
for (let i = 0; i < 7; i++) {
  add(`Watter dag kom ná ${DAYS[i]}?`); add(`Watter dag kom voor ${DAYS[i]}?`);
  add(`Vandag is ${DAYS[i]}. Watter dag was gister?`); add(`Vandag is ${DAYS[i]}. Watter dag is môre?`); // qDay
}
for (let i = 0; i < 12; i++) {
  add(`Watter maand kom ná ${MONTHS[i]}?`); add(`Watter maand kom voor ${MONTHS[i]}?`); // qMonth
}
for (const s of SEAS) add(`${s[2]} Watter seisoen is dit?`); // qSeason
for (const t of [`Ons gebruik ’n sambreel. Watter weer is dit?`,`Ons smeer sonroom aan. Watter weer is dit?`,`Ons vlieg ’n vlieër. Watter weer is dit?`])
  add(t); // qUmbrella
add(`Waar begin ons lees op ’n bladsy?`); add(`Hoe blaai ons deur ’n boek?`); // qBook
add(`Kyk na die ry. Watter een is heel links?`); add(`Kyk na die ry. Watter een is heel regs?`); // qLeftRight
add(`Watter pyl wys na links?`); add(`Watter pyl wys na regs?`); // qArrow
for (const p of PRAISE_SAID) add(p); // spoken praise (personalised)
add(DONE_SAID); // spoken on activity complete
add(`Steek jou regterhand op. Watter hand is dit?`); add(`Steek jou linkerhand op. Watter hand is dit?`); // qHand

const cyrb53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677) } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0) };
const out = {};
for (const s of found.keys()) out[cyrb53(s).toString(16)] = s;
fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'audio', 'lines.json'), JSON.stringify(out, null, 1) + '\n');
console.log('quiz tiles:', quizTiles.length, '| rounds:', rounds, '| distinct lines:', Object.keys(out).length);
