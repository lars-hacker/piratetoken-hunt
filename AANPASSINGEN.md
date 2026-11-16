# Aanpassingen aan de T-Rex Runner

Het origineel is het dinospel uit Google Chrome dat je krijgt als je geen internet hebt. Ik heb het spel op elf punten aangepast. De wijzigingen staan in `index.js`, `index.css` en `index.html` en zijn in de code te vinden met de zoekterm `AANPASSING`.

| # | Aanpassing | Wat het doet |
|---|------------|--------------|
| 1 | Sprongsnelheid werkt echt | De instelling `INITIAL_JUMP_VELOCITY` wordt nu ook echt gebruikt |
| 2 | Dubbele sprong | In de lucht kun je nog één keer springen |
| 3 | Levens | Je hebt 3 levens. Pas na 3 botsingen is het game over |
| 4 | Opgeslagen highscore | Je highscore blijft bewaard, ook nadat je de pagina sluit |
| 5 | Achtergrondkleur | Lichtblauwe lucht in plaats van een witte achtergrond |
| 6 | Moeilijkheidsmenu | Kies tussen Makkelijk, Normaal en Moeilijk |
| 7 | Beginscherm | Titelscherm met moeilijkheid, besturing, highscores en een START-knop |
| 8 | Cache busting | Na een update laadt de browser altijd de nieuwe CSS en JavaScript |
| 9 | Nieuwe naam | Het spel heet nu **Pirate Token Hunt** |
| 10 | Gouden tokens | Verzamel draaiende munten voor +10 punten per stuk |
| 11 | Piratenthema | Dino met piratenhoed en ooglapje, tonnen, zee en strand |

---

## Hoe het spel werkt (basis)

Het spel draait in een **game loop**: de functie `Runner.update()` wordt ongeveer 60 keer per seconde aangeroepen via `requestAnimationFrame`. In elke ronde (*frame*) gebeurt het volgende:

1. Het canvas wordt leeggemaakt.
2. De positie van de dino, de wolken en de obstakels wordt bijgewerkt.
3. Het spel controleert of de dino een obstakel raakt (*collision detection*, botsingsdetectie).
4. Alles wordt opnieuw getekend.

De variabele `deltaTime` is de tijd in milliseconden sinds het vorige frame. Het spel rekent daarmee, zodat het op een trage en een snelle computer even snel loopt.

---

## Aanpassing 1: de sprongsnelheid werkt echt

**Probleem:** in `Runner.config` stond `INITIAL_JUMP_VELOCITY: 100`, maar dat getal had **geen enkel effect**. De dino gebruikt namelijk zijn eigen instelling `Trex.config.INIITAL_JUMP_VELOCITY` (met een typfout in de naam, `INIITAL`). De waarde uit `Runner.config` werd alleen doorgegeven als je hem tijdens het spel veranderde.

**Oplossing:** in `Runner.init()` geef ik de waarde direct door aan de dino:

```js
this.tRex.setJumpVelocity(this.config.INITIAL_JUMP_VELOCITY);
```

`setJumpVelocity` maakt het getal negatief, omdat op een canvas de y-as **naar beneden** loopt: y = 0 is de bovenkant. Omhoog bewegen betekent dus dat y kleiner wordt.

Ik heb de waarde op **12** gezet in plaats van 100. Bij 100 zou de dino al in het eerste frame 100 pixels omhoog schieten, terwijl het hele canvas maar 150 pixels hoog is. 12 is iets hoger dan het origineel (10), zodat de dubbele sprong lekker speelt.

---

## Aanpassing 2: dubbele sprong

**Idee:** als de dino al in de lucht is, mag je nog één keer op spatie drukken om opnieuw omhoog te gaan.

**Hoe:**
- De dino houdt een teller bij: `airJumps` (het aantal sprongen in de lucht).
- In `onKeyDown` staat een extra voorwaarde:

