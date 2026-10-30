# Objekt från onboard · 30 oktober 2026

28 nya statiska dekorobjekt har lagts till i Designstudions gemensamma bibliotek. Ägaren har uttryckligen godkänt användning och publicering av sina modeller. Källan är `capstere/onboard`, med optimerade GLB-filer där sådana finns. SHA-256 och filstorlek finns per objekt i `furniture-editor/library/onboard-catalog.mjs`.

Välj **Nytt från onboard** i biblioteket. Sök med svenska namn eller originalnamn; flera sökord och sökning utan accenttecken stöds. Korten visar bredd, djup och höjd i modellenheter. Föremålen laddas först när de används. Samlingen tillför cirka 35 MB till repot; detta hämtas inte vid sidstart.

Figurer, vapen och dörrmodeller i detta paket är **statisk dekor**. De ersätter inte spelkaraktärer, köpbara vapen eller fungerande dörrar. Använd byggverktyget Dörr för en passage med dörrmotor. Modellsamlingar behålls som ett samlat objekt. Se dem i 3D innan du bestämmer placering och storlek.

Sex NORD-modeller finns redan i biblioteket och har inte dubblerats. Större original över redigerarens 8 MiB-gräns samt Blender-arbetsfiler kräver separat export/optimering innan de kan läggas in. Alla 28 kort har renderade förhandsbilder.

Verifiering: alla 28 passerar den vanliga GLB-inspektören, innehållshashkontroll och ett Chromium/WebGL-prov som laddar och renderar varje modell. Det befintliga browserprovet kontrollerar byggande, dörrar, promenad och ZIP-rundtur. Full spelbarhet avgörs fortfarande av projektets motorvalidering, inklusive blockerade passager.

Tio riggade modeller kräver korrekt skelettkloning och separat animationsprov innan de används som möbler. De har inte lagts till i denna katalog: onboard:animated-realistic-goat-3d-animal-model, onboard:counter-strike-source-counter-terrorist, onboard:counter-strike-source-terrorist, onboard:crazy-doctor-fps-creator, onboard:cultist-tpose, onboard:cyberpunk-character, onboard:donald-trump, onboard:donald-trump-running, onboard:enemy1, onboard:terrorist.

## Smidigare byggande

- **Används i banan** visar modeller som redan är placerade, för snabb återanvändning.
- **Rensa sökning och filter** återställer biblioteket utan att ändra banan.
- Sökningen klarar flera ord i valfri ordning, svenska/originalnamn och exempelvis `sackar` för `säckar`.
- Alla nya objekt har en verklig förhandsbild; måtten inkluderar höjd.

## Nästa förbättringar att prioritera

1. Dela samlingsmodeller (labbutrustning, lådor och återvinningskärl) till separata placerbara föremål.
2. Exportera de 123 Blender-källorna till optimerade GLB med förhandsbilder och rimliga standardmått.
3. Gruppmarkering, fördelning med jämna avstånd och egna sparbara möbelgrupper för återkommande rum.

Dessa tre punkter är identifierade förbättringar, inte funktioner som ingår i denna ändring. Riggade figurer kräver fortsatt separat stöd; de statiska figurerna här är dekor.
