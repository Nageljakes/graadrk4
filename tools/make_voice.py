#!/usr/bin/env python3
"""Pre-generated Afrikaans voice MP3s for Chloé se Graad R Avontuur.

Why this exists: most tablets/phones have no Afrikaans (af-ZA) voice for
browser speechSynthesis, so the game would stay silent. These MP3s play
instead whenever present (see speak()/speakSeq() in index.html), with the
device voice as automatic fallback. Works on the public GitHub Pages site.

Voice: Microsoft Edge TTS, af-ZA-AdriNeural (natural female). Free, no key:
    pip install edge-tts
    python3 tools/make_voice.py            # collect + generate missing + manifest
    python3 tools/make_voice.py --collect-only
    python3 tools/make_voice.py --ids <hash>,<hash>   # regenerate specific lines
    python3 tools/make_voice.py --manifest-only

Each line's filename is the cyrb53 hash of its exact text (must match the
cyrb53() function in index.html). Output: audio/af/<hash>.mp3 (32kbps mono
if ffmpeg is available, else raw) + audio/lines.json + audio/manifest.json.

audio/say_as.json (optional): {game_text: ssml_or_text} overrides ONLY what
is sent to the TTS engine. Filenames/hashes still come from the game text,
so the game, enumerate.js and fallbacks stay untouched. Use it when spelling
can't produce the right sound, e.g. the English name "Chloé" (KLOH-ee) via
<phoneme alphabet="ipa" ph="...">. After adding an override, delete the old
mp3(s) so they regenerate (gen skips existing files).
"""
import argparse
import asyncio
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
AFDIR = AUDIO / "af"
SAY_AS_FILE = AUDIO / "say_as.json"
VOICE = "af-ZA-AdriNeural"
PARALLEL = 4
RETRIES = 3


def cyrb53(s: str, seed: int = 0) -> int:
    h1 = 0xDEADBEEF ^ seed
    h2 = 0x41C6CE57 ^ seed
    u = s.encode("utf-16-le")
    for i in range(0, len(u), 2):
        ch = u[i] | (u[i + 1] << 8)
        h1 = ((h1 ^ ch) * 2654435761) & 0xFFFFFFFF
        h2 = ((h2 ^ ch) * 1597334677) & 0xFFFFFFFF
    h1 = (((h1 ^ (h1 >> 16)) * 2246822507) & 0xFFFFFFFF)
    h1 = (h1 ^ ((((h2 ^ (h2 >> 13)) * 3266489909) & 0xFFFFFFFF))) & 0xFFFFFFFF
    h2 = ((h2 ^ (h2 >> 16)) * 2246822507) & 0xFFFFFFFF
    h2 = (h2 ^ ((((h1 ^ (h1 >> 13)) * 3266489909) & 0xFFFFFFFF))) & 0xFFFFFFFF
    return 4294967296 * (2097151 & h2) + h1


def collect() -> dict:
    r = subprocess.run(["node", "tools/enumerate.js"], cwd=ROOT, capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        sys.exit(f"enumerate.js failed:\n{r.stderr[-2000:]}")
    lines = json.loads((AUDIO / "lines.json").read_text(encoding="utf-8"))
    # sanity: filename hash must equal cyrb53(text)
    bad = [h for h, t in lines.items() if format(cyrb53(t), "x") != h]
    if bad:
        sys.exit(f"hash mismatch for {len(bad)} lines, e.g. {bad[:3]} (JS/Python drift!)")
    print(f"hash check OK for {len(lines)} lines")
    return lines


async def gen_one(sem, h, text, send) -> str:
    import edge_tts

    out = AFDIR / f"{h}.mp3"
    if out.exists():
        return "skip"
    async with sem:
        for attempt in range(RETRIES):
            try:
                await asyncio.wait_for(edge_tts.Communicate(send, VOICE).save(str(out)), timeout=60)
                break
            except Exception as e:
                if attempt == RETRIES - 1:
                    if out.exists():
                        out.unlink()
                    return f"FAIL {e}"
                await asyncio.sleep(2 * (attempt + 1))
    shrink(out)
    return "ok"


def shrink(out: Path):
    if not shutil.which("ffmpeg"):
        return
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmpname = tmp.name
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out),
                        "-ac", "1", "-ar", "24000", "-b:a", "32k", tmpname],
                       capture_output=True)
    if r.returncode == 0:
        Path(tmpname).replace(out)
    else:
        Path(tmpname).unlink(missing_ok=True)


async def generate(lines: dict, only: set | None):
    AFDIR.mkdir(parents=True, exist_ok=True)
    say_as = json.loads(SAY_AS_FILE.read_text(encoding="utf-8")) if SAY_AS_FILE.exists() else {}
    if say_as:
        print(f"say-as overrides: {len(say_as)} lines (game text unchanged, TTS input adjusted)")
    sem = asyncio.Semaphore(PARALLEL)
    items = [(h, t, say_as.get(t, t)) for h, t in lines.items() if (not only or h in only)]
    print(f"generating {len(items)} lines ({PARALLEL} parallel)...")
    results = await asyncio.gather(*(gen_one(sem, h, t, s) for h, t, s in items))
    ok = sum(1 for r in results if r == "ok")
    skip = sum(1 for r in results if r == "skip")
    fails = [(h, r) for (h, _, _), r in zip(items, results) if r not in ("ok", "skip")]
    print(f"done: {ok} new, {skip} already had, {len(fails)} failed")
    for h, r in fails[:10]:
        print(f"  {h}: {r}")
    return not fails


def write_manifest():
    man = {"af": sorted(p.stem for p in AFDIR.glob("*.mp3"))} if AFDIR.exists() else {"af": []}
    (AUDIO / "manifest.json").write_text(json.dumps(man) + "\n")
    total = sum(p.stat().st_size for p in AFDIR.glob("*.mp3"))
    print(f"manifest: af={len(man['af'])} files, {total/1048576:.1f} MB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--collect-only", action="store_true")
    ap.add_argument("--manifest-only", action="store_true")
    ap.add_argument("--ids", help="comma-separated hashes to (re)generate")
    args = ap.parse_args()
    if args.manifest_only:
        write_manifest()
        return
    lines = collect()
    if args.collect_only:
        return
    only = set(args.ids.split(",")) if args.ids else None
    try:
        ok = asyncio.run(generate(lines, only))
    except ImportError:
        sys.exit("edge-tts not installed: pip install edge-tts")
    write_manifest()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