```js
} else if (this.tRex.jumping && !e.repeat &&
    this.tRex.airJumps < this.config.MAX_AIR_JUMPS) {
    this.tRex.airJump(this.currentSpeed);
}
```

  Dus: de dino springt al, het is een **nieuwe** toetsdruk (`e.repeat` is `true` als je de toets alleen ingedrukt houdt) en het maximum is nog niet bereikt.
- `airJump()` zet de snelheid weer omhoog, net als bij een gewone sprong, en verhoogt de teller met 1.
- In `reset()`, als de dino weer op de grond staat, gaat `airJumps` terug naar 0.
- **Plafond:** bij het testen vloog de dino met een dubbele sprong boven het scherm uit (y = −30). Daarom staat in `updateJump()` nu een check: als `yPos < 0`, dan wordt `yPos = 0` en stopt de stijging.

Met `MAX_AIR_JUMPS` in de config kun je instellen hoeveel extra sprongen er mogen (0 = origineel spel).

---

## Aanpassing 3: levens

**Idee:** in plaats van meteen game over heb je 3 levens. Linksboven zie je een hartje per leven.

**Hoe:**
- Nieuwe variabelen: `this.lives` (begint op `LIVES` = 3) en `this.invincibleTimer`.
- Bij een botsing gaat er eerst een leven af:

```js
this.lives--;
if (this.lives > 0) {
    this.loseLife();
} else {
    this.gameOver();
}
```

- `loseLife()` speelt het botsingsgeluid af, haalt het geraakte obstakel weg (`removeFirstObstacle`) en maakt de dino **1,5 seconde onkwetsbaar**. Zonder die onkwetsbaarheid zou je in hetzelfde obstakel meteen alle levens tegelijk verliezen, omdat de botsing elk frame opnieuw wordt gedetecteerd.
- Tijdens die onkwetsbaarheid **knippert** de dino. In `Trex.draw()` wordt om de 100 ms de doorzichtigheid (`globalAlpha`) op 0,3 gezet. Dat gebeurt met `Math.floor(tijd / 100) % 2`: dit is afwisselend 0 en 1.
- `drawLives()` tekent met `fillText` een ♥ per leven op het canvas.
- Bij `restart()` worden de levens weer op 3 gezet.

---

## Aanpassing 4: highscore opslaan

**Probleem:** in het origineel is je highscore weg zodra je de pagina herlaadt, omdat hij alleen in een variabele staat (in het werkgeheugen).

**Oplossing:** de highscore wordt opgeslagen in **`localStorage`**. Dat is een kleine opslagplaats in de browser die blijft bestaan na het sluiten van de pagina.
- `saveHighScore()` gebruikt `localStorage.setItem(...)` bij game over, als je een nieuwe highscore hebt.
- `loadHighScore()` leest met `localStorage.getItem(...)` de score bij het opstarten. `localStorage` slaat alles op als tekst, dus met `parseInt` wordt het weer een getal.
- Beide staan in een `try { } catch { }`. In sommige browsers (bijvoorbeeld in privémodus) is `localStorage` geblokkeerd. Het spel crasht dan niet, maar de highscore wordt dan niet bewaard.

---

## Aanpassing 5: achtergrondkleur

**Idee:** een lichtblauwe lucht in plaats van een witte achtergrond.

**Hoe:** dit staat in `index.css`, niet in JavaScript. Het canvas waarop het spel wordt getekend is doorzichtig: alleen de dino, de grond en de obstakels worden erop getekend. Daarom is het genoeg om de achtergrond van de pagina (`body`) een kleur te geven:

```css
:root {
  --achtergrond: #bfe6ff;
}

html, body {
  background-color: var(--achtergrond);
}
```

`--achtergrond` is een **CSS-variabele**: je definieert de kleur één keer en gebruikt hem met `var(...)`. Wil je een andere kleur, dan hoef je alleen `#bfe6ff` te veranderen. Dit is een hexadecimale kleurcode: twee tekens voor rood, groen en blauw, elk van `00` (niets) tot `ff` (maximaal). `bf e6 ff` is dus weinig rood, veel groen en volledig blauw: lichtblauw.

---

