# Cartridge Strike

## Designa utan att kunna 3D

**[Öppna Studio](https://capstere.github.io/cartridge-strike/studio/)** för att välja mellan karaktärsdesign och banbygge. Karaktärsstudion har snabba uppgifter och ett frivilligt fokusläge. Banbyggaren har en större arbetsyta och verktygspaneler som öppnas på mobil, utan att de underliggande spelfilerna eller exportformaten ändras.

Projekten sparas lokalt i webbläsaren. **Ladda alltid ner AI-paket/ZIP** för säkerhetskopia och överlämning till FPS-utvecklingen. Designen publiceras inte automatiskt i spelet.

[Spela Floor 5](https://capstere.github.io/cartridge-strike/fps/) · [Designa en FPS-karaktär](https://capstere.github.io/cartridge-strike/character-design/) · [Bygg en ny bana](https://capstere.github.io/cartridge-strike/furniture-editor/new.html) · [Redigera Floor 5](https://capstere.github.io/cartridge-strike/furniture-editor/new.html?mode=edit-floor5) · [Spela syntetisk demobana](https://capstere.github.io/cartridge-strike/fps/?level=synthetic-demo)

Designstudion 3.6.0 bygger banprojekt i schema 2 för spelversion 0.18.0. Arkitektur och möbler har spelgeometri och kollision från samma projektdata. Du kan bygga i plan och 3D, visa FPS-utseendet, gå runt, kontrollera spelbarhet och spara/öppna JSON eller ZIP. Ett privat förhandsprov publicerar inte projektet. [Aktuell användarguide](furniture-editor/README.md) och [formatbeslut](docs/level-project-decisions.md).

## Hitta i repot

| Plats | Innehåll |
| --- | --- |
| `furniture-editor/new.*`, `furniture-editor/build/` | Ny Designstudio, projektformat, byggverktyg och validering. |
| `furniture-editor/library/` | Granskat möbelbibliotek, procedurmodeller och importstöd. |
| `src/fps/`, `fps/` | Spelmotor och webbgränssnitt. Utan nivåparameter används Floor 5. |
| `src/world.js`, `src/floor5-data.js` | Befintligt Floor 5-spår. |
| `levels/` | Tillåtna publika banor och nivåmanifest. |
| `assets/`, `vendor/`, `licenses/` | Publika spelresurser och licensinformation. |
| `tools/`, `.github/workflows/` | Bygg-, hash- och webbläsarverifiering. |
| `frontline/` | Separat historiskt importerat källpaket; rensa inte utan licens- och beroendegranskning. |

## Utveckla säkert

Kör `node --test furniture-editor/build/*.test.mjs src/fps/*.test.mjs` och `node tools/verify-owner-runtime.mjs` för koden och publiceringsmanifestet. GitHub Actions kör dessutom riktiga Chromium/WebGL- och FPS-regressioner. Vid ändring av publicerade runtimefiler ska `build-info.json` regenereras enligt repots verifieringsverktyg och Pages kontrolleras efter merge. Använd [den prioriterade spelplanen](docs/roadmap.md) för nästa förändringar.
