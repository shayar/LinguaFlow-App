# LinguaFlow AI

LinguaFlow AI is an adaptive language-learning platform built around example-first flashcards, AI-assisted sentence generation, spaced repetition, learner notes, audio playback, deck building, and source-backed content ingestion.

## Current product direction

The app is moving from MVP-style feature collection into a more guided product experience.

Primary learner journey:
- Home
- Study
- Word Details
- Decks

Secondary / advanced surfaces:
- Placement
- Build
- Source ingestion

The goal is to keep the learner flow simple while allowing content to be created or ingested from multiple sources.

## Main features

### Learner experience
- onboarding and login
- native language + target language profile
- placement quiz
- automatic starter path when the learner has no cards
- study queue with spaced repetition behavior
- example-first flashcard flow
- continue -> quiz -> bucket update
- buckets: known / learning / hard
- word notes
- session notes
- session recap
- browser-based audio playback
- deck browsing
- deck detail page
- word detail page

### Content creation / ingestion
- starter decks
- AI deck generation from text
- OCR/text import direction
- source-backed ingestion direction
- Tatoeba integration path (still being stabilized)

### Product direction beyond individual learners
- teacher/student mode for deck assignment
- community/shared deck model
- multiple ingestion strategies feeding one learner-facing flow

## High-level architecture

### Web app
- Next.js App Router
- protected and public routes
- API routes for learner, decks, study, placement, notes, and word/deck details

### AI service
- FastAPI
- AI provider abstraction for OpenAI / Ollama
- sentence generation
- checked example generation
- placement quiz generation
- deck generation from text
- ingestion helpers / adapters

### Data layer
- PostgreSQL for users, learner state, decks, cards, events, notes, and known words
- optional external/source metadata via content sources
- MongoDB and other services were considered in broader platform planning, but the current learner flow is primarily centered on Postgres-backed app state

## Important current routes

### Learner-facing pages
- `/` home
- `/login`
- `/onboarding`
- `/dashboard`
- `/study`
- `/study/summary`
- `/decks`
- `/decks/[deckId]`
- `/words/[learnerCardId]`
- `/placement`
- `/starter-deck`
- `/first-run`
- `/build`

### Selected API routes
- `/api/dashboard`
- `/api/study/queue`
- `/api/study/session/start`
- `/api/study/session/end`
- `/api/study/review-event`
- `/api/study/session-summary`
- `/api/learner/cards/update`
- `/api/decks/my`
- `/api/decks/[deckId]`
- `/api/words/[learnerCardId]`
- `/api/placement`
- `/api/placement/submit`
- `/api/notes/word`
- `/api/notes/session`
- `/api/first-run/setup-deck`
- `/api/sources/tatoeba/search`
- `/api/sources/tatoeba/import-card`

## Current strengths
- real learner-facing study loop exists
- app no longer dead-ends when no cards exist
- learner can inspect decks and words
- placement results can affect learner state
- notes, audio, recap, and spaced repetition are present
- build/import foundation exists

## Current known gaps
- navigation still needs consolidation to feel like one guided product
- some screens remain too text-heavy
- Tatoeba live search reliability still needs stabilization
- placement quiz should continue improving in adaptiveness and post-placement shaping
- study card should be further standardized to the final PDF-inspired flashcard layout
- teacher/student and community features are not fully built yet

## Recommended next steps
1. navigation + dashboard consolidation
2. canonical flashcard UI pass across study and word detail
3. stronger starter shaping after placement
4. teacher/student assignment model
5. community deck sharing model
6. ingestion pipeline hardening and source quality scoring

## Local development notes

Typical environment includes:
- Next.js web app
- FastAPI AI service
- PostgreSQL
- optional Ollama for local LLM usage

### Example AI service env

```env
AI_PROVIDER=ollama
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
```

### Typical restart flow

```bash
docker compose down
docker compose up --build
```

## Product design principles
- example first
- one focus word at a time
- minimal learner-facing clutter
- progressive disclosure for advanced details
- adaptive content and review timing
- source-aware content provenance
- future support for individual learners, teachers, students, and communities
