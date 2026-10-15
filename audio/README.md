# Afrikaanse stem (opsioneel, maar sterk aanbeveel)

Die speletjie werk **sonder enige klanklêers** — dan gebruik dit die toestel
se ingeboude stem (as daar ’n Afrikaanse stem is) of die grootmens lees voor.

Die meeste tablette/fone het **geen Afrikaanse stem** nie, daarom is daar
vooraf-gegenereerde MP3's (natuurlike vrouestem, `af-ZA-AdriNeural`):

```
audio/af/<cyrb53-hash-van-die-s presiese-teks>.mp3
audio/lines.json     # {hash: teks} — oudit/regen
audio/manifest.json  # {"af": [hashes...]} — wat die speletjie laai
```

`speak()` in `index.html` speel die MP3 as die hash in die manifest is,
anders val dit terug op die toestelstem. `speakSeq()` speel Luister-opdragte
as ’n reeks klein snitte ("Tik", "die ster", "dan", …). Ontbrekende lêers is
nie ’n probleem nie — daardie sin val net terug.

Her-genereer met die gratis stem (geen API-sleutel):

```bash
pip install edge-tts
python3 tools/make_voice.py                 # versamel + genereer + manifest
python3 tools/make_voice.py --collect-only  # kyk net hoeveel sinne daar is
python3 tools/make_voice.py --ids <hash>,…  # enkel sinne oor-doen
```
