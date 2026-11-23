/*
 * Pirate Token Hunt 3D
 * ====================
 * Een 3D-versie van het spel, gemaakt met p5.js in WEBGL-modus.
 *
 * HOE WERKT HET IN HET KORT?
 * - p5.js roept zelf twee functies aan:
 *     setup()  één keer bij het starten,
 *     draw()   steeds opnieuw, ongeveer 60 keer per seconde (de game loop).
 * - In draw() doen we elke keer twee dingen:
 *     1. bijwerken(): alles verplaatsen (dino, tonnen, tokens) en botsingen controleren;
 *     2. tekenen(): de hele 3D-wereld opnieuw tekenen.
 * - De dino rent eigenlijk NIET vooruit. Hij blijft op z = 0 staan en de wereld
 *   (tonnen, tokens, palmbomen) komt naar hem toe. Dat is makkelijker te
 *   programmeren en ziet er precies hetzelfde uit.
 *
 * COÖRDINATEN IN p5.js (WEBGL):
 *   x = naar rechts, y = naar BENEDEN (!), z = naar je toe (uit het scherm).
 * Wij denken liever met "y = omhoog". Daarom schrijven we bij het tekenen
 * steeds translate(x, -y, z): het minteken draait de y-as om.
 * "Vooruit" (de richting waarin de dino kijkt) is de negatieve z-richting.
 */

// ---------------------------------------------------------------------------
// 1. INSTELLINGEN
// ---------------------------------------------------------------------------

// De drie banen: x-posities van links naar rechts.
const BANEN = [-120, 0, 120];

// Natuurkunde van de sprong (eenheden per seconde).
const ZWAARTEKRACHT = 2200;    // versnelling naar beneden
const SPRONGSNELHEID = 760;    // beginsnelheid omhoog bij een sprong
const MAX_LUCHTSPRONGEN = 1;   // 1 = dubbele sprong

// Afmetingen voor de botsingscontrole.
const TON_STRAAL = 28;
const TON_HOOGTE = 70;
const DINO_HALVE_BREEDTE = 18;
const DINO_HALVE_DIEPTE = 22;
const TOKEN_STRAAL = 18;

// Waar nieuwe voorwerpen verschijnen (ver weg) en waar ze verdwijnen (achter de camera).
const VER_WEG = -2600;
const ACHTER_CAMERA = 500;

const ONKWETSBAAR_TIJD = 1.5;  // seconden na een botsing
const TOKEN_PUNTEN = 10;
const AFSTAND_PER_PUNT = 60;   // elke 60 eenheden afstand = 1 punt

// De drie moeilijkheden. snelheid = eenheden per seconde.
const MOEILIJKHEDEN = {
  makkelijk: { naam: 'Makkelijk', snelheid: 500, maxSnelheid: 900, versnelling: 8, afstandRijen: 650, levens: 5 },
  normaal: { naam: 'Normaal', snelheid: 650, maxSnelheid: 1200, versnelling: 12, afstandRijen: 480, levens: 3 },
  moeilijk: { naam: 'Moeilijk', snelheid: 850, maxSnelheid: 1500, versnelling: 20, afstandRijen: 360, levens: 1 }
};

// ---------------------------------------------------------------------------
// 2. SPELTOESTAND (alle variabelen die tijdens het spel veranderen)
// ---------------------------------------------------------------------------

let toestand = 'start';         // 'start', 'spelen' of 'gameover'
let moeilijkheid = 'normaal';
let instelling = MOEILIJKHEDEN[moeilijkheid];

// De dino: baan (0, 1 of 2), x (vloeiend naar de baan toe), y (hoogte) en snelheid omhoog.
let dino = { baan: 1, x: 0, y: 0, vy: 0, luchtsprongen: 0 };

let tonnen = [];      // elke ton: { x, z }
let tokens = [];      // elke token: { x, y, z }
let palmen = [];      // decoratie langs het strand: { x, z }

let snelheid = 0;
let afstand = 0;
let tokenAantal = 0;
let levens = 3;
let onkwetsbaar = 0;  // resterende seconden onkwetsbaar
let volgendeRij = 0;  // afstand tot er een nieuwe rij tonnen komt
let volgendeToken = 0;
let volgendePalm = 0;
let tijd = 0;         // totale speeltijd in seconden (voor animaties)

