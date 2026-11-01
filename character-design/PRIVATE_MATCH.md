# Min egen karaktär i en privat provmatch

Den här piloten kopplar ihop Character Design Studio med spelets befintliga karaktärs- och animationssystem. Ingen installation eller kommandorad behövs.

1. Öppna **Character Design Studio** och klicka **Ny Male-pilot · T-shirt & sneakers** under projektvalet. Ditt tidigare projekt sparas i **Min ateljé** innan den nya piloten öppnas.
2. Ge designen ett namn. Välj färger under **Kläder**. Under **Eget tryck eller mönster** kan du skriva egen text eller välja en PNG och justera placeringen.
3. Klicka **Export / privat provmatch ↗**, sedan **Prova i privat match**. Projektet sparas och den synliga designen exporteras automatiskt till en lokal GLB.
4. Klicka **Starta match** i spelet. Du spelar på Analysts. Du och lagkamrat **A-02** använder din design. Se honom framifrån för att kontrollera trycket; följ honom när han går och hukar.
5. För att ändra designen: gå tillbaka till menyn och välj **Tillbaka till min design**. För ett vanligt spel: **Spela med originalkaraktärerna**.

Designen finns bara i den här webbläsaren på den här enheten. Den skickas inte till GitHub eller någon server. URL:en är ingen delningslänk. Spara gärna också **Spara projekt (.json)** som en egen säkerhetskopia. De tre senaste provmodellerna behålls; namngivna ateljéprojekt tas inte bort när en äldre provmodell rensas.

## Verifierad omfattning

- Quaternius Male med originalproportioner, passform 100 %, originalhuvud och originalfrisyr, T-shirt, sneakers, färger och tryck.
- 65 ben och 13 befintliga animationsklipp. Spelet använder sin ordinarie gång, hukning, vapenrörelse och dödsanimation.
- Kläderna använder studions befintliga viktade geometri. T-shirten har färgade korta ärmar och sneakers är studions befintliga skovariant. Detta är inte nysydd klädgeometri. Den gamla triangulerade midjeskarven blir synlig med starkt kontrasterande tröj- och byxfärg; startdesignen använder samma färg.
- Förstapersonshänderna och vapnen är fortfarande spelets original. Andra botar använder vanliga lagutseenden. Det finns ingen nätverksmultiplayer eller offentlig publicering av din modell i detta flöde.
- Extra delar, ändrade kroppsproportioner, skulpterat huvud, ny frisyr och tygsimulering stoppas med en förklaring i denna pilot. De kan fortfarande användas i studions övriga arbetsflöden. Projektet förenklas aldrig automatiskt.
- SPEL/Procreate är fortfarande en separat väg. Den här knappen laddar studions GLB direkt i provmatchen och utlovar inte generell Procreate-kompatibilitet.

## Tekniskt kontrakt och återställning

Studion sparar först projektet och en GLB med alla bilder inbäddade. En separat IndexedDB-post innehåller källmodellens SHA-256 och exportens SHA-256. Spelet kontrollerar båda före laddning. Exporten begränsas till 24 MiB, 32 mesh, 24 material, 32 bilder och 180 noder; externa resurser och obligatoriska tillägg tillåts inte. Källmodellen eller de vanliga spelmodellerna skrivs aldrig över.

Runtime klonar hela hierarkin och varje skeleton, behåller geometri/UV/texturer samt använder den befintliga AnimationMixer-logiken. Den kör inte vanlig uniformsfärgning eller lägger till nya skor på den privata kopian. Fel vid sparning, ogiltig länk, rensad webbläsarlagring eller ändrad källmodell ger ett tydligt fel och erbjuder ingen tyst ersättningskaraktär. Öppna studion och skapa provmatchen igen.

## Reproducerbar verifiering

Från repots rot, med server på port 8765:

```sh
node --experimental-loader ./tools/vendor-three-test-loader.mjs --test character-design/*.test.mjs src/fps/*.test.mjs
node character-design/private-match-browser.mjs
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python character-design/private-match-blender.py
```

Webbläsartestet skapar designen via knapparna, sparar/öppnar den, startar matchen, jämför GLB med laddade avatarer och verifierar normal match efteråt. Det sparar bilder av den faktiska runtime-modellen i fem poser. Pointer lock ersätts i headless-testet; detta är ingen mätning av manuell muskontroll eller mobilprestanda.

Blender 4.5 LTS importerar exporten, exporterar en ny GLB och återimporterar i en ren scen. Det jämför geometri, UV, benhierarki, bindpose och skin weights samt verkligt deformerade triangelhörn i fem tidpunkter i vart och ett av de 13 klippen. Bilder och testdata hamnar i ignorerade `test-results/private-character/`. GitHub Actions kör samma flöde utan att ladda upp stora artefakter.
