# Cartridge Strike Designstudion 3.0 — skapa en egen spelmiljö

**[Öppna Designstudion](https://capstere.github.io/cartridge-strike/furniture-editor/)** (dator och mus rekommenderas).

Designstudion är ett **helt separat verktyg**. Du kan ändra möbler, väggar, fönster, glasväggar, dörrar och skissa nya golvytor. Dina ändringar är ett **förslag**, inte en ändring av live-spelet. Spelets befintliga kollision, botarnas navigation, gisslan, dörrar, spawns och regler ligger kvar exakt som i version 0.17.0.

## Så här använder du byggläget

1. Öppna Designstudion och välj **BYGG · VÄGGAR & DÖRRAR** längst upp. Välj gärna ett rum i **Hoppa till rum**.
2. Klicka **VÄGG**, **GLASVÄGG**, **FÖNSTER**, **DÖRR**, **ÖPPNING** eller **GOLVYTA**. Klicka sedan två punkter i **PLANVY** för att rita. Alla dessa verktyg finns också i listan **Verktyg**, där du även hittar passerkorts-, hiss- och terrassdörrar.
3. Klicka på en **befintlig** eller ny del för att markera den. Dra en markerad ändpunkt för att förlänga eller förkorta delen. Dra mitten för att flytta hela delen. Du kan även ange exakta **X/Z-koordinater, höjd, tjocklek och fönsterbröstning** till vänster. Verktyget fäster normalt mot **10 cm-rutnät** och andra segmentändpunkter.
4. Vill du ändra en befintlig vägg till glasvägg eller fönster? Välj väggen och byt **Typ**. Vill du ta bort en vägg/dörr? Markera den och tryck **Ta bort i skissen** eller Delete. **Ångra**, **Gör om** och **Återställ enbart byggskissen** finns i samma sidopanel.
5. Klicka **3D-VY** för att granska höjd, glas och dörrar. Skapade dörrar och öppna passager skär visuellt ut en öppning i en *kollinear* vägg i förhandsvisningen. De här öppningarna är inte utvärderade speldörrar.
6. Klicka **MÖBLER** igen om du vill möblera samtidigt. Möbler och byggdelar sparas **tillsammans** när du trycker **SPARA PROJEKT**.
7. Ladda upp den nedladdade **JSON-filen** (eller ZIP om du importerat egna GLB-modeller) till ChatGPT när du vill ha kollisionskontroll, speltest och en riktig version för GitHub.

**Färgnyckel:** rött = vägg, grönt = glasvägg från golv till tak, blått = fönster med bröstning, ljusblått = dörr; gul markering visar den valda delen. Välj **Öppen passage** för att skissa en genomgång utan dörrblad.

## Möbler och riktiga 3D-modeller

Möbelstudion 2.0-funktionerna finns kvar: **104 riktiga GLB-modeller**, kategorier, sökning, möbeldragning, rotation, duplicering, ångra/gör om, egen självförsörjande `.glb`-import upp till **8 MB**, lokal autosparning och **ZIP-export med egna modeller**. Öppna en gammal JSON från Möbelstudion 1.0/2.0 genom **Fortsätt med sparad fil**; saknas en byggdelsskiss visas originalväggarna som vanligt.

Filerna är lokala för din webbläsare tills du laddar ned ett projekt; varken modellen eller redigeringarna skickas till GitHub automatiskt. Att ta bort/måla över en vägg i skissen tar **inte** bort byggnadens ursprungliga begränsningar, skapar inte tillåtna botvägar och öppnar inte otillgängliga labb i live-spelet.

## Vad byggläget faktiskt kan och inte kan

- **Kan:** redigera och flytta befintliga vägg-/dörrsegment i förhandsvisningen; konvertera vägg till glas eller fönster; rita nya väggar, glasväggar, fönster, vanlig dörr, passerkortsdörr, hissdörr, terrassdörr och öppna passager; rita nya rektangulära golvytor; duplicera, ta bort och ångra; se ändringarna i 2D och 3D; spara och öppna projekt.
- **Kan inte automatiskt:** skapa ett spelbart nytt rum, ändra det officiella Floor 5-underlaget, redigera frihandspolygonerna för originalgolvet, beräkna brand-/säkerhetskrav, simulera hiss-/dörrmekanik, uppdatera kollisioner och AI, eller publicera en ny spelversion. *Dessa är separata, manuellt testade implementationssteg.*
- **Optimering:** färdig statisk skiss batchas som `InstancedMesh` med delade former och material. Om en ombyggnad ska in i spelet krävs ändå riktiga tester på mål-enheter, skott, dörrsvängningar, gisslan/botvägar, kollisionsyta, bildrutehastighet och minne.
- **Ritningsunderlaget:** segmenten kommer från samma offentliga `src/floor5-data.js` som spelet redan använder. Kartans modellmått är preliminära, **inte uppmätt CAD-precision**. Inga nya privata filer eller företagsritningar ingår.

## Säkerhet och arkitektur

Byggläget ligger endast under `furniture-editor/build/` och importeras aldrig av FPS-runtime. Sparformatet behåller det äldre schemat `cartridge-strike-furniture-studio` med ett valfritt fält `architecture` som bara innehåller ändrade/nya/borttagna byggdelar och egna golv. Den gamla JSON-strukturen för möbler fungerar fortfarande.

Den ursprungliga `fps/`, `src/`, `assets/`, `vendor/`, `build-info.json`, `frontline/`, `index.html`, den aktiva Google/GitHub-konfigurationen, matcher, resurser och publiceringsmanifestet ska vara **byte-identiska** med version 0.17.0. Den här leveransen får inte lägga till ett runtime-bryggsystem som automatiskt läser och applicerar sparade väggar på spelet.

## Testning

~~~sh
node --test furniture-editor/editor.test.mjs furniture-editor/library/library.test.mjs furniture-editor/build/architecture.test.mjs
node --check furniture-editor/build/build-mode.mjs
node tools/verify-owner-runtime.mjs
~~~

GitHub Actions kör dessutom ett separat **Chromium/WebGL-UI-prov**: val av originalvägg, typbyte, drag, ny glasvägg/dörr/golv, 3D-vy, ångra/gör om, autosparning, JSON-import, återställning och att det riktiga spelet aldrig startas. Detta är förhandsvisnings- och funktionsprov, **inte** automatiskt godkännande av en omritad FPS-bana.

## Hissrum12 och flera egna GLB

Biblioteket har nu **28 ursprungliga, parametriskt genererade och lågpoly-optimerade Hissrum12-modeller** i kategorin *Hissrum12 · utrustning*.
Källan är användarens öppna Hissrum12-modellbibliotek på `capstere/jedi` i revision `0ed0c4d`. En källmärkt intern cartridge-påse (`sampleBag`) är **avsiktligt utesluten**. Inga verksamhetstexter, privata foton eller verkliga arbetsinstruktioner följer med modellerna.

Vagnarna, sopkärlen, CREFORM-modellerna och annan utrustning är **dekorativa modeller** tills du uttryckligen godkänner spelintegration. Originalen är kvar i källprojektet.

Vill du lägga till många egna GLB-filer? Klicka **IMPORTERA EGNA .GLB (FLERA)** och välj upp till 20 filer. Om du väljer flera läggs de först i *Mina GLB-modeller* **utan att alla automatiskt placeras i rummet**. Klicka sedan på en modell för att placera den. Individuell GLB högst 8 MB. Dina egna modellfiler stannar i din lokala webbläsare eller i den ZIP-fil som du sparar.

**Väggplacering:** Fäst möbler mot vägg är aktiverat som standard. Dragna möbler kan stå med ungefär 12 mm luft mot väggens verkliga yta, inte med den tidigare påhittade säkerhetsmarginalen. Dörröppningar, andra möbler och blockerade rum förblir skyddade.

**Enklare bygge:** Välj ett rum och klicka på en befintlig vägg. Välj *VÄGG*, *FÖNSTER*, *GLASVÄGG* eller *+ DÖRR I VÄGGEN*. För att rita helt nytt används verktygslistan och två klick i planvyn. Ändringarna stannar i din sparade designskiss tills vi testar och godkänner en separat spel-PR.

## Privata GLB-paket från capstere/onboard (28 oktober 2026)

Nya modeller i privata `asset-portfolio/custom/optimized/` kan **provas i Designstudion utan att kopieras till offentliga GitHub Pages**. När du har de optimerade filerna lokalt:

1. Öppna **Designstudion → + LÄGG TILL OBJEKT**.
2. Välj **IMPORTERA EGNA .GLB (FLERA)** och markera upp till 20 optimerade GLB-filer samtidigt. Alternativt: lägg dem i en ZIP på datorn och välj **IMPORTERA GLB-PAKET (.ZIP)**. Vanlig Windows-ZIP (deflate) och okomprimerad ZIP stöds där webbläsaren har `DecompressionStream('deflate-raw')`; vid saknat stöd går direkt .glb-import alltid.
3. Importresultat och fel per fil visas i dialogen. De godkända filerna samlas under **Mina GLB-modeller** och placeras först när du klickar på dem.
4. Spara projektet som **ZIP** när du har placerat egna modeller. Endast GLB-filer som faktiskt används i skissen följer med i projektet. Ett stort projekt kan innehålla upp till 49 egna GLB-filer och högst 96 MiB data. Förvara ZIP-filen privat om modellen har oklar licens.

**Gränser:** 8 MiB per GLB (och ytterligare mesh-/nodbegränsningar), högst 20 GLB per import, högst 96 MiB för en import-ZIP. Skadade GLB-filer, externa resurslänkar, krypterade arkiv och komprimeringsformat som inte stöds av webbläsaren avvisas. En privat GitHub-repo kan inte automatiskt hämtas av en offentlig GitHub Pages-sida utan autentisering. Använd lokala original/optimerade filer; klistra inte in GitHub-token i sidan.

Ingen uppladdad ZIP eller modell gör automatiskt förändringar i FPS-spelet, kollisionssystemet, navigering eller offentlig asset-katalog. Rättigheter, optimering och speltest prövas separat.