## Aanpassing 6: menu met drie moeilijkheden

**Idee:** voor het spelen, en na elke game over, kies je in een menu hoe moeilijk het spel is. Dat kan door op een knop te klikken of door op **1**, **2** of **3** te drukken.

| Instelling | Makkelijk | Normaal | Moeilijk | Betekenis |
|---|---|---|---|---|
| `SPEED` | 5 | 6 | 8 | beginsnelheid |
| `MAX_SPEED` | 10 | 13 | 16 | topsnelheid |
| `ACCELERATION` | 0,0005 | 0,001 | 0,002 | hoeveel sneller per frame |
| `GAP_COEFFICIENT` | 0,9 | 0,6 | 0,45 | ruimte tussen obstakels (groter = meer ruimte) |
| `LIVES` | 5 | 3 | 1 | aantal levens |

"Normaal" heeft dezelfde snelheden als het originele spel.

**Hoe het werkt:**

- **HTML (`index.html`):** het menu is een `<div id="menu">` met drie knoppen. Elke knop heeft een `data-moeilijkheid`-attribuut, bijvoorbeeld `data-moeilijkheid="moeilijk"`. JavaScript leest dat attribuut uit met `button.dataset.moeilijkheid`. Het oude berichtje "Press Space to start" en het losse scriptje dat het verborg, zijn weggehaald.
- **Gegevens (`Runner.difficulties`):** de drie moeilijkheden staan in één object. Elke moeilijkheid is zelf weer een object met de waarden uit de tabel. Een vierde moeilijkheid toevoegen is daardoor makkelijk: je voegt één regel toe aan het object en één knop aan de HTML.
- **`setDifficulty(name)`:** kopieert de waarden naar `this.config`, het object waar het spel zijn instellingen uit leest. De functie zet ook de snelheid, de ruimte tussen obstakels (`horizon.gapCoefficient`) en de levens meteen goed. Bovenaan staat een **controle**: `if (!settings || this.playing) return;`. Tijdens het spelen kun je de moeilijkheid dus niet veranderen, anders zou je midden in een potje kunnen wisselen.
- **Events:** `initMenu()` koppelt aan elke knop een `click`-*event listener* (een functie die wordt uitgevoerd als er op de knop geklikt wordt). In `onKeyDown` vertaalt `Runner.difficultyKeys` de toetscodes 49, 50 en 51 (de toetsen 1, 2 en 3) naar een moeilijkheid.
- **`blur()`:** na een klik heeft de knop de *focus* (hij is "geselecteerd"). Spatie zou dan de knop nog een keer indrukken in plaats van te springen. `blur()` haalt die focus weg.
- **Tonen en verbergen:** `showMenu(true/false)` zet de CSS-class `verborgen` (met `display: none`) aan of uit. Het menu verdwijnt als het spel start of herstart, en komt terug bij game over.
- **Highscore per moeilijkheid:** de naam in `localStorage` hangt nu af van de moeilijkheid, bijvoorbeeld `t-rex-highscore-moeilijk`. Zo kun je een score op Makkelijk niet vergelijken met een score op Moeilijk.
- **CSS:** het menu heeft `position: fixed` en `bottom: 16px`. Het zweeft dus onderaan het scherm en bedekt de score en "GAME OVER" niet. Bij het testen stond het eerst bovenaan, en toen lag het precies over de score heen.

---

## Aanpassing 7: beginscherm

**Idee:** als je de pagina opent, zie je eerst een titelscherm in plaats van meteen het spel. Op dat scherm staan:
- de titel **T-REX RUNNER** in een pixel-lettertype (*Press Start 2P* van Google Fonts);
- een grote dino die op en neer huppelt;
- de knoppen voor de moeilijkheid (aanpassing 6);
- een grote **START**-knop (of druk op spatie);
- een uitleg van de besturing;
- je highscores voor alle drie de moeilijkheden.

**Hoe het werkt:**

