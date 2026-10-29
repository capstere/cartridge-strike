# Character Design Studio 3.0 — skapa karaktärer & egna 3D-objekt

**Öppna:** https://capstere.github.io/cartridge-strike/character-design/

En enkel, fristående kreativ studio. Spelets FPS-runtime, botar och animationer ändras inte av redigeringarna i studion.

## Nya enkla kreativa funktioner i 3.0

**Kläder & tryck:** välj originaluniform, T-shirt, hoodie, jacka, piké, labbrock eller skyddsväst. Förhandsvisningens riggfästa kläder är en förenklad designprototyp; AI:n behöver skapa riktiga skinnade textilmeshar och material.

Skriv valfri text på tröjan, välj teckensnitt, färg och framsida eller rygg. Importera en **egen PNG** som tryck/logotyp eller upprepat mönster. Originalfilen måste vara PNG, högst 5 MB och högst 8 megapixlar. Studion skalar ner till 384×384 för responsiv förhandsvisning. Den optimerade bilden bevaras i projektets JSON och exporteras som **SHIRT_ARTWORK.png** i AI-paketet. Behåll din högupplösta originalfil separat om AI:n behöver den för slutlig texturkvalitet. Den enkla dekalen är inte färdigt UV-mappad tyggeometri.

**Ansikte & hår:** testa frisyrer i 3D och specificera ögonform, ögonfärg, ögonbryn, näsa, mun, ansiktsform, skägg och fräknar. Bortsett från enklare hårprototyper är dessa val **AI-designkrav**, inte automatisk skulptering av originalansiktet.

**Rita i närbild:** använd porträttstudion med riktiga 1024×1024-vyer av originalmodellens huvud – fram, vänster och höger. Rita med finger, penna eller mus; zooma 100–400 %, panorera med ”Flytta bilden” och ångra streck separat per vinkel. Tre bilder exporteras som **FACE_FRONT.png**, **FACE_LEFT.png**, **FACE_RIGHT.png**. Du kan också ladda ner aktuell närbild separat.

**Fler animationer:** uppspelningsmenyn byggs direkt från alla clipnamn i den laddade GLB-filen. Ändra uppspelningshastighet och spola. Du kan dessutom **önska** vinka, dansa, fira, klättra, hoppa hukande med mera, men dessa animationer finns inte i den ursprungliga GLB:n och måste skapas på samma skelett och sedan integreras i spelkoden av AI:n.

### Så enkelt är arbetsflödet

Välj karaktär → testa kläder → lägg till eget tryck → beskriv ansiktet → zooma och rita → exportera **AI-paket (.zip)**. Du behöver inte Blender. Gamla projektformatet v2 stöds fortfarande; nya kreativa fält är bakåtkompatibla. Projekt/ritningar försöker sparas automatiskt i webbläsaren. För säker återupptagning på en annan enhet: välj **Spara projekt (.json)**.

## Så här gör du

1. Välj **Redigera karaktär**, **Skapa ny karaktär** eller **Bygg eget objekt**.
2. För karaktärer: välj en riggad manlig/kvinnlig grundmodell och färgstil. Det här använder samma Quaternius-baserade GLB och karaktärsbibliotek som spelet.
3. Byt färger på hud, hår, kläder och skor. Testa rörelser direkt i 3D-fönstret.
4. Välj **3D-delar** och lägg till t.ex. en keps, glasögon, ryggsäck eller en egen kub, cylinder, kula, kon eller ring. Välj en del och använd enkla reglage för placering och storlek. Karaktärsdelar kan följa huvud, bröst, midja, händer och fötter.
5. Skriv valfria beskrivningar under **Mina idéer** och bifoga egna inspirationsbilder, GLB eller Blender-filer. Filerna stannar i webbläsaren och skickas endast via lokal export.
6. Rita på vyerna fram/bak/vänster/höger med finger, penna eller mus.
7. Klicka **Hämta AI-paket (.zip)** och lämna den filen till din valda 3D-AI. Ladda även upp ZIP:en här om du vill att ChatGPT hjälper dig vidare.

### Skapa en HELT NY figur – vad innebär det?

Du får ett nytt karaktärsprojekt, med valfri stil, egna delar och kreativ frihet. **Det finns fortfarande en färdig animerad basrigg under figuren**. Det är en avsiktlig fördel: AI:n har riktiga ben, skinning, animationer och spelgränssnitt att utgå från, i stället för en statisk bild utan rigg.

Studion är **inte Blender**: den skulpterar inte ett högupplöst ansikte eller målar UV-texturer. För sådana större ändringar lämnas detaljerat underlag till AI:n som levererar en slutlig riggad modell. Du slipper lära dig Blender.

### Bygg helt egna objekt