// ---------------------------------------------------------------------------
// 3. p5.js: setup() en draw()
// ---------------------------------------------------------------------------

function setup() {
  // WEBGL zet p5.js in 3D-modus.
  const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();  // geen lijntjes om de vormen, dat oogt rustiger

  koppelKnoppen();
  koppelAanraken(canvas.elt);
  kiesMoeilijkheid(moeilijkheid);
  toonHighscores();
  resetSpel();
}

function draw() {
  // deltaTime is de tijd sinds het vorige frame in milliseconden (van p5.js).
  // We rekenen in seconden, en maximaal 0,05 s, zodat het spel niet "verspringt"
  // als het tabblad even op de achtergrond stond.
  const dt = Math.min(deltaTime / 1000, 0.05);
  tijd += dt;

  if (toestand === 'spelen') {
    bijwerken(dt);
  }
  tekenen();
}

function windowResized() {
  // Responsief: het canvas past zich aan als het venster groter of kleiner wordt.
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------------------------------------------------------------------
// 4. SPELLOGICA
// ---------------------------------------------------------------------------

function resetSpel() {
  dino = { baan: 1, x: 0, y: 0, vy: 0, luchtsprongen: 0 };
  tonnen = [];
  tokens = [];
  palmen = [];
  snelheid = instelling.snelheid;
  afstand = 0;
  tokenAantal = 0;
  levens = instelling.levens;
  onkwetsbaar = 0;
  volgendeRij = 900;   // eerste tonnen pas na een stukje rennen
  volgendeToken = 400;
  volgendePalm = 0;

  // Alvast palmbomen neerzetten, zodat het strand niet leeg begint.
  for (let z = 0; z > VER_WEG; z -= 450) {
    voegPalmenToe(z);
  }
  werkHudBij();
}

function bijwerken(dt) {
  // --- Snelheid en afstand ---
  // Langzaam sneller tot de maximale snelheid (net als in het origineel).
  snelheid = Math.min(snelheid + instelling.versnelling * dt, instelling.maxSnelheid);
  const stap = snelheid * dt;   // afgelegde afstand in dit frame
  afstand += stap;
  if (onkwetsbaar > 0) onkwetsbaar -= dt;

  // --- Dino: zijwaarts naar de gekozen baan ---
  // lerp = "linear interpolation": elk frame een stukje (hier 15) dichter bij het doel.
  // Daardoor glijdt de dino soepel naar de nieuwe baan in plaats van te springen.
  const doelX = BANEN[dino.baan];
  dino.x = lerp(dino.x, doelX, Math.min(1, 15 * dt));

  // --- Dino: springen en vallen (natuurkunde) ---
  // Snelheid verandert door de zwaartekracht, positie verandert door de snelheid.
  dino.vy -= ZWAARTEKRACHT * dt;
  dino.y += dino.vy * dt;
  if (dino.y <= 0) {          // weer op de grond
    dino.y = 0;
    dino.vy = 0;
    dino.luchtsprongen = 0;
  }

  // --- Nieuwe voorwerpen laten verschijnen ---
  volgendeRij -= stap;
  if (volgendeRij <= 0) {
    voegRijTonnenToe();
    volgendeRij = instelling.afstandRijen + random(0, 300);
  }
  volgendeToken -= stap;
  if (volgendeToken <= 0) {
    voegTokenToe();
    volgendeToken = random(250, 600);
  }
  volgendePalm -= stap;
  if (volgendePalm <= 0) {
    voegPalmenToe(VER_WEG);
    volgendePalm = 450;
  }

  // --- Alles naar de dino toe schuiven (z wordt groter) ---
  for (const ton of tonnen) ton.z += stap;
  for (const token of tokens) token.z += stap;
  for (const palm of palmen) palm.z += stap;

  // --- Botsingen met tonnen ---
  for (const ton of tonnen) {
    if (!ton.geraakt && onkwetsbaar <= 0 && raaktTon(ton)) {
      ton.geraakt = true;
      levens--;
      onkwetsbaar = ONKWETSBAAR_TIJD;
      if (levens <= 0) {
        gameOver();
        return;
      }
    }
  }

  // --- Tokens oppakken ---
  for (const token of tokens) {
    if (!token.gepakt && raaktToken(token)) {
      token.gepakt = true;
      tokenAantal++;
      afstand += TOKEN_PUNTEN * AFSTAND_PER_PUNT; // +10 punten
    }
  }

  // --- Opruimen: wat achter de camera is of gepakt is, gaat uit de lijst ---
  // filter() maakt een nieuwe lijst met alleen de elementen die aan de voorwaarde voldoen.
  tonnen = tonnen.filter(ton => ton.z < ACHTER_CAMERA && !ton.geraakt);
  tokens = tokens.filter(token => token.z < ACHTER_CAMERA && !token.gepakt);
  palmen = palmen.filter(palm => palm.z < ACHTER_CAMERA);

  werkHudBij();
}

function voegRijTonnenToe() {
  // In elke rij staan 1 of 2 tonnen, nooit 3. Er is dus altijd een vrije baan
  // om naar uit te wijken (en je kunt ook over een ton heen springen).
  const aantal = random() < 0.35 ? 2 : 1;
  const vrijeBanen = shuffle([0, 1, 2]);   // banen in willekeurige volgorde
  for (let i = 0; i < aantal; i++) {
    tonnen.push({ x: BANEN[vrijeBanen[i]], z: VER_WEG });
  }
}

function voegTokenToe() {
  // Drie hoogtes: op de grond, met een sprong, of met een dubbele sprong.
  const hoogte = random([30, 130, 220]);
  tokens.push({ x: BANEN[floor(random(3))], y: hoogte, z: VER_WEG });
}

function voegPalmenToe(z) {
  palmen.push({ x: -330 - random(0, 80), z: z });
  palmen.push({ x: 330 + random(0, 80), z: z - 150 });
}

// Botsing tussen dino en ton: we kijken of de "doosjes" om beide elkaar overlappen,
// in alle drie de richtingen (x, y en z). Dit heet een AABB-test
// (Axis-Aligned Bounding Box: een doos waarvan de zijden langs de assen lopen).
function raaktTon(ton) {
  const overlapX = Math.abs(dino.x - ton.x) < DINO_HALVE_BREEDTE + TON_STRAAL;
  const overlapZ = Math.abs(ton.z - 0) < DINO_HALVE_DIEPTE + TON_STRAAL;
  const overlapY = dino.y < TON_HOOGTE;   // dino is niet hoog genoeg gesprongen
  return overlapX && overlapZ && overlapY;
}

// Botsing tussen dino en token: afstand tussen het midden van de token en het
// midden van de dino, in 3D met de stelling van Pythagoras.
function raaktToken(token) {
  const dx = token.x - dino.x;
  const dy = token.y - (dino.y + 45);   // midden van de dino ligt 45 boven zijn voeten
  const dz = token.z - 0;
  return dx * dx + dy * dy + dz * dz < (TOKEN_STRAAL + 40) * (TOKEN_STRAAL + 40);
}

function springen() {
  if (dino.y === 0) {
    dino.vy = SPRONGSNELHEID;                    // gewone sprong vanaf de grond
  } else if (dino.luchtsprongen < MAX_LUCHTSPRONGEN) {
    dino.vy = SPRONGSNELHEID * 0.9;              // dubbele sprong in de lucht
    dino.luchtsprongen++;
  }
}

function wisselBaan(richting) {
  // constrain houdt de baan tussen 0 en 2, zodat je niet van het strand af kunt.
  dino.baan = constrain(dino.baan + richting, 0, 2);
}

function gameOver() {
  toestand = 'gameover';
  const score = huidigeScore();
  const oud = laadHighscore(moeilijkheid);
  if (score > oud) {
    bewaarHighscore(moeilijkheid, score);
  }
  document.getElementById('resultaat').textContent =
    'Score: ' + score + ' • Je buit: ' + tokenAantal +
    (tokenAantal === 1 ? ' gouden token' : ' gouden tokens') +
    (score > oud ? ' • Nieuwe highscore!' : '');
  toonScherm('gameover');
  toonHighscores();
}

function startSpel() {
  resetSpel();
  toestand = 'spelen';
  toonScherm(null);
}

function huidigeScore() {
  return floor(afstand / AFSTAND_PER_PUNT);
}

// ---------------------------------------------------------------------------
// 5. TEKENEN IN 3D
// ---------------------------------------------------------------------------

function tekenen() {
  background('#bfe6ff');   // lucht

  // --- Camera ---
  // camera(oogX, oogY, oogZ, kijkpuntX, kijkpuntY, kijkpuntZ, ...):
  // de camera hangt achter en boven de dino en kijkt schuin naar voren.
  // Op een smal (staand) scherm zetten we de camera verder weg, zodat alle banen
  // in beeld blijven.
  const smal = height > width ? 1.6 : 1;
  camera(dino.x * 0.4, -230 * smal, 420 * smal, dino.x * 0.4, -40, -400, 0, 1, 0);
  perspective(PI / 3, width / height, 1, 6000);

  // --- Licht ---
  // ambientLight = licht van alle kanten (zodat niets helemaal zwart is),
  // directionalLight = zonlicht uit één richting (schuin van boven), dat geeft
  // de vormen lichte en donkere kanten en dus diepte.
  ambientLight(125);
  directionalLight(235, 230, 215, 0.3, 1, -0.4);

  tekenStrandEnZee();
  for (const palm of palmen) tekenPalm(palm);
  for (const ton of tonnen) tekenTon(ton);
  for (const token of tokens) tekenToken(token);
  tekenSchaduw();

  // Knipperen tijdens onkwetsbaarheid: om de 0,1 s de dino wel of niet tekenen.
  const knipper = onkwetsbaar > 0 && floor(tijd * 10) % 2 === 0;
  if (!knipper) tekenDino();
}

function tekenStrandEnZee() {
  // Zee: een heel groot vlak, net iets lager dan het strand.
  push();
  translate(0, 2, -2000);
  rotateX(HALF_PI);           // een plane() staat rechtop; zo leggen we hem plat
  fill('#5da9d6');
  plane(6000, 6000);
  pop();

  // Strand: een lange zandstrook waar de banen op liggen.
  push();
  translate(0, 0, -1800);
  rotateX(HALF_PI);
  fill('#ecd29a');
  plane(520, 5000);
  pop();

  // Streepjes in het zand en golfjes in de zee schuiven mee met de afstand.
  // Met % (modulo, de rest na delen) beginnen ze steeds opnieuw: zo lijkt
  // het alsof je eindeloos vooruit rent.
  const verschuiving = afstand % 200;
  for (let z = -2600; z < 400; z += 200) {
    const zz = z + verschuiving;
    // Baanstreepjes tussen de banen
    for (const x of [-60, 60]) {
      push();
      translate(x, -0.5, zz);
      fill('#d9bb7a');
      box(4, 1, 60);
      pop();
    }
    // Golfjes links en rechts
    for (const x of [-700, -480, 480, 700]) {
      push();
      translate(x + (z % 400 === 0 ? 40 : 0), 0, zz);
      fill(255, 255, 255, 200);
      box(60, 2, 4);
      pop();
    }
  }
}

function tekenDino() {
  // Pootjes bewegen heen en weer met een sinus van de tijd (alleen op de grond).
  const loop = dino.y === 0 && toestand === 'spelen' ? sin(tijd * 18) * 8 : 0;

  push();
  translate(dino.x, -dino.y, 0);

  fill('#535353');
  // Lijf
  blokje(0, 45, 0, 36, 40, 50);
  // Staart (naar achteren, dus +z)
  blokje(0, 42, 34, 16, 16, 26);
  blokje(0, 38, 50, 10, 10, 14);
  // Poten (lopen tegengesteld aan elkaar: +loop en -loop)
  blokje(-10, 12, loop, 10, 26, 12);
  blokje(10, 12, -loop, 10, 26, 12);
  // Armpjes
  blokje(-14, 50, -26, 6, 6, 10);
  blokje(14, 50, -26, 6, 6, 10);
  // Nek en hoofd (naar voren, dus -z)
  blokje(0, 68, -18, 22, 16, 18);
  blokje(0, 82, -30, 30, 26, 38);

  // Oog links: wit met zwart pupilletje
  fill(255);
  blokje(-15.5, 88, -38, 2, 7, 7);
  fill(0);
  blokje(-16.5, 88, -40, 1, 3, 3);
  // Ooglapje rechts + bandje rond het hoofd
  fill(10);
  blokje(15.5, 88, -38, 2, 10, 10);
  blokje(0, 93, -30, 31, 2, 39);

  // Piratenhoed: rand, bol, gouden band en een wit doodshoofdje voorop
  fill('#1a1a1a');
  blokje(0, 97, -30, 48, 4, 44);
  blokje(0, 106, -30, 32, 16, 28);
  fill('#d4a017');
  blokje(0, 100, -30, 33, 3, 29);
  fill(255);
  blokje(0, 108, -44.5, 8, 6, 2);

  pop();
}

// Hulpfunctie: een doos op positie (x, y, z) met breedte, hoogte en diepte.
// y is "omhoog", daarom -y bij translate.
function blokje(x, y, z, b, h, d) {
  push();
  translate(x, -y, z);
  box(b, h, d);
  pop();
}

function tekenSchaduw() {
  // Nepschaduw: een donkere, halfdoorzichtige ellips op de grond die kleiner
  // wordt naarmate de dino hoger springt. Echte schaduwen zijn in WEBGL lastig.
  const s = map(dino.y, 0, 250, 1, 0.4, true);
  push();
  translate(dino.x, -0.8, 0);
  rotateX(HALF_PI);
  fill(0, 0, 0, 50);
  ellipse(0, 0, 50 * s, 60 * s);
  pop();
}

function tekenTon(ton) {
  push();
  translate(ton.x, -TON_HOOGTE / 2, ton.z);
  // cylinder(straal, hoogte) staat in p5.js rechtop (langs de y-as).
  fill('#8b5a2b');
  cylinder(TON_STRAAL, TON_HOOGTE, 16, 1);
  // Bolle buik: een iets dikkere cilinder in het midden
  cylinder(TON_STRAAL + 3, TON_HOOGTE * 0.6, 16, 1);
  // IJzeren banden
  fill('#3d3d3d');
  for (const by of [-25, 0, 25]) {
    push();
    translate(0, by, 0);
    cylinder(TON_STRAAL + (by === 0 ? 4 : 1.5), 4, 16, 1);
    pop();
  }
  // Deksel (lichter hout)
  fill('#a8743f');
  push();
  translate(0, -TON_HOOGTE / 2 - 0.5, 0);
  cylinder(TON_STRAAL - 3, 1, 16, 1);
  pop();
  pop();
}

function tekenToken(token) {
  push();
  translate(token.x, -token.y, token.z);
  rotateY(tijd * 4);          // draaien om de verticale as
  rotateX(HALF_PI);           // een munt plat zetten (cilinder op zijn kant)
  fill('#f4c430');
  specularMaterial(255, 220, 80);   // glanzend, als echt goud
  shininess(40);
  cylinder(TOKEN_STRAAL, 4, 20, 1);
  pop();
}

function tekenPalm(palm) {
  push();
  translate(palm.x, 0, palm.z);
  // Stam: een paar cilinders boven elkaar, steeds iets verschoven (scheef)
  fill('#8b6a3e');
  for (let i = 0; i < 5; i++) {
    push();
    translate(i * 3, -15 - i * 30, 0);
    cylinder(8 - i, 32, 8, 1);
    pop();
  }
  // Bladeren: platte groene dozen, rondom gedraaid
  fill('#3f9b4b');
  translate(12, -165, 0);
  for (let i = 0; i < 6; i++) {
    push();
    rotateY(i * TWO_PI / 6);
    rotateZ(0.35);
    translate(40, 0, 0);
    box(80, 4, 22);
    pop();
  }
  pop();
}

// ---------------------------------------------------------------------------
// 6. BESTURING
// ---------------------------------------------------------------------------

// p5.js roept keyPressed() aan als er een toets wordt ingedrukt.
function keyPressed() {
  if (toestand === 'spelen') {
    if (key === ' ' || keyCode === UP_ARROW || key === 'w') springen();
    if (keyCode === LEFT_ARROW || key === 'a') wisselBaan(-1);
    if (keyCode === RIGHT_ARROW || key === 'd') wisselBaan(1);
  } else {
    if (key === '1') kiesMoeilijkheid('makkelijk');
    if (key === '2') kiesMoeilijkheid('normaal');
    if (key === '3') kiesMoeilijkheid('moeilijk');
    if (key === ' ' || keyCode === ENTER) startSpel();
  }
  return false;  // voorkomt dat de pagina gaat scrollen door spatie of pijltjes
}

// Aanraken op een telefoon: vegen naar links/rechts = baan wisselen, tikken = springen.
function koppelAanraken(element) {
  let startX = 0;
  let startY = 0;
  element.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  element.addEventListener('touchend', function (e) {
    if (toestand !== 'spelen') return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      wisselBaan(dx > 0 ? 1 : -1);   // horizontale veeg
    } else {
      springen();                    // tik (of veeg omhoog)
    }
    e.preventDefault();
  }, { passive: false });
}

