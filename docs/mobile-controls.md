# Cartridge Strike 0.13.5 – mobilstyrning och rekyl

Originalspelet kan spelas med telefonens pekskärm utan mus, tangentbord eller Pointer Lock. Mobilstyrningen startar automatiskt på telefoner och andra enheter som rapporterar `(pointer: coarse)` plus stöd för touch.

## Kontroller
- **Vänster tumme:** Flytta den flytande joysticken för att gå och sidoförflytta dig.
- **Höger tumme:** Dra över den öppna högra halvan för att sikta.
- **Automatisk eld (standard på mobil):** När siktet ligger på en synlig fiende skjuter vapnet av sig självt, med rätt eldhastighet. Inget skott genom en vägg, en lagkamrat, gisslan eller rök.
- **ELD (valfritt):** Stäng av `Automatisk eld på mobil` i spelets Inställningar så kommer den manuella skjutknappen tillbaka. Raketer och granater skjuts/kastas enbart manuellt.
- **HOPP, HUKA, SMYG:** Håll medan du rör dig.
- **HÅLL E:** Håll för att interagera, desarmera, plantera eller använda dörrar.
- **LADDA:** Ladda om. **VAPEN:** Byt till senast använda vapen. **GRAN.:** Välj nästa tillgängliga granat. **SLÄPP:** Släpp föremål.
- **KÖP:** Öppna vapenbutiken under köpfas (eller när som helst i Endless).
- **PAUS:** Pausa och återuppta via `FORTSÄTT`. **SPELA IGEN:** Starta om när spelaren eliminerats i klassiskt läge.

Datorns WASD, mus, Pointer Lock och tillhörande kommandon är kvar. Vapenbalansen för skada och eldhastighet är oförändrad.

## Riposte-inspirerad rekyl på alla spelarvapen
De synliga vapnen följer en kategoribaserad rekyl inspirerad av originalkoden [Riposte 5.6.0](https://github.com/BenDBSS/Riposte-Frontline-Source/blob/main/src/07ca-recul.js) (MIT): automatkarbiner klättrar allt mer och drar i sidled i en längre salva, SMG hoppar lite, och pistol/hagel/sniper gör kraftigare separata ryck. Bazooka har ett eget tungt ryck. Det gäller både dator och mobil, men telefonen har 25 % mjukare rekyl för att kompensera för styrning med tummen. Rekylen förstärks av att springa/hoppa och dämpas av hukning.

En kort salva faller delvis tillbaka mot den tidigare siktpunkten ungefär en halv sekund efter skotten, och den återhämtning du själv gör genom att dra musen/fingret nedåt räknas av så att kameran inte överkompenserar. Botarnas beteende är oförändrat. Den ursprungliga kodens MIT-notis finns i `licenses/riposte-MIT.txt`, med licensundantagen i `licenses/riposte-NOTICE.md`.

## Grafik och kompatibilitet
Första besöket på en touch-enhet väljer automatiskt grafik **Låg** (om inget tidigare sparat grafikval finns). Mobilläget inaktiverar MSAA, minskar internt pixelförhållande, skippar tung shaderförkompilering och använder den befintliga ambientbelysningen. Menyn och HUD anpassas för små skärmar. Grafik kan ändras manuellt i menyn.

Spela helst med telefonen liggande. Webbläsaren försöker använda liggande fullskärmsläge där API:erna tillåter det, men iOS Safari kan kräva att användaren själv roterar telefonen. Spelet behöver inte installeras som PWA.

## Automatiska tester
`.github/workflows/mobile-original-fps.yml` kör `tools/mobile-smoke.cjs` i Chromium och kontrollerar: iPhone-liknande touchmiljö utan Pointer Lock, start av spelet, mobilgrafik, två fingrar samtidigt (rörelse + manuell skjutning), sikte, automatisk eld på fiender, automatisk halvautomatisk avfyrning, rekyl, paus, fortsatt spel samt desktopstart med kvarvarande musstyrning. Kompletterande Node-tester provar fiende/lagkamrat/vägg/rök och rekylen per vapentyp.

**Begränsning:** Chromium med mobil-emulering är inte ett verkligt Safari-test på iPhone. Manuell körning på fysisk iPhone återstår som separat kompatibilitetskontroll.
