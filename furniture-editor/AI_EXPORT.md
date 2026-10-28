# Designstudion – tom bana, automatiska kollisioner och AI-export

**NY TOM BANA · TÖM ALLT** rensar det nya banprojektet på golv, väggar, möbler, spawns och mål. Klicka ÅNGRA direkt om du ångrar dig. Din befintliga Floor 5-bana påverkas inte.

**Byggläge:** Rita rum och golv i planvyn, sedan väggar, fönster, glas, dörrar och öppna passager. Nya dörrar och passager har **1,20 modellenheter** som standard, men kan ändras genom att markera byggdelen och ange Bredd (minst 1,10). Öppningar utan dörrblad klipper bort själva väggens kollisionsyta. Normala dörrar har dynamisk dörrbladskollision.

**Möbler:** Markera ett objekt för att välja *Solid – blockerar spelaren* eller *Dekoration – ingen gångkollision*. Även dekorativa objekt finns kvar visuellt. Kollisioner för fasta väggar, fönster och glas skapas automatiskt från den faktiska geometrin; du behöver inte rita en separat osynlig kollisionskarta.

**EXPORTERA TILL AI / FPS · ZIP** sparar `project.json` (källan), `COLLISION_MAP.json` (härledd, integritetskontrollerad karta), `AGENT_BRIEF.md` (instruktioner till en AI-utvecklare) och eventuella lokala GLB-modeller. Paketet är ett AI-handoff, **inte automatisk AI-spelgenerering**. Import av äldre ZIP utan collision-map stöds. Modeller med osäker rättighet publiceras inte automatiskt.

**Provspelning:** Lägg 5+5 spawns, bombmål, gisslan och räddningszon. Kontrollera gångbarhet via KONTROLLERA BANAN, sedan privat provspelning i WebGL. Floor 5 är helt separat. Skalan använder modellenheter – den är inte verifierad i meter.
