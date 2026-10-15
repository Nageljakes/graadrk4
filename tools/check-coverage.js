const fs = require('fs'); const vm = require('vm'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const js = html.split('<script>')[1].split('</script>')[0];
const stubEl = () => ({ addEventListener() {}, textContent: '', innerHTML: '', disabled: false, setAttribute() {}, classList: { remove() {}, add() {}, toggle() {} }, focus() {}, dataset: {} });
const sandbox = { Math, JSON, Array, Object, String, Number, Set, Map,
  document: { querySelector: () => stubEl(), querySelectorAll: () => [] },
  window: {}, localStorage: { getItem: () => null, setItem: () => {} }, console };
sandbox.globalThis = sandbox; vm.createContext(sandbox);
vm.runInContext(js.replace(/\}\)\(\);\s*$/, ';globalThis.G={TILES,SEQS,cyrb53};})();'), sandbox);
const { TILES, SEQS, cyrb53 } = sandbox.G;
const man = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'manifest.json'), 'utf-8')).af);
let miss = [], n = 0;
for (const t of TILES.filter(t => t.gen)) for (let r = 0; r < 150; r++) for (const q of t.gen()) {
  n++; const h = cyrb53(q.spoken).toString(16);
  if (!man.has(h) && !miss.includes(q.spoken)) miss.push(q.spoken);
}
for (const sq of SEQS) for (const s of [`${sq.t}. Tik die prentjies in die regte volgorde. Wat het eerste gebeur?`, `${sq.t}. Tik die prentjies in die regte volgorde.`]) {
  n++; const h = cyrb53(s).toString(16); if (!man.has(h) && !miss.includes(s)) miss.push(s);
}
const parts = ['Tik', 'dan', 'ster', 'hart', 'maan', 'blom', 'vis', 'bal', 'boom', 'son', 'huis', 'kat'].map(x => x.startsWith('die ') || x === 'Tik' || x === 'dan' ? x : 'die ' + x);
for (const p of parts) { n++; const h = cyrb53(p).toString(16); if (!man.has(h) && !miss.includes(p)) miss.push(p); }
console.log('checked', n, 'utterances | missing MP3s:', miss.length ? miss : 'none');
process.exit(miss.length ? 1 : 0);
