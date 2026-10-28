# Cartridge Strike Designstudion 3.0 — skapa en egen spelmiljö

**[Öppna Designstudion](https://capstere.github.io/cartridge-strike/furniture-editor/)** (dator och mus rekommenderas).

Designstudion är ett **helt separat verktyg**. Du kan ändra möbler, väggar, fönster, glasväggar, dörrar och skissa nya golvytor. Dina ändringar är ett **förslag**, inte en ändring av live-spelet. Spelets befintliga kollision, botarnas navigation, gisslan, dörrar, spawns och regler ligger kvar exakt som i version 0.17.0.


## Prototypgren: navigera utan rumsnamn och sätt upp värdeordsaffischer

**Placera objekt där du befinner dig:** Flytta kameran över önskat rum med panorerings- och zoomverktygen. Den nya rutan **DU ÄR VID** visar automatiskt vilket rum kameran står över och uppdaterar listan efter positionen. Klicka **+ LÄGG TILL OBJEKT**, välj en modell. Den placeras på närmaste tillgängliga plats runt *kamerans nuvarande mittpunkt* (max cirka 2,6 m bort). Den gamla rumsrullistan används enbart när du själv vill **Hoppa till rum**. Att öppna biblioteket och lägga till en modell flyttar **inte** kameran, ändrar inte zoom och skickar dig inte tillbaka till ett rum du besökt tidigare.

**Begränsning:** Nuvarande möbleringsvalidering tillåter endast godkända möblerbara rum från ursprungsbanan. Du kan navigera fritt över hela våningsplanet, men kan inte lägga en möbel i en otillåten korridor eller helt utanför den godkända golvytan. I så fall visas ett tydligt meddelande och kameran stannar kvar. Framtida blankt banläge får ett separat, fritt koordinatsystem.

**Affischer med värdeord:** Byt till **BYGG → AFFISCH PÅ VÄGG**. Klicka på en befintlig eller nyritad vägg i planvyn **eller på väggen i 3D**. En affisch skapas på vald vägg, direkt i designskissen. Markera affischen för att skriva en valfri rubrik och underrad, välja färg, bredd, höjd, avstånd längs väggen, upphängningshöjd och vilken sida av väggen som ska synas.

**Riktiga affischbilder:** Under vald affisch, välj en **PNG/JPG/WebP**. Designstudion läser filen lokalt, reducerar upplösningen och sparar bilden komprimerad i JSON/ZIP-projektet (upp till cirka 75 KB per posterbild). Bilderna **publiceras inte till GitHub**, skickas inte till en server och behöver inte vara GLB. Affischen visas som en tunn 3D-yta monterad på väggen. Ladda gärna upp en skärmbild av värdeordspostern med dess färdiga typsnitt och layout, så slipper du återskapa den i textfält. **Ta bort bilden** byter tillbaka till textaffischen. Max 40 affischer per projekt; bildfylld JSON-fil får vara högst 5 MB vid import.

**Säkerhet och kompatibilitet:** Rums-/byggformatet är fortfarande schema 1 med en **valfri** `posters`-lista, så tidigare sparfiler utan affischer fortsätter fungera. Ta bort vägg → dess affischer tas bort i samma ångerbara åtgärd. Justering av en vägg som skulle skapa en ogiltig affischplacering avvisas. Affischer är enbart ritförslag, inte ändringar av riktiga spelväggar eller kollisioner. Verifiera godkända rättigheter/sekretess innan du publicerar affischbilder på en offentlig webbplats.

## Prototypgren: möbelmått, fasta färger och 3D-kamera

> **Endast utvecklingsgren:** `work/design-studio-size-palette-camera-20261028`. Detta avsnitt gäller prototypen och ska inte blandas ihop med redan publicerad Designstudio.

- **Bord och skrivbord:** välj ett bord och skriv in **Längd** samt **Bredd/djup** i meter (0,15–8 m). En ändring får inte blockera dörr, passera vägg eller överlappa annan möbel. För procedurgenererade bord är skiva vit och benen silverfärgade. Kända GLB-bord får samma färgstandard och anpassas i X/Z/Y till angivna mått. **OBS:** icke-proportionell GLB-skalning kan förvränga föremålet.
- **Köksstolar:** orange som tidigare, **kontors- och labbstolar:** svarta, **konferensstolar:** blå med svarta ben. Stolkategori går att välja under **STOLTYP / FÄRGSTANDARD** för utvald stol. Placering i lunch-/pentryrum ger normalt köksstol; andra stolar klassas normalt som kontorsstol tills användaren väljer konferensstol.
- **Egen GLB som inte känns igen:** använd **VAD ÄR DET FÖR 3D-MODELL?** och välj Bord, Stol eller Annat. Då visas relevanta dimensioner och färgval. Original-GLB:n ändras inte. Färger läggs bara på en tillfällig modellkopia i redigeraren.
- **Väggar:** Vit eller Grå. **Dörrar:** Vit, Grå, Röd eller Hissdörr (metall). Välj en vägg/dörr i **BYGG**, ändra **YTFÄRG**, förhandsgranska i **3D-VY**. Planvyn behåller sina kategorifärger. Finish följer med i befintligt schema-1 projekt utan att tidigare JSON-filer blir ogiltiga.
- **Kortkommandon:** `Ctrl+D` (eller `Cmd+D` på Mac) duplicerar det markerade föremålet i möbleringsläge eller vald byggdel i byggläge. De gamla knapparna **Duplicera** finns kvar. En kopia placeras bara om det finns en ledig giltig plats.
- **3D-kamera:** håll nere **Shift** eller **Ctrl** och **dra med vänster musknapp** för att panorera framåt/bakåt/sidled över golvplanet utan att flytta möbler eller byggdelar. Vanligt drag roterar kameran på tom yta; höger musdrag fungerar för panorering som tidigare.
  
**GLB-begränsning:** Om en importerad modell har skiva och ben som *en enda mesh* kan redigeraren inte säkert ge dem två separata färger. Den färgar då den sammanhängande modellen i kroppsfärgen. För riktiga vita skivor och silvriga ben behövs GLB med separata material/mesh-delar. Kontrollera alltid mått och stil visuellt efter import.

Projektfilen förblir en designskiss. Dessa färger och mått ändrar inte själva FPS-spelet förrän den godkända designen integreras och testas separat.

## Smarta ritverktyg (28 oktober 2026)

**BYGG · VÄGGAR & DÖRRAR** har två val som är påslagna från början:

- **Fäst exakt mot väggar och hörn:** ändpunkter ansluts till redan ritade/befintliga byggdelar (även om koordinaterna inte är jämna 10 cm). Du kan också fästa på en vägglinje. Förhandsvisningen visar vilken typ av fästning som används.
- **Hjälp mig rita helt raka linjer:** om slutpunkten nästan ligger vågrätt eller lodrätt från starten blir linjen exakt rak. Håll **Alt** för frihand under ett drag eller klick. Rutnätet fungerar separat.

När du startar en ny vägg nära en befintlig vägg ärver den höjd och tjocklek därifrån. En dörr skapad med **+ DÖRR I VÄGGEN** ligger automatiskt i samma linje som den valda väggen.

Efter ritning: markera en **egen nyritad** byggdel och använd **RÄTA UPP 90°** (rätar ut relativt första ändpunkten), **STÄNG GLIPOR** (fäster ändar till väggar/hörn i närheten) eller **MATCHA HÖJD** (hämtar höjd och tjocklek från närliggande vägg). Dessa snabbknappar ändrar inte originalväggarna. Alla ändringar kan ångras. Inga nya passager blir automatiskt traverserbara i live-spelet.

**Gräns:** automatiska fästningar sker bara inom små toleranser; de ersätter inte geometrisk och kollisionsmässig validering före spelpublicering. Man kan fortfarande rita avsiktligt diagonalt eller med egna höjder. För större ombyggnader behövs separat kontroll av skott, navmesh, dörrar och kollisionsytor.

### Om sparfilens storlek och optimering

JSON innehåller främst möblerings- och arkitekturändringarna. Har du placerat egna GLB-filer medföljer dessa i ZIP-projektet; bara **använda** egna modeller tas med, inte hela privata katalogen. Projekt-ZIP har begränsningen 96 MiB och högst 49 egna modeller. Detta är en **lagrings-/överföringsgräns**, inte ett FPS-mått.

Den framtida spelversionen kan optimeras separat (instanser för likadana objekt, sammanfogning av lämplig statisk geometri, texturer, LOD, enkla kollisionsformer, culling), men alla modeller kan inte garanteras fungera i 60 FPS eller på mobil bara för att de får plats i en ZIP. Spara originalprojektet; render-, minnes-, kollisions- och botprover måste göras på målplattformen. En exporterad designfil uppdaterar aldrig live-spelet automatiskt.

## Rumsverktyget: RUM · REKTANGEL

1. Välj **BYGG · VÄGGAR & DÖRRAR** → **▣ RUM · REKTANGEL**.
2. **Rita fritt:** klicka ett hörn, rör musen tills den synliga rektangeln är lagom stor, och klicka motsatt hörn. 4 axelräta, exakt sammanfogade väggar skapas som **en** ångringsbar operation.
3. **Skapa med exakta mått:** välj rumsläge, skriv **Längd X**, **Bredd/djup Z**, **Vägghöjd**, **Väggtjocklek** och **Rumsnamn**. Klicka **ett första hörn** och sedan **SKAPA MED EXAKTA MÅTT**. Exakta mått byggs i positiv X/Z-riktning från hörnet; vill du vända riktningen använder du två klick.
4. **Skapa golv samtidigt** är förvalt. Avmarkera om du bygger på en befintlig golvyta. Golvet och väggarna följer med i JSON/ZIP.
5. **Ångra** tar bort samtliga fyra väggar och golvet i ett steg. Du kan därefter välja en enskild vägg och sätta in en dörr med **+ DÖRR I VÄGGEN**. Namnet lagras i golvytans namn.

Rummets väggar är fyra separata redigerbara byggdelar efter skapandet, inte ett parametriskt sammanhållet rum. Att flytta ett enda hörn i efterhand flyttar alltså **inte** andra angränsande väggar automatiskt; skapa om rummet med nya mått eller använd smarta fästningen om du vill göra större ändringar. Skissen påverkar inte spelets befintliga kollisions- eller navigeringssystem.

### Framtida projektläge: Ny bana från grunden (ännu ej implementerat)

Detta kräver ett **fristående banprojekt** i stället för dagens *ändringsfil mot originalkartan*: tom eller egen grundyta med valfri längd och bredd i X/Z, vägg-/våningshöjd i Y, valfria golv och våningsplan, egen kamera och rutnät. Sparformatet behöver bära grundytan och all skapad geometri, material, modellreferenser och versionerat projekt-ID utan beroende av dagens fasta `data.walls`/`data.rooms`. Därefter behövs ett **separat validerat byggsteg** för renderinstanser, kollisioner, gångbara golv, navmesh, spawns, dörrlogik och mobila prestandabudgetar.

Förslaget är att erbjuda två startval: **Redigera befintlig bana** (bakåtkompatibelt) eller **Ny tom bana**. Detta rumsverktyg är en återanvändbar byggsten men aktiverar inte ett blankt spelautomatiskt.

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
