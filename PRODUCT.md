# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/vanilla ES modules, no build step, no dependencies (chosen with the teacher during Faz 3 brainstorming). Deploy: static hosting (GitHub Pages or Netlify), opened full-screen in the smart board's browser.

## Users

Primary user: the English teacher at a Turkish sports high school (spor lisesi), driving a Windows touch smart board in front of the class. Audience on the board: 16–18-year-old student athletes in grades 11 and 12, English level mostly A1–A2 (very few B1+). They aim for BESYO (coach/PT), police, military and national-team careers, respond well to movement and competition, and often resist English lessons.

## Product Purpose

English League turns the English lesson into a team + individual league. The teacher picks a class section, runs a timer, plays short games (first: Coach Says — movement warm-up, speaking race, exit ticket) and awards points that land in the league table. Success: students speak English in class (one frame + one word is enough at A1–A2) and acquire the coursebook's target vocabulary through repetition in play; the teacher can start a lesson in under a minute with no setup.

## Positioning

Built around this school's reality: sports-career contexts (coach, police officer, soldier, athlete) as the frame for every word, coursebook-aligned units (grade 11 Yıldırım, grade 12 Sunshine English, 10 units each), and a league that persists across the whole term per class section.

## Operating Context

- Used live in 40-minute lessons, 4 hours/week, on a 1920×1080 touch board; viewed from up to ~5 m under projector/room light.
- Teacher operates; students do not touch devices. No phones at school; home participation is a later phase.
- Class sections are created by the teacher (e.g. 11-L, 11-S, 12-L); names are not fixed.
- Lesson rhythm: warm-up 5 min, input 10 min, team mission 20 min, exit ticket 5 min.

## Capabilities and Constraints

- Current scope (Faz 3 prototype): class-section selection/creation, team + student roster, team and individual league (this week / all time), undo, timer with whistle, Coach Says (3 rounds), backup download/upload.
- Content per unit lives in JSON (vocab, sentence frames, movement commands); pilot units: 11/Unit 1 Future Jobs, 12/Unit 1 Music.
- Scores are stored in the board browser's localStorage; a server comes only with home participation (Faz 5).
- Text-to-speech via the browser (en-US, slowed); no paid APIs.
- Adaptive level: every class starts at A1; within a lesson difficulty rises (Coach Says L → Mock Interview L+1 → exit ticket L+2, cap B1); the class level is re-measured from right/wrong answers when a new day starts.
- Undecided: final hosting choice; home participation design.

## Brand Commitments

- Name: **English League**.
- Teacher-facing controls in Turkish; game content in English.
- No AI-generated imagery anywhere in the product: vocabulary visuals are real, freely licensed photos (credits kept in `app/content/media/CREDITS.md`), optionally the school's own photos.
- The interface must not look AI-generated or templated.

## Evidence on Hand

- Coursebook PDFs in the project root (not committed): grade 11 Yıldırım, grade 12 Sunshine English teacher's book.
- Unit map: `docs/mufredat.md`. Spec: `docs/superpowers/specs/2026-09-27-tahta-prototipi-design.md`.
- No testimonials, usage data or school branding assets exist yet; do not invent them.

## Product Principles

1. Speaking first: every screen should end in a student saying something; points reward attempts.
2. A1–A2 by default: one sentence frame, one word, a real photo; Turkish only as optional support.
3. The teacher's time is sacred: big touch targets, no typing during lessons, undo for every mistake.
4. The league is the motivation: fair, visible, persistent across the term.
5. Grow by adding, not rewriting: new games and units drop in as files.

## Accessibility & Inclusion

Readable from the back row (body ≥ 32px, game word ≥ 96px, high contrast under projector light); no reliance on color alone for team identity (team names always shown); respect reduced motion for the time-up flash.