// ---------------------------------------------------------------------------
// 7. MENU'S, HUD EN HIGHSCORES (gewone HTML, geen 3D)
// ---------------------------------------------------------------------------

function koppelKnoppen() {
  for (const knop of document.querySelectorAll('.moeilijkheid-knop')) {
    knop.addEventListener('click', function () {
      kiesMoeilijkheid(knop.dataset.moeilijkheid);
      knop.blur();   // anders "drukt" spatie straks nog een keer op deze knop
    });
  }
  for (const knop of document.querySelectorAll('[data-actie="start"]')) {
    knop.addEventListener('click', function () {
      knop.blur();
      startSpel();
    });
  }
}

function kiesMoeilijkheid(naam) {
  if (toestand === 'spelen') return;   // niet wisselen tijdens het spelen
  moeilijkheid = naam;
  instelling = MOEILIJKHEDEN[naam];
  for (const knop of document.querySelectorAll('.moeilijkheid-knop')) {
    knop.classList.toggle('gekozen', knop.dataset.moeilijkheid === naam);
  }
  const info = instelling.naam + ': ' + instelling.levens +
    (instelling.levens === 1 ? ' leven' : ' levens') +
    ', snelheid ' + instelling.snelheid + ' tot ' + instelling.maxSnelheid;
  for (const p of document.querySelectorAll('.moeilijkheid-info')) {
    p.textContent = info;
  }
  werkHudBij();
}

