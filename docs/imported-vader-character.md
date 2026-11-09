# Darth Vader GLB – lokal FPS-import

Den verifierade användarfilen `Darth_Vader_FPS_Animated.glb` kan användas direkt i Cartridge-Strike via ett särskilt, lokalt importflöde.

## Användning

1. Ladda ned den ursprungliga GLB-filen från ChatGPT-konversationen.
2. Öppna [Cartridge-Strike FPS](https://capstere.github.io/cartridge-strike/fps/).
3. Under **MIN KARAKTÄR**, välj **Importera Vader-GLB** och öppna filen.
4. Importen validerar GLB-struktur, 23-bensskelett, alla 13 FPS-klipp och en låst SHA-256-identitet.
5. När menyn laddas om väljs **Darth Vader · importerad GLB**. Tryck **STARTA MATCH**.

Modellen lagras i webbläsarens IndexedDB, inte på en server. Den behöver importeras separat på varje enhet/webbläsarprofil. Radera med **Ta bort spelkopian**. Spelet fungerar fortsatt med standardkaraktärerna utan importen.

## Kompatibilitet

- SHA-256: `5a9e50842e57dc538def24fbb0b2f210f6b78e0abb8f89cbe5de1f0b757cee51`.
- 971 964 byte; 23 ben; 10 628 vertices; 9 195 trianglar; 12 material; 13 animationer.
- Animationsklipp: `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Crouch_Fwd_Loop`, `Crouch_Idle_Loop`, `Jump_Loop`, `Jump_Land`, `Pistol_Idle_Loop`, `Pistol_Reload`, `Pistol_Shoot`, `Death01`, `Hit_Chest`.
- Importerad modell får samma gameplay som befintlig spelare: vapen, rörelse, lag, kollision och skadesystem ändras inte.
- Mörka handskar och ärmar matchas visuellt i förstaperson; förstapersonsvyn använder fortfarande spelets separata hand-/vapenrigg, **inte** den importerade 23-bensmodellen.
- Markkontakt samplas från skinnade fotvertices. Spelspecifika animationssamtal använder befintliga bot-/spelarkontroller.

## Avsiktlig avgränsning

Karaktärsstudions ordinarie exportformat kräver Quaternius-riggen med 65 ben. Den verifierade Vader-filen har 23 och bör inte passera det formatets kompatibilitetskontroll genom att kraven sänks. Därför är detta en separat importerad kosmetisk spelarkaraktär, inte en allmän studioexport eller en ersättning för samtliga botar. FPS-kameran visar en materialmatch, inte ett fullständigt omriggat Vader-kroppsperspektiv.

GLB-filen läggs **inte** i det offentliga repot. Upphovsrätt och distributionsrätt för en Star Wars-karaktär är inte fastställda; lokal användning undviker att distribuera den som en offentlig GitHub-resurs.

## Kvalitetskontroll

Enhetstest: `node --test src/fps/external-character-store.test.mjs src/fps/character-selection.test.mjs`.

Runtimekontroll: `node tools/verify-owner-runtime.mjs`.

För praktiskt godkännande ska användaren importera originalfilen på den publicerade FPS-sidan och kontrollera idle/gång/sprint/hukning/hopp, skjutning/omladdning, död och kroppens riktning samt händerna i första person. Denna visuella WebGL-verifiering kan inte ersättas av GLB-metadata eller enhetstester.
