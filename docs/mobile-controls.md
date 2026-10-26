# Cartridge Strike 0.13.4 – mobilstyrning

Originalspelet kan spelas med telefonens pekskärm utan mus, tangentbord eller Pointer Lock. Mobilstyrningen startar automatiskt på telefoner och andra enheter som rapporterar `(pointer: coarse)` plus stöd för touch.

## Kontroller
- **Vänster tumme:** Flytta den flytande joysticken för att gå och sidoförflytta dig.
- **Höger tumme:** Dra över den öppna högra halvan för att sikta.
- **ELD:** Håll för att skjuta (automatvapen), tryck för enkel skott.
- **HOPP, HUKA, SMYG:** Håll medan du rör dig.
- **HÅLL E:** Håll för att interagera, desarmera, plantera eller använda dörrar.
- **LADDA:** Ladda om. **VAPEN:** Byt till senast använda vapen. **GRAN.:** Välj nästa tillgängliga granat. **SLÄPP:** Släpp föremål.
- **KÖP:** Öppna vapenbutiken under köpfas (eller när som helst i Endless).
- **PAUS:** Pausa och återuppta via `FORTSÄTT`. **SPELA IGEN:** Starta om när spelaren eliminerats i klassiskt läge.

Datorns WASD, mus, Pointer Lock och tillhörande kommandon är kvar och förändras inte. Originalspelets banor, AI, regler och spelbalans är oförändrade.

## Grafik och kompatibilitet
Första besöket på en touch-enhet väljer automatiskt grafik **Låg** (om inget tidigare sparat grafikval finns). Mobilläget inaktiverar MSAA, minskar internt pixelförhållande, skippar tung shaderförkompilering och använder den befintliga ambientbelysningen. Menyn och HUD anpassas för små skärmar. Grafik kan ändras manuellt i menyn.

Spela helst med telefonen liggande. Webbläsaren försöker använda liggande fullskärmsläge där API:erna tillåter det, men iOS Safari kan kräva att användaren själv roterar telefonen. Spelet behöver inte installeras som PWA.

## Automatiska tester
`.github/workflows/mobile-original-fps.yml` kör `tools/mobile-smoke.cjs` i Chromium och kontrollerar: iPhone-liknande touchmiljö utan Pointer Lock, start av spelet, mobilgrafik, två fingrar samtidigt (rörelse + skjutning), sikte, paus, fortsatt spel samt desktopstart med kvarvarande musstyrning.

**Begränsning:** Chromium med mobil-emulering är inte ett verkligt Safari-test på iPhone. Manuell körning på fysisk iPhone återstår som separat kompatibilitetskontroll.
