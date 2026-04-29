# AgilityManager Course Planner – konkurrensplan

Mål: bygga en modern banplanerare som kan konkurrera med etablerade verktyg genom att kombinera professionell banbyggarlogik, 3D, träningslogg, hunddata och enkel mobilupplevelse.

## Positionering

AgilityManager ska inte bara vara ett ritverktyg. Det ska vara ett komplett arbetsflöde:

1. Rita bana
2. Kontrollera mått och regler
3. Visa i 3D
4. Gå banan digitalt
5. Exportera bygg-PDF
6. Logga träningspass
7. Koppla bana till hundens utveckling/statistik
8. Dela med klubb, tränare eller ekipage

Detta är vår största konkurrensfördel: konkurrenter är ofta starka på banritning, men svagare på kopplingen mellan bana, träning, hund, mål och statistik.

## Produktpelare

### 1. Professionell banbyggare

Prioritet: mycket hög.

Funktioner:
- exakt banstorlek
- metersnap
- mått mellan hinder
- bygglista med x/y-koordinater
- hinderrotation
- banlängd mellan numrerade hinder
- hastighet/m/s och beräknad tid
- regelvarningar
- bygg-PDF
- tränings-PDF
- domar-PDF

### 2. Modern 3D och digital walk-through

Prioritet: mycket hög.

Funktioner:
- realistisk hall
- korrekt banstorlek
- väggreklam/klubbprofil
- tydliga realistiska hinder
- böjbar tunnel 0–90°
- gå banan med HUD
- nuvarande/nästa hinder
- avstånd till nästa hinder
- mobilvänliga kontroller
- export av 3D-bild senare

### 3. AgilityManager-fördelen: träning och statistik

Prioritet: extremt hög.

Funktioner:
- koppla bana till träningspass
- välj hund
- logga resultat per bana
- tagga problem: tunnel, slalom, kontaktfält, handling, fart, fokus
- visa utveckling över tid
- mål kopplade till specifika hinder/banor
- AI/coach-insikt: ”den här hunden tappar ofta fart efter tunnel”

Detta är där vi kan bli starkare än rena banritningsprogram.

### 4. Delning och klubbflöden

Prioritet: hög.

Funktioner:
- dela bana med länk
- dela till klubb
- klubbens banbibliotek
- tränare kan skapa banor åt ekipage
- medlemmar kan logga pass på samma bana
- mallbibliotek
- offentliga inspirationsbanor

### 5. Mobilupplevelse

Prioritet: hög.

Funktioner:
- banan ska vara huvudfokus
- paneler som bottom sheets
- storbildsläge
- snabb ”visa 3D”
- snabb ”gå banan”
- enkel läsning av bygg-PDF på mobil

## Roadmap

### Fas 1 – Stabil professionell MVP

Status: påbörjad.

Måste finnas:
- stabil 2D-planerare
- korrekt PDF-proportion
- rätt färger i PDF
- metersnap
- suddgummi i drag
- 3D-vy
- gå banan
- böjbar tunnel
- domarvy/mätpanel
- bygglista
- bygg-PDF

Nästa arbete:
- riktig mätverktygsinteraktion direkt på banan
- validera bana-knapp
- bättre PDF-val: träning/bygg/domare
- bättre schema-validering av sparad data
- bättre import/export JSON

### Fas 2 – Regel- och kvalitetskontroll

Bygg en ”Validera bana”-funktion.

Regler/varningar:
- hinder för nära kant
- hinder för nära varandra
- tunnelböjning för extrem i relation till placering
- saknade nummer
- dubbla nummer
- orimlig banlängd
- för hög/låg m/s
- start/mål saknas
- kontaktfält saknas eller för många beroende på bana

UI:
- grön/gul/röd status
- klickbar lista med problem
- markera hinder på banan

### Fas 3 – Banbibliotek och mallar

Funktioner:
- färdiga mallar: klass 1, klass 2, klass 3, hoppklass, agilityklass, hoopers
- träningsövningar: slalom, kontaktfält, handling, tunnel, hoppteknik
- klubbmallar
- favoriter
- kopiera och justera bana

### Fas 4 – Träningskoppling

Funktioner:
- skapa träningspass från bana
- koppla till hund
- logga känsla/resultat
- notera fel, tid, flyt, fokus
- statistik per hinderkategori
- rekommendationer för nästa pass

### Fas 5 – Dela och samarbeta

Funktioner:
- dela bana via länk
- klubbibliotek
- kommentera bana
- tränare tilldelar bana till ekipage
- export till bild/PDF/JSON

## Konkurrensfördelar vi ska kommunicera

- Modern svensk banplanerare för agility och hoopers
- 2D, 3D och gå-banan i samma verktyg
- Bygg-PDF med koordinater
- Koppling till träningslogg, hundar och statistik
- Mobilvänlig upplevelse
- Klubb- och tränarflöden
- Inte bara designa bana – följ upp utvecklingen efteråt

## Definition av 10/10

En användare ska kunna:

1. Skapa en bana på under 2 minuter
2. Justera hinder snabbt
3. Mäta avstånd
4. Validera banan
5. Visa den i 3D
6. Gå banan
7. Exportera bygg-PDF
8. Dela den
9. Logga passet efter träningen
10. Se statistik kopplad till hundens utveckling

När hela kedjan fungerar är AgilityManager inte bara en konkurrent till banritningsprogram. Då är det ett komplett tränings- och utvecklingssystem.