- **HTML:** een `<div id="beginscherm">` die de hele pagina bedekt. De moeilijkheidsknoppen hebben dezelfde class `menu-knop` als in het kleine menu. `initMenu()` zoekt alle knoppen met `querySelectorAll('.menu-knop')` op, dus de knoppen op het beginscherm werken meteen, zonder extra code. Ook de gekozen knop wordt op beide plekken gemarkeerd.
- **CSS:** `position: fixed` met `inset: 0` (boven, rechts, onder en links 0) laat het scherm de hele pagina bedekken. Met `z-index: 20` ligt het boven het spel. De achtergrond is een **kleurverloop** (`linear-gradient`) van het luchtblauw naar wit. Het huppelen is een CSS-animatie (`@keyframes huppel`) die de dino met `translateY` 12 pixels omhoog en weer omlaag schuift. De titel gebruikt `clamp(20px, 6vw, 36px)`: de lettergrootte schaalt mee met de schermbreedte, maar blijft tussen 20 en 36 pixels. Met `flex-wrap: wrap` staan de vakken Besturing en Highscores naast elkaar op een computer en onder elkaar op een telefoon.
- **De dino tekenen (`tekenBeginschermDino`):** het spel heeft geen los plaatje van de dino. Alle afbeeldingen staan samen in één grote afbeelding, een **sprite sheet**. Met `drawImage` knip je daar een stukje uit: vanaf positie x = 1766, y = 4, een vlak van 88 × 94 pixels. `image-rendering: pixelated` zorgt dat de pixels scherp blijven en niet wazig worden.
- **Highscores (`toonHighscoreLijst`):** een `for...in`-lus loopt langs alle moeilijkheden in `Runner.difficulties`. Voor elke moeilijkheid wordt de score uit `localStorage` gelezen en met `getActualDistance` van pixels omgerekend naar de score die je in het spel ziet. Met `insertRow()` en `insertCell()` komt elke score als nieuwe rij in de tabel.
- **Refactoring (`beginSpel`):** eerst stond de code om het spel te starten midden in `onKeyDown`. De START-knop moet precies hetzelfde doen. Daarom staat die code nu in een eigen functie `beginSpel()`, die zowel door de spatiebalk als door de knop wordt aangeroepen. Code op die manier herschikken zonder dat het gedrag verandert, heet **refactoring**. Zo hoef je dezelfde code niet twee keer te schrijven (het *DRY*-principe: *Don't Repeat Yourself*, herhaal jezelf niet).
- Na een game over kom je niet terug op het beginscherm. Je ziet dan het kleine menu onderaan (aanpassing 6), zodat je snel opnieuw kunt spelen.

---

## Aanpassing 8: cache busting (versienummer)

**Probleem:** na het online zetten van het beginscherm zag de website er kapot uit: de tekst stond er wel, maar zonder opmaak, en de dino en de highscores ontbraken. Wat was er aan de hand? GitHub Pages laat browsers een kopie van bestanden 10 minuten bewaren. Zo'n bewaarde kopie heet de **cache**. De browser haalde de nieuwe `index.html` op, maar gebruikte nog de **oude** `index.css` en `index.js` uit de cache. Nieuwe HTML met oude CSS en JavaScript past niet bij elkaar.

**Oplossing:** in `index.html` staat nu een versienummer achter de bestandsnamen:

```html
<link rel="stylesheet" href="index.css?v=7">
<script src="index.js?v=7"></script>
```

Het stuk na het vraagteken (`?v=7`) heet een **querystring**. De server negeert het en stuurt gewoon `index.css`. Maar voor de browser is `index.css?v=7` een ander adres dan `index.css`, dus er is nog geen kopie in de cache en de browser haalt het nieuwe bestand op. Deze techniek heet **cache busting**.

**Let op bij een volgende update:** verhoog het getal (bijvoorbeeld naar `?v=8`) als je `index.css` of `index.js` verandert.

---

## Aanpassing 9: nieuwe naam, Pirate Token Hunt

**Idee:** het spel krijgt een eigen naam in plaats van de naam van het origineel van Chrome.

**Hoe:** de naam staat op twee plekken in `index.html`:
- `<title>Pirate Token Hunt</title>`: de tekst op het tabblad van de browser. Daar stond eerst nog "chrome easter egg: t-rex runner".
- `<h1 class="titel">PIRATE TOKEN HUNT</h1>`: de grote titel op het beginscherm. Die is in hoofdletters geschreven, net als de score in het spel. Dat past bij de pixel-stijl.

Omdat dit een HTML-wijziging is, hoeft er geen JavaScript te veranderen. Het versienummer van de CSS en JS is toch verhoogd naar `?v=8` (zie aanpassing 8), zodat alle bezoekers zeker de nieuwste versie krijgen.

Op een telefoon past de naam niet op één regel. De browser breekt de titel dan vanzelf af bij een spatie, zodat hij over twee regels staat.

---

## Aanpassing 10: gouden tokens verzamelen

**Idee:** de naam zegt het al: je jaagt op tokens. Er komen draaiende gouden munten voorbij. Pak je er een, dan krijg je **+10 punten** en zie je een "+10" omhoog zweven. Linksboven, onder de hartjes, staat hoeveel tokens je hebt. Na game over zie je je buit: "Je buit: 5 gouden tokens!".

**Hoe het werkt (`updateTokens`, elk frame):**

1. **Verschijnen:** een timer (`tokenTimer`) telt af met `deltaTime`. Bij 0 komt er rechts buiten beeld een nieuwe token bij, op een willekeurige hoogte uit `Runner.tokenHeights`. Die drie hoogtes vragen elk iets anders: laag (gewoon doorrennen), midden (springen) of hoog (dubbele sprong). Daarna krijgt de timer een willekeurige nieuwe waarde tussen 1,2 en 3 seconden, zodat de tokens niet in een vast ritme komen.
2. **Bewegen:** elke token schuift naar links met dezelfde formule als de obstakels: `snelheid × FPS / 1000 × deltaTime`. Zo lijken ze stil te liggen terwijl de dino rent.
3. **Botsing (oppakken):** de dino is een rechthoek en de token een cirkel. Eerst zoek je het punt van de rechthoek dat het dichtst bij het middelpunt van de cirkel ligt:
   ```js
   var dichtstX = Math.max(dinoLinks, Math.min(token.x, dinoRechts));
   ```
   Daarna gebruik je **Pythagoras**: als `dx² + dy² < r²`, is de afstand kleiner dan de straal en raakt de dino de munt. We vergelijken de kwadraten, zo is een wortel (`Math.sqrt`) niet nodig.
4. **Punten:** de score wordt berekend uit `distanceRan` (in pixels) maal `COEFFICIENT` (0,025). Voor 10 punten tellen we dus 10 / 0,025 = 400 pixels op bij `distanceRan`.
5. **Opruimen:** opgepakte tokens en tokens die links uit beeld zijn, gaan met `splice` uit de lijst. De lus loopt **achteruit** (`i--`). Als je vooruit loopt en een element verwijdert, schuift de rest een plek op en sla je er een over.
6. **Draaien:** de breedte van de munt is `|cos(tijd / 200)|` keer de straal. Een cosinus gaat tussen −1 en 1 op en neer. De absolute waarde maakt daar 0 tot 1 van, en dat ziet eruit als een munt die om zijn as draait. De munt wordt getekend met `ctx.ellipse`.

Op het beginscherm staat in de besturingstabel een muntje dat alleen met CSS is gemaakt: een vierkantje met `border-radius: 50%` wordt een cirkel.

---

## Aanpassing 11: piratenthema

**Idee:** het spel moet passen bij de naam. Daarom:
- de dino draagt een **piratenhoed met doodshoofd** en een **ooglapje**;
- de cactussen zijn **houten tonnen** geworden;
- de achtergrond is een **zee met golfjes** en een **zandstrand**;
- het beginscherm loopt van lucht via zee naar strand, en de START-knop is van "hout".

**Hoe het werkt:**

- **Geen nieuwe plaatjes nodig.** Alles is met code getekend: met `fillRect` (rechthoekjes) op het canvas. Dat past bij de pixel-stijl en je hoeft de sprite sheet niet te bewerken.
- **Hoed en ooglapje (`tekenPiratenspullen`):** eerst heb ik de pixels van de dino uit de sprite sheet als tekst uitgeprint. Zo kon ik zien waar het hoofd begint (x = 22, y = 2 bij staan, en x = 39, y = 20 bij bukken) en waar het oog zit. De functie tekent alles **relatief** aan de linkerbovenhoek van het hoofd, met een schaalfactor `s`. Dezelfde functie werkt daardoor in het spel (`s = 1`) én op het grote beginscherm (`s = 2`). `Trex.draw()` roept hem aan na het tekenen van de dino, zodat de hoed er bovenop komt.
- **Tonnen (`tekenTon`):** in `Obstacle.draw()` staat een `if`: is het obstakel geen vogel (`PTERODACTYL`), dan tekenen we een ton in plaats van het cactusplaatje. Een ton bestaat uit twee bruine rechthoeken (een smalle en een iets bredere, samen een bolle vorm), donkere lijnen voor de planken en grijze banden. Breedte en hoogte komen uit de bestaande obstakelgegevens. De **botsingsvakken** zijn niet veranderd, dus het spel is even moeilijk als met cactussen.
- **Zee en strand (`drawSea`):** dit wordt elk frame als eerste getekend, direct na `clearCanvas()`. Daardoor staat alles daarna (dino, tonnen, tokens) eroverheen. Dit heet **tekenvolgorde** (*painter's algorithm*): wat je later tekent, ligt bovenop. De golfjes zijn witte streepjes om de 60 pixels. Ze verschuiven met `distanceRan % 60` (de rest bij delen door 60), zodat ze meebewegen en steeds opnieuw beginnen.

---

## Testen

Ik heb het spel automatisch getest in een browser (Playwright, Chromium):

| Test | Resultaat |
|------|-----------|
| Sprongsnelheid in de dino | −12 ✔ |
| Dubbele sprong: 2e druk in de lucht | `airJumps` = 1 ✔ |
| 3e druk in de lucht | wordt genegeerd ✔ |
| Plafond: laagste y-positie | 0 (niet meer boven het scherm) ✔ |
| Levens: 3 → 2 → 1 → game over | ✔ |
| Highscore na herladen pagina | nog steeds aanwezig ✔ |
| Menu: klik op Moeilijk | 1 leven, snelheid 8, ruimte 0,45 ✔ |
| Menu verdwijnt bij start en komt terug bij game over | ✔ |
| Toets 1 na game over | Makkelijk: 5 levens, snelheid 5 ✔ |
| Highscore apart per moeilijkheid | `t-rex-highscore-moeilijk` ✔ |
| Beginscherm zichtbaar bij laden, kleine menu verborgen | ✔ |
| Toets 3 op het beginscherm | Moeilijk gekozen ✔ |
| Klik op START | beginscherm weg, spel loopt, dino springt ✔ |
| Spatie op het beginscherm | spel start ✔ |
| Highscoretabel (opgeslagen 4000 pixels op Normaal) | toont 100 ✔ |
| Beginscherm op telefoonformaat (390 px breed) | vakken onder elkaar, alles leesbaar ✔ |
| Token vlak voor de dino gelegd | `tokenCount` 0 → 1, score +10 ✔ |
| Buit na game over | "Je buit: 2 gouden tokens!" ✔ |
| Hoed blijft op het hoofd bij staan, rennen en bukken | ✔ (screenshots) |
| Tonnen, zee en strand zichtbaar, geen JavaScript-fouten | ✔ |
| JavaScript-fouten | geen ✔ |

## Spelen

Open `index.html` in een browser. Kies op het beginscherm een moeilijkheid (klik, of druk op 1, 2 of 3) en klik op **START**. Druk op **spatie** of **pijltje omhoog** om te springen (twee keer voor een dubbele sprong) en op **pijltje omlaag** om te bukken.