function toonScherm(id) {
  document.getElementById('beginscherm').classList.toggle('verborgen', id !== 'beginscherm');
  document.getElementById('gameover').classList.toggle('verborgen', id !== 'gameover');
  document.getElementById('hud').classList.toggle('verborgen', id !== null);
}

function werkHudBij() {
  document.getElementById('hud-levens').textContent = '♥ '.repeat(Math.max(levens, 0));
  document.getElementById('hud-tokens').textContent = tokenAantal;
  // nf() vult een getal aan met nullen: 42 wordt "00042".
  document.getElementById('hud-score').textContent = nf(huidigeScore(), 5);
  const hi = laadHighscore(moeilijkheid);
  document.getElementById('hud-hi').textContent = hi > 0 ? 'HI ' + nf(hi, 5) : '';
}

function toonHighscores() {
  const tabel = document.getElementById('highscore-lijst');
  tabel.innerHTML = '';
  for (const naam in MOEILIJKHEDEN) {
    const rij = tabel.insertRow();
    rij.insertCell().textContent = MOEILIJKHEDEN[naam].naam;
    const score = laadHighscore(naam);
    rij.insertCell().textContent = score > 0 ? score : '-';
  }
}

// localStorage bewaart gegevens in de browser, ook na het sluiten van de pagina.
// try/catch, omdat localStorage in sommige browsers (privémodus) geblokkeerd is.
function laadHighscore(naam) {
  try {
    return parseInt(localStorage.getItem('pth3d-highscore-' + naam), 10) || 0;
  } catch (e) {
    return 0;
  }
}

function bewaarHighscore(naam, score) {
  try {
    localStorage.setItem('pth3d-highscore-' + naam, String(score));
  } catch (e) {
    // Opslaan lukt niet: dan geldt de highscore alleen voor deze keer.
  }
}
