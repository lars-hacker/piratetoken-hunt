# Pirate Token Hunt 3D

Een 3D-runner in piratenstijl, gemaakt met [p5.js](https://p5js.org) (WEBGL).
Ren over het strand, wissel van baan, spring over tonnen en verzamel gouden tokens.

**Spelen:** https://lars-hacker.github.io/piratetoken-hunt/

## Besturing
| Toets | Actie |
|---|---|
| ← / → | van baan wisselen |
| spatie / ↑ | springen (2× = dubbele sprong) |
| 1 / 2 / 3 | moeilijkheid kiezen (in het menu) |
| telefoon | vegen = baan wisselen, tikken = springen |

## Bestanden
| Bestand | Inhoud |
|---|---|
| `index.html` | beginscherm, game-over-scherm en HUD |
| `style.css` | opmaak |
| `sketch.js` | het spel (logica en 3D-tekenen) |
| `lib/p5.min.js` | p5.js 1.9.4 |
| `AANPASSINGEN.md` | uitleg van alle aanpassingen, van het originele 2D-spel tot deze 3D-versie |

## Herkomst
Dit project begon als een kopie van [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner),
het dinospel uit Google Chrome. Dat spel is stap voor stap aangepast (zie `AANPASSINGEN.md`)
en daarna opnieuw gebouwd in 3D. De 2D-versie staat nog in de Git-geschiedenis.
