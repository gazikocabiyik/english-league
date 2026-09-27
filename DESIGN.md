# Design — English League

World: **the team locker room.** Every team owns a painted steel door, every score is stencil paint, every student is a strip of paper tape with their name, and the only action colour is the safety-yellow line painted on the gym floor. Chosen against the category default (dark LED scoreboard with one neon accent). Source of truth for values: `app/styles/tokens.css`.

## Scene
Teacher at a 1920×1080 touch board in a daylit classroom, students reading from up to 5 m. Dark graphite ground keeps glare down and lets the saturated team doors carry the colour.

## Colour (strategy: committed team fields + one action colour)
| Token | Value | Role |
|---|---|---|
| `--bg` | #1b1f24 | graphite steel ground |
| `--surface` / `--surface-2` | #262c33 / #313840 | locker sheet metal, controls |
| `--line` | #414a54 | dividers, input borders |
| `--ink` / `--ink-muted` | #f2efe6 / #aab2bb | chalk-white paint text / secondary |
| `--accent` / `--accent-ink` | #ffd21f / #15181c | safety-yellow: the one primary action per screen, active state, leader |
| `--danger` | #ff5b4a | −1, remove, storage warning |
| `--tape` / `--tape-ink` | #ece3cb / #1b1f24 | tape labels, toasts, exit-ticket field |
| `--team-1..4` | #d8392c #2468d6 #1d9657 #f08a1c | locker doors (with `--team-ink` white) |

Rules: team colour always appears as a solid door block with the team name/number on it, never as a thin border. Yellow is reserved for "do this next" (Coach Says tile, next arrow, save, running timer).

## Type
- `--font-stencil` Big Shoulders Stencil Display 900: **numbers only** (scores, ranks, timer, unit numbers), tabular. Never letters: stencil L reads as "I.".
- `--font-display` Big Shoulders Display 900: headings, words, commands, section letters. English content is uppercased in JS with `toLocaleUpperCase('en')`, never CSS (Turkish locale turns i → İ). Names are shown as typed.
- `--font-body` Barlow Semi Condensed 600/700: teacher UI and sentence frames.
- Scale `--step-0..5`: 32 / 44 / 64 / 96 / 140 / 200 px. Body ≥ 32px, game word ≥ 140px.

## Components
- **Locker** (class select): tall door, stencil grade number, display section letter, handle, tape label with counts; last-used door is yellow.
- **Door block** (`.door`): team colour square with stencil number, used in league rows, setup, mini-league.
- **Tape** (`.tape`): paper label with soft shadow; toasts, Turkish meaning, counts, callouts.
- **Phase fields** (Coach Says): move = full yellow field, speak = steel + real photo, exit = tape-paper field.
- Buttons: flat, radius 6px, min 72px tall (60px in top bar), press = 2px drop. Focus = 4px yellow outline.

## Motion
One signature moment: awarding points stamps the stencil number (scale 1.6 → 1, rotate −4°, 450 ms ease-out) and league rows slide to their new rank (FLIP, 420 ms). Time-up flashes the page red. All disabled under `prefers-reduced-motion`.

## Imagery & icons
Real, freely licensed photos only (`app/content/media/`, credits in `CREDITS.md`); no AI imagery. Icons: Phosphor Bold via CSS mask (`app/styles/icons.css`), no emoji.
