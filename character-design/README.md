# Character Design Studio — Cartridge Strike

**Öppna:** https://capstere.github.io/cartridge-strike/character-design/

Det här är en separat, icke-destruktiv skiss- och exportvy. FPS-spelet ändras inte.

## Användning

1. Välj **manlig** eller **kvinnlig** grundmodell och önskad lagfärg.
2. Se samma riggade spelkaraktär framifrån, bakifrån, vänster och höger. Välj stå, gå eller huka. **Vänd fram/bak** om modellen upplevs bakvänd.
3. Rita med finger, penna eller mus direkt ovanpå referensvyerna. Välj pennfärg och tjocklek.
4. Skriv på vanlig svenska hur ansikte, hår, kläder, skor och utrustning ska förändras.
5. Hämta **Character Design Sheet PNG**, **AI-brief JSON** och relevant **original-GLB**. Skicka alla tre till den AI/3D-tjänst som ska göra arbetet. Det finns även en kopierbar AI-instruktion.
6. För papper eller skannade handritningar: skriv ut sidan till PDF, rita på utskriften, skanna/fotografera och skicka bilden tillsammans med GLB och AI-brief.

Du kan även bifoga egna inspirationsbilder och dina .blend-modeller direkt till AI-tjänsten. Beskriv då vad som ska överföras från inspirationsmodellen till *den befintliga spelriggen*.

## Var finns den riktiga karaktären?

| Syfte | Fil |
| --- | --- |
| Riggad, animerad manlig originalbas | [quaternius-operator-male.glb](../assets/fps/models/quaternius-operator-male.glb) |
| Riggad, animerad kvinnlig originalbas | [quaternius-operator-female.glb](../assets/fps/models/quaternius-operator-female.glb) |
| Material/utrustning som spelet bygger ovanpå grundmodellen | [character-library.mjs](../src/fps/character-library.mjs) |
| Koppling till spelmekanik, vapengrepp och dödsanimation | [character-actors.mjs](../src/fps/character-actors.mjs) |
| Modeller och animationslicens | [quaternius-characters-CC0.txt](../licenses/quaternius-characters-CC0.txt) |

GLB-modellerna är Quaternius-baserade och licensierade under CC0 1.0. Spelversionen har modifierad klädsel och ommappade animationer.

## Tekniskt kontrakt för en AI som reviderar originalet

- Gör en **visuell revision** av befintlig modell. Utgå från bifogad GLB; generera inte en orelaterad 3D-karaktär.
- **Bevara skeleton/rigg, benens namn, hierarki, bindpose och skinning** eller leverera dokumenterad kompatibel re-targeting som verifierats mot originalanimationerna.
- Bevara animationerna och särskilt de som spelkoden uttryckligen kräver: Idle_Loop, Walk_Loop, Crouch_Idle_Loop, Pistol_Idle_Loop, Pistol_Reload, Death01. Spelkoden använder även fler clips, till exempel Jump_Loop, Jog_Fwd_Loop, Sprint_Loop, Crouch_Fwd_Loop och Pistol_Shoot.
- Bibehåll originalorientering och proportioner. Runtime normaliserar karaktärens höjd till ungefär **1,69 m**. Hand- och vapensockets styrs av existerande ben.
- Glöm inte deformering av skor/byxben, axlar och kläder vid gång, hukning och dödsanimation.
- Färdig leverans: **glTF 2.0 (.glb)** med material, texturer, skinning, animationer, ortografiska referensbilder och ändringslogg. Kontrollera storlek och mobilprestanda.
- Modellen ska **integreras separat** i spelet. Spelet ändrar materialfärger baserat på materialnamn och lägger till boots, väst, headset, patches, bälte och annat via character-library.mjs. Om AI bygger dessa detaljer direkt i GLB måste motsvarande runtime-delar avaktiveras/justeras för att undvika dubbla objekt.
- Ingen AI-redigering ska skriva över originalfilerna. Importera först som nytt filnamn och testa rörlighet, reload, skjutning, död och alla lagfärger.

## Teknik och verifiering

Studion laddar **samma GLB-filer och samma createAuthoredAvatar()** som den publicerade FPS-koden. Den gör bara frysta ortografiska referensrenderingar. Ritningen ligger i separata 2D-canvaslager och ändrar aldrig själva 3D-modellen. Vid modell- eller posebyte rensas ritlagren, så exportera innan du byter.

Sidan kräver en WebGL-kompatibel webbläsare och fungerar efter Pages-publicering på samma ursprung som spelet. Det är en statisk sida utan server, externa AI-anrop eller uppladdning av personliga skisser. Exporterade filer skapas lokalt i webbläsaren.

### Testchecklista

1. På GitHub Pages: se att båda könen kan laddas och att de fyra ortografiska bilderna syns.
2. Byt mellan Analysts, Counter Analysts och Visitor; bekräfta att utrustning och färger ändras.
3. Byt stå, gå, huka och kontrollera att leder/kläder sitter kvar.
4. Rita i alla fyra vyer på dator/mobil, hämta PNG och kontrollera att röda linjer följer med.
5. Hämta JSON och verifiera att det står rätt originalmodell, designval och krav.
6. Testa att kopiera prompt och att skriva ut till PDF.
7. Kontrollera att spelet fortfarande spelar som innan; inga spelruntimefiler har ändrats.
