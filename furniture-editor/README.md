# Cartridge Strike Möbelstudion 1.0

**En enkel, separat 3D-redigerare för möbler. Spelet och dess kollisioner ändras inte av redigeraren.**

Publik editor: **https://capstere.github.io/cartridge-strike/furniture-editor/**

## Gör så här

1. Öppna Möbelstudion på en dator i Chrome eller Edge.
2. Välj **Stora lunchrummet** eller ett annat rum. Klicka på en stol i bilden eller i listan.
3. **Dra** stolen med vänster musknapp eller tryck **Q/E** (15°) för att vrida. Du kan också använda knapparna **Vrid vänster/höger** och ändra X/Z med tangentbordet.
4. Klicka **SPARA MIN MÖBLERING**. En fil som heter `CartridgeStrike-moblering-0.17.json` laddas ned.
5. **Ladda upp JSON-filen i ChatGPT** och be om granskning och säker implementation via GitHub.

För att fortsätta senare: dina ändringar sparas automatiskt lokalt i **samma webbläsare**. Du kan också klicka **Fortsätt med sparad fil** och välja din nedladdade JSON-fil.

**Kameran:** Planvy är enklast för att flytta möbler. Klicka **3D-VY** för att kontrollera riktningen, klicka **VISA RUM** för att hitta tillbaka, och använd mushjulet för zoom. Dra en tom yta för att panorera i planvy eller rotera kameran i 3D-vy. Högerdra för att panorera. **Ångra/Gör om** finns alltid till hands.

Grönblå markering visar vald möbel. Den lilla grönblå framkantsmarkören på stolen visar åt vilket håll stolen är vänd. Rumsgränser, fasta möbler, väggar och dörrar används som placeringsvarningar.

## Säkert och separat

- Ingen länk eller knapp i spelet startar redigeraren. Den har en **egen URL**.
- Ingen gameplay-modul (`src/fps/app.mjs`, bot, fysikmotor eller match) importeras av redigeraren.
- Originalkartans `src/floor5-data.js` och `src/world.js` läses endast som data. Fristående `createFurnishings` används för att få samma startpositioner som spelet.
- Redigerarens kollisionstest är en **förhandskontroll**, inte spelmotorns fullständiga fysiska validering. JSON-ändringar måste testas i spelet innan publicering.
- Redigeringarna sparas i lokal browser storage och en **nedladdad JSON**; de skickas inte till GitHub, server eller live-spelet automatiskt.
- Import accepterar endast filer med en känd schema- och versionsstämpel samt befintliga stabila möbel-ID:n. Vid senare speluppdateringar behöver filen granskas och migreras.
- Redigerarens möbelmodeller är **lättviktiga förhandsvisningar**. Den befintliga spelets GLB-assets/rendering och fabriksdetaljer används fortfarande av live-spelet.
- Endast de aktuella inredningsobjekten som stöds går att redigera: skapade stolar, bord, soffor, skåp samt objekten definierade i källans möbelkarta. Fast köksutrustning, maskiner och byggnadsgeometri är låsta i första versionen.

## Utvecklarkontroller

Från repo-roten:

```sh
node --test furniture-editor/editor.test.mjs
node --check furniture-editor/main.mjs
node --check furniture-editor/editor-browser.mjs
```

Den separata GitHub CI-sviten startar ett lokalt HTTP-serverprov och testar äkta Chromium/WebGL, panorering, byte mellan planvy/3D, rotation, musdrag, JSON-export, autosave, import och återställning. Den kontrollerar också att inga externa resurser laddas och att `window.__fps` aldrig skapas.

Det här är ett redigeringsverktyg, inte en runtime-release. **`fps/`, `src/`, `assets/`, `vendor/`, `build-info.json` och spelets CI/publikationsregler får inte ändras av redigerarens PR.**