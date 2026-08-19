# Banplaneraren Pro – analysmodell

Det här dokumentet beskriver AgilityManagers egna coachlager ovanpå den vanliga banbyggaren.

## Viktig princip

`difficultyScore`, `flowScore`, hotspots, svängbalans och rytmvariation är **planeringsheuristik**. De är inte officiella tävlingsregler och får inte presenteras som officiell klassning.

Regelkontrollen och coachlagret ska därför hållas separerade i både kod och UI:

- **Regelkontroll** använder regeluppsättningar, geometri och säkerhetskontroller.
- **Coachprofil** beskriver banans karaktär, rytm och tekniska belastning.
- En tekniskt svår bana kan fortfarande vara regelriktig.
- En hög eller låg coachscore får aldrig ensam avgöra om en bana är säker eller godkänd.

## Difficulty 0–100

Poängen väger samman:

- andel skarpa riktningsändringar,
- korsande luftsegment,
- kurvatur längs beräknad hundlinje,
- variation i avstånd mellan passager,
- stora tempoväxlingar mellan efterföljande segment.

En lång raksträcka ger ett litet avdrag så att en snabb, flytande bana inte blir "svår" bara för att den är lång.

## Flow 0–100

Flow är inte samma sak som låg svårighet. En teknisk bana kan ha högt flow om rytmen fortfarande är tydlig och läsbar.

Poängen minskar främst vid:

- flera tunga hotspots,
- mycket ojämna avstånd,
- kraftig vänster-/högerdominans,
- många korsande luftsegment.

## Hotspots

Hotspots beskriver lokala sekvenser där hund/förare sannolikt behöver extra precision. Exempel på signaler:

- kraftig sväng,
- kort ingång eller utgång,
- lång fartsträcka in i kraftig sväng.

Hotspots presenteras som coachinsikt, inte regelvarning.

## Banvandring Pro

Uppspelningen använder samma beräknade hundlinje som övrig bananalys och visar:

- look-ahead längs kommande linje,
- aktuell och nästa passage,
- passagehopp som projiceras mot samplad hundlinje,
- progress och visualiseringshastighet,
- svårighet, Flow, svängbalans och mest krävande sekvens.

Visualiseringshastigheten är inte referenstid eller maxtid.

## Tester

Tester fokuserar på robusta invariants:

- poäng ska alltid vara 0–100,
- hotspots ska vara deterministiskt sorterade,
- enkel rak bana ska vara lätt/flytande,
- coachprofil ska uttryckligen vara planeringsstöd,
- coachkoder får inte läcka in i den officiella ansats-/regelvalideringen.
