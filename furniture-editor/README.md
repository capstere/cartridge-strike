# Cartridge Strike Möbelstudion 2.0 — Objektbibliotek

**[Öppna Möbelstudion](https://capstere.github.io/cartridge-strike/furniture-editor/)** — en separat 3D-redigerare. Det riktiga spelet och dess kollisionsmotor ändras inte när du inreder här.

## Börja inreda (dator rekommenderas)

1. Öppna Möbelstudion och välj **rum** (t.ex. Stora lunchrummet).
2. Klicka **+ LÄGG TILL OBJEKT**.
3. Välj bland **76 riktiga GLB-modeller** från kategorierna stolar, bord, kontor, kök, badrum, labb, industri och dekoration. Sök t.ex. **kyl**, **handfat**, **soffa**, **instrument** eller **växt**.
4. Klicka på en modell för att placera den i en ledig position i valt rum. Flytta genom att **dra** och vrid med **Q/E** eller **Vrid vänster/höger**. En grönblå markör visar riktningen.
5. Klicka **SPARA PROJEKT**. Utan egna GLB-filer laddas en **JSON** ned. Om du importerat egna GLB-filer laddas en **ZIP** ned som innehåller både `projekt.json` och exakt de 3D-filer som projektet använder.
6. För att fortsätta senare, tryck **Fortsätt med sparad fil** och välj JSON/ZIP. Projektet autosparas även i samma webbläsare (egna GLB lagras i IndexedDB om utrymme finns).

**Importera egen GLB:** Öppna **+ LÄGG TILL OBJEKT** och tryck **IMPORTERA EGEN .GLB**, eller dra en `.glb`-fil till den stora 3D-vyn. En giltig, fristående glTF 2.0-modell (max 8 MB) placeras i valt rum. Externa textur-/filreferenser eller externa JavaScript-resurser tillåts inte. Se till att du har rätt att använda filen.

Om det inte finns plats i ett rum visar redigeraren ett meddelande i stället för att skapa en kollision med dörr eller vägg. Välj ett större rum eller flytta möbler först. **Ångra/Gör om** fungerar som tidigare. Modeller kan **dupliceras** och **tas bort** i redigeraren utan att själva spelet påverkas.

**Vill du faktiskt använda möbleringen i spelet?** Skicka JSON- eller ZIP-filen i ChatGPT och be om säker integration/testning i GitHub. Ingen JSON/ZIP ändrar live-spelet av sig själv.

## Vad som ingår i biblioteket

- **72 licensierade Kenney CC0 GLB-modeller**, med egna små WebP-förhandsbilder, utvalda från Furniture Kit, Space Kit och Food Kit. Varje fil laddas bara när ett objekt faktiskt placeras i 3D-vyn. Ingen extern CDN eller livehämtning från tredjepart görs av redigeraren.
- **4 befintliga NORD-01-modeller** som redan ligger i publicerad Cartridge Strike (`assets/fps/models/`). De refereras via samma filer; inga nya kopior behövs.
- Exempel: vanliga och moderna stolar, kontorsstol, fåtöljer, soffor, bokhyllor, bord, kylskåp, mikrovågsugn, diskho, kaffemaskin, toalett, handfat, växter, datorer, transportlådor, verktygsväska, elektroniska sci-fi-instrument och teknisk utrustning.

**Källor och licens:**

- Kenney Furniture Kit: https://kenney.nl/assets/furniture-kit — CC0 1.0.
- Kenney Space Kit: https://kenney.nl/assets/space-kit — CC0 1.0.
- Kenney Food Kit: https://kenney.nl/assets/food-kit — CC0 1.0.
- Reproducerbar, inbäddad GLB-mirror: https://github.com/Hidencod/tge-assets, låst till `37f5baddf99899547ae661668880809c42b450f0`; `library/import_cc0.py` hämtar endast vår godkända modelllista och verifierar att alla GLB-filer är självförsörjande och licenssidan innehåller Kenneys CC0-deklaration.
- Publicerade NORD-01-modeller: befintlig licens och spårning under `licenses/nord01-original.txt`.

Modellstorlekar i biblioteket är **preliminära inredningsmått** för förhandsvisningen, inte verkliga uppmätta dimensioner. Sci-fi-utrustning är endast fiktion. Eventuella importerade egna filer är **inte** verifierade som CC0 automatiskt.

## Säkerhet och prestanda

Redigeraren finns enbart under `/furniture-editor/`. Den importerar inte spelets `app.mjs`, fysik, botar, RNG eller FPS-renderer och skriver aldrig över `src/floor5-data.js`, `src/world.js`, `assets/fps`, `fps/` eller `build-info.json`. Den befintliga spelversionen är fortfarande 0.17.0. All redigering är en granskad **projektfil**, inte en direkt spelpatch.

Visuella placeringskontroller är konservativa approximativa kollisionsvarningar. Verkliga spawns, dörrsvängning, GLB-kolliderare, botnavigation och spelregler måste valideras innan JSON/ZIP implementeras i spelet. **Labbinredningen är generisk** och får inte representeras som bekräftade verkliga instrument eller arbetsprocedurer.

Modellerna hämtas bara vid behov, med cache och återanvända källgeometrier. Preview-symboler används tills riktig GLB hunnit laddas. Import kan ha en temporär minnesbelastning. Den ursprungliga spelmotorn laddar **inte** biblioteket.

## Tekniska tester

Från repository-roten:

```sh
node --test furniture-editor/editor.test.mjs furniture-editor/library/library.test.mjs
node tools/verify-owner-runtime.mjs
```

Ett separat GitHub Actions-jobb lägger in alla 72 tillåtna GLB+WebP via det immutabla Kenney-mirroret, skriver en SHA-256-förteckning och testar därefter riktig Chromium/WebGL, placering, äldre JSON-projekt, GLB-import, ZIP-export/-import och att `window.__fps` aldrig startas. CI jämför dessutom alla ursprungliga spel-filers byte mot 0.17.0-basen.
