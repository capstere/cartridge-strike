# Floor 5 – gardiner och mörka ytskikt (Designstudio 5.6)

Detta gäller **Ny bana** och **Redigera Floor 5**. Glasloggan och kontorsglasets ursprungliga blå motiv ändras inte.

## Gardiner på insidan av fönsterväggar

1. Välj **Bygg → Fler byggverktyg → Gardin**.
2. Klicka på fönstret/glasväggen i **Bygg i 3D** från rummets insida. Den exakta träffnormalen väljer sidan. Om du bygger ovanifrån väljer verktyget den enda gångbara rumssidan när det går.
3. Gardinen täcker hela fönstersegmentet och är **Vit heltäckande · ogenomskinlig** som standard. Den har ett slutet tygstycke bakom vecken så att rummet bakom inte syns.
4. Klicka på gardinen och använd **Byt sida på glasväggen ↔** om den sitter mot fel rum. Detta är viktigt när det finns rum på båda sidor om samma glasvägg.
5. Byt **Gardintyp** till **Ljus tunn gardin** om du vill ha det äldre genomskinliga utförandet. Äldre gardiner utan `style` behåller det genomskinliga utseendet.

Gardiner är icke-kolliderande arkitekturdekorationer. Fönster, glas, blå grafik och existerande fysik förblir orörda. Persienner får samma möjlighet att byta sida.

**Färgmatchad gardin efter referensbild:** Inte implementerad i denna uppdatering eftersom den referensbilden inte finns bland de tillgängliga bilagorna. Vi gissar inte färgerna.

## Golv och väggar

Markera en golvyta → **Golvtyp**:
- **Mörkt kakel**
- **Mörkgrå glansigt laminat**
- **Mörkgrå stora rektangulära stenplattor · ljus fog**

Markera en solid vägg → **Väggmaterial** → **Vitt kakel · ljusgrå fog**. Alternativet ändrar inte glasytor eller loggor.

Alla fyra mönstren genereras lokalt från små CanvasTexture-ytor med UV-koordinater i modellenheter. Samma shaderparametrar och material används i 3D-byggläge och FPS-renderare. Inga externa bilder laddas ner, och ingen vägg, dörr, golvgeometri eller kollision flyttas. Materialvalen lagras i schema-2-projektet (`floorFinishes` och valfria `surfaceMaterials`) och följer JSON/ZIP samt Ångra/Gör om. Ursprungliga Floor 5-filer ändras inte.

## Tester

`pattern-presets.test.mjs` testar ID, validering, väggdelning, oförändrat glas/motiv och schema-2-rundtur. `treatments.test.mjs` testar insida, framsida/baksida, äldre gardiner och nya täta gardiner. Den vanliga CI-kedjan kör dessutom editor, Floor 5, FPS/WebGL och ZIP-kontroller. Verifiering på fysisk mobil ingår inte.
