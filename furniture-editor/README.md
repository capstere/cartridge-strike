# Cartridge Strike Designstudion 3.2.0 — skapa en egen spelmiljö

**[Öppna Designstudion](https://capstere.github.io/cartridge-strike/furniture-editor/new.html)** (dator och mus rekommenderas).

**NY BANA** och **[REDIGERA FLOOR 5](https://capstere.github.io/cartridge-strike/furniture-editor/new.html?mode=edit-floor5)** använder samma plan/3D-verktyg. Golv, väggar, glas, dörrar och möbler ger automatiskt geometri och fysik. Dörrar/fönster fäster med ett klick på väggen; nya dörrar är normalt 1,20 modellenheter. Planvyn och export fungerar även utan WebGL; 3D och FPS kräver WebGL 2.

Schema 2, editor 3.2.0 och kompatibel spelversion 0.18.0 används. Exportens `project.json` är källan; `COLLISION_MAP.json` är en härledd, integritetskontrollerad karta. JSON/ZIP från den äldre studion kan öppnas utan att skissen eller ursprungliga data förloras. Den **[klassiska studion](https://capstere.github.io/cartridge-strike/furniture-editor/)** finns kvar för äldre arbetsflöden.

### Bygg en ny bana

1. Öppna `furniture-editor/new.html` och välj banans storlek i modellenheter.
2. Dra ett RUM eller klicka två hörn. Rita en KORRIDOR som ansluter till nästa rum; rita dörr över den befintliga vägglinjen eller använd **DÖRR I MARKERAD VÄGG**. Dörren behöver 1,10 modellenheter och korridoren bör vara minst 2,0 fri bredd.
3. Öppna MÖBLERA och välj ur biblioteket eller importera egna GLB lokalt. Välj PLACERA och klicka på golvet. R vrider och Esc avslutar; smarta fästen följer med sin möbel.
4. Öppna SPEL. Placera fem spawns per lag, bomb, två gisslan och rescue på golvet. Klicka **KONTROLLERA BANAN** för faktisk kapsel- och navigeringskontroll.
5. Spara ZIP och öppna den igen för att fortsätta. **PROVSPELA MIN BANA** startar en privat lokal FPS från det aktuella projektet. Publicering kräver en separat rättighetsgranskad nivå i `levels/manifest.json` via `tools/apply-level-project.mjs`.

Version 1 JSON/ZIP kan fortfarande öppnas i Floor 5-läget. Ny projektversion 2 är dokumenterad i `build/level-project.schema.json`; tekniska avvikelser från schemaförslaget finns i `docs/level-project-decisions.md`.


> Följande äldre avsnitt beskriver den klassiska studion. För det gemensamma byggläget och spelintegration gäller beskrivningen ovan och [AI_EXPORT.md](AI_EXPORT.md).

## Designstudion: tomma ytor, smart inredning, gardiner och persienner (28 oktober 2026)

**Töm ytorna:** I **MÖBLER**, klicka **TÖM ALLA YTOR** och bekräfta. De ursprungliga stolarna, borden och övriga valbara möbler tas bort från *designförslaget* och de låsta bakgrundsmodellerna för köksbänkar/skåp döljs. Fönster, väggar, dörrar och rummens golv finns kvar. Läget sparas som `emptyFixed: true` tillsammans med vanliga `removed`-poster. **Ctrl+Z** återställer i en ångeråtgärd och återställningsknappen tar tillbaka originalet. Befintligt FPS-spel påverkas inte.

**Behåll gamla objekt:** Samtliga 104 kuraterade GLB-objekt, inklusive Hissrum12-modellerna, är fortfarande åtkomliga från biblioteket, med användarens tidigare importerade egna GLB-filer kvar i den lokala katalogen. 21 nya lättviktiga objekt (utan GLB-hämtning) finns i samma bibliotek: vita 120/160/180 cm skrivbord, långa smala köksbord på 120/180/240 cm, vita runda Ø80/110/140 cm bord med silverstativ, blåa 120/160 cm bordsskärmar, vita köks- och labbänkar, mikrovågsugn, kaffemaskin, labbinstrument, datorskärm, tangentbord, skrivare och skåp. Ursprungliga spelobjekt som **inte** är katalogförda som egna GLB-filer blir inte automatiskt fullständiga separata 3D-filer; de döljs i designens tomma arbetsläge i stället.

**Smart placering:** Kryssrutan **SMART PLACERING** är förvald. Flytta kameran nära en köks-/labbänk eller ett skrivbord och välj t.ex. **Mikrovågsugn**. Vid fästning placeras apparaten på bänkens höjd och projektet sparar `mountId` samt `elevation`; motsvarande gäller blå bordsskärmar på skrivbordets bakre kant. När föremålet dras längs bänken följer det bänken, och lämnar du den får det vanlig golvplacering. Bänk- och fästgeometri kontrolleras. Ytorna i designskissen är 3D-förhandsvisning, inte ny FPS-fysik.

**Gardiner:** Byt till **BYGG → VIT GARDIN · DRA LINJE**. Dra längs valfri befintlig vägg eller fönsterlinje i PLANVY, från gardinens början till slut. En tunn halvgenomskinlig vit, lågpolyveckad gardin skapas från takhöjd till nästan golv. Det går även med två klick. Ritverktyget stannar valt för nästa gardin.

**Persienner:** Byt till **BYGG → MÖRKGRÅ PERSIENN · FÖNSTER** och klicka på en fönster- eller glasväggslinje. Persiennen dimensioneras automatiskt till den väggens fönsterbredd och visas som mörkgrå slats i 3D. Vanliga väggar och dörrar kan inte ta emot persienner. Markera objektet för att välja sida, ta bort, duplicera eller ångra.

Båda tillbehören sparas i den gamla arkitekturschemaversionens valfria `treatments`-lista; äldre projekt utan fältet öppnas som tidigare. Ändrar man en vägg så att dess tillbehör inte längre passar avvisas ändringen. Delning av en vägg med gardin/persienn på kräver först att tillbehöret tas bort, så det inte hamnar på fel vägg efter uppdelningen. Detta är **endast Designstudion** och automatiskt inget nytt innehåll i FPS-spelet.

## SMART RITA: rita fönster direkt över befintlig vägg (28 oktober 2026)

1. Välj **BYGG → ✎ SMART RITA PÅ VÄGG**. Välj **FÖNSTER**, **GLASVÄGG**, **DÖRR** eller **VÄGG** i den nya färgade panelen; grundvalet är FÖNSTER. **Du behöver inte byta verktyg** när du vill rita nästa del.
2. I **PLANVY**: dra från en punkt på en vägglinje till en annan punkt på *samma vägg* och släpp. Alternativt klickar du två punkter. Medan du ritar visas ett streck med längden och vad som kommer skapas.
3. När du släpper delas väggen automatiskt i en kvarvarande väggdel, den målade delen och en återstående väggdel. Den ursprungliga solida väggen **tas bort ur skissen över målningen**. Du kan sedan rita en till del direkt utan att lämna läget.
4. Välj en annan typ i samma panel utan att ändra verktyg. **Ctrl+Z** ångrar hela operationen (inklusive all uppdelning) i ett steg. **Esc** avbryter en påbörjad linje. Den vanliga knappen **VÄLJ** lämnar ritläget.
5. Befintliga fönster-/glasväggs-/dörrverktyg kan också rita över en redan existerande vägg: två klick längs vägglinjen ger samma automatiska delning. Starta utanför en vägg eller håll **Alt** om du avsiktligt vill rita en fristående byggdel.

**Ritregler:** Minst 25 cm målat avsnitt. Väldigt korta mindre än 25 cm väggstumpar på kanterna absorberas automatiskt i den målade delen. Verktyget nekar målning som skulle skriva över en befintlig dörr, eller skapa en omöjlig placering för en väggmonterad affisch. En affisch som ryms helt på kvarvarande vägg flyttas automatiskt till motsvarande del med bibehållen position.

**Arkitektur och prestanda:** Detta är en ren ändring i designskissens väggobjekt, inte i spelets faktiska kollisionsvärld eller navigation. Projektets arkitekturschema version 1 och befintlig save/import är fortsatt kompatibla. Möbler, live FPS, spawns, botar och runtime rörs inte.

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

Ovanstående avgränsning gällde den fristående 0.17.0-studion. Nya nivåer i 0.18.0 är uttryckligen opt-in via `?level=<manifest-id>` eller privat `?level=preview`; utan parameter startar Floor 5 genom sitt gamla världsspår.

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