I **Bygg eget objekt** skapar du statiska 3D-prylar av former. Namnge dem, flytta dem med cm-reglage, ändra färger, skala, vrid och duplicera delarna. **Hämta mina 3D-delar (.glb)** ger en riktig glTF 2.0 binary med mesh/normals/material och objektens transform; den kan öppnas som ett statiskt utkast i kompatibla 3D-verktyg. Finare detaljer, riggning och spelkollision är ett separat integrationssteg. Props kan skapas som egna modeller och senare integreras i spel eller Designstudio efter granskning.

## ZIP-paketet

| Fil | Innehåll |
| --- | --- |
| `PROJECT.json` | Redigerbart projekt v2: färger, material, längd, kroppsbredd, delar, millimeterprecision i meter, skissbild-data och anteckningar |
| `DESIGN_SHEET.png` | Fyra faktiska 3D-vyer med ritmarkeringar |
| `FACE_FRONT.png`, `FACE_LEFT.png`, `FACE_RIGHT.png` | Detaljerade ansiktsvyer med ritningar |
| `SHIRT_ARTWORK.png` | Optimerad PNG med tröjtryck/mönster om uppladdad |
| `AI_INSTRUCTIONS.md` | Dina önskemål och exakta mått/fästpunkter samt krav för färdig spelmodell |
| `ANIMATION_CONTRACT.json` | Aktuellt originalrigg-/animationskontrakt, clipnamn och kända ben |
| `BASE_RIG.glb` | Endast karaktärer: **orörd** manlig/kvinnlig original-GLB med riktiga animationsklipp |
| `STATIC_PROTOTYPE.glb` | Om delar lagts till: **statisk** glTF 2.0-prototyp av dina skapade geometrier |
| `REFERENCE_XX.*` | Eventuella användarbifogade referenser som fortfarande finns tillgängliga lokalt |
| `README.txt` | Förklarar vad som är färdigt och vad AI ska göra |

**Viktigt:** `STATIC_PROTOTYPE.glb` är inte en färdigriggad karaktär. Originalriggen med animationer är bifogad separat. De exakta fästpunkterna (t.ex. `Head`, `spine_03`) och restkoordinater finns i projektet. AI:n måste skapa skinnade/deformerande delar, fästa dem på rätt ben och återanvända/testa originalanimationerna i slutlig GLB.

## Animationer och integration i spelet

- Dessa clips finns som krav i projektet: `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Jump_Loop`, `Crouch_Idle_Loop`, `Crouch_Fwd_Loop`, `Pistol_Idle_Loop`, `Pistol_Shoot`, `Pistol_Reload`, `Death01`.
- Basen är `assets/fps/models/quaternius-operator-male.glb` respektive `quaternius-operator-female.glb`; originallogiken finns i [character-library.mjs](../src/fps/character-library.mjs) och vapengrepp/död i [character-actors.mjs](../src/fps/character-actors.mjs).
- Spelmotorn normaliserar bashöjden till ungefär 1,69 m. Studions längd-/breddreglage visar **konceptuell** proportion; AI:n måste vid behov justera skinning, kollision och rörelser.
- Runtime lägger på boots, vest, headset, role patches och färger. En färdig GLB måste samordnas med detta så att det inte blir dubbla 3D-delar.
- Spelets originalskelett, bindpose och ben-/animationsnamn bör bibehållas. Karaktären ska testas i riktiga spelet under gång, hukning, hopp, omladdning, skott, död, med vapengrepp och på mobil.
- Studions utseendeförändringar sker **bara i studion** tills en separat spelintegration görs. Originalfiler skrivs aldrig över här.

## Spara och återuppta

- **Spara projekt (.json)** sparar även dina 2D-markeringar. **Öppna sparat projekt** läser JSON och bygger upp modellen igen.
- Webbläsaren försöker autospara projektet lokalt (ingen synk/extern uppladdning). Exportera JSON innan du byter dator eller rensar webbläsaren.
- Bifogade inspirationsfiler sparas **inte** i localStorage eller JSON av integritet-/storleksskäl. Om du återöppnar projektet måste du bifoga dem på nytt innan ZIP-export. ZIP:en innehåller de filer som finns tillgängliga vid export.
- Max 60 3D-delar, 8 referensfiler, 18 MB sammanlagd referensstorlek och 32 MB ZIP; GLB-validering följer möbelbibliotekets säkerhetsgräns.
- Ritbilder, ZIP och 3D-prototyp genereras lokalt. Ingen extern AI-API-anrop görs från sidan.

## Verifiering

`node --test character-design/*.test.mjs`

`node --check character-design/app.mjs`

Ett separat Actions-workflow kör även ett verkligt Chromium/WebGL-test av animerad figur, egna delar, JSON-projektrunda, ZIP med originalrigg och glTF-binära exporten. Inga Actions-artifakter laddas upp.

Basmodeller och animationer av Quaternius under [CC0 1.0](../licenses/quaternius-characters-CC0.txt). Kom ihåg att användarbifogat material kan omfattas av andra licenser.
