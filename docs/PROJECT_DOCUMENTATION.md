# LinguaFlow AI - Comprehensive Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Key Features](#key-features)
6. [How to Use](#how-to-use)
7. [API Routes](#api-routes)
8. [Development Setup](#development-setup)
9. [Current Strengths & Gaps](#current-strengths--gaps)
10. [Future Plans](#future-plans)
11. [Future Technology Stack Enhancements](#future-technology-stack-enhancements)

---

## 1. Project Overview

### What is LinguaFlow AI?

**LinguaFlow AI** is an adaptive language-learning platform designed to help learners acquire new languages efficiently through:

- **Example-first flashcards**: Learn words in real context with example sentences
- **AI-assisted sentence generation**: Automatic creation of contextual examples
- **Spaced repetition**: Intelligent review scheduling based on learning patterns
- **Learner notes**: Annotate cards with personal insights and mnemonics
- **Audio playback**: Native pronunciation support for accurate listening practice
- **Deck building**: Create custom learning content
- **Source-backed ingestion**: Import content from authoritative language sources like Tatoeba

The platform supports individual learners and has a future roadmap for teacher-student models and community-based content sharing.

### Vision

LinguaFlow AI is evolving from an MVP-style feature collection into a **guided, cohesive product experience**. The vision is to create a simple yet powerful learner flow while supporting content from multiple ingestion sources.

### Primary Learner Journey

1. **Home**: Dashboard and quick access to ongoing learning
2. **Study**: Active learning with spaced repetition review
3. **Word Details**: Deep dives into individual words and contextual examples
4. **Decks**: Browse and manage learning decks

### Secondary / Advanced Surfaces

- **Placement Quiz**: Adaptive assessment to determine learner level
- **Build**: Create custom learning decks from personal content
- **Source Ingestion**: Import content from external sources (Tatoeba, text files, etc.)

---

## 2. Architecture

### High-Level Architecture Overview

LinguaFlow AI is built as a **modern, decoupled system** with three main components:

```
Client Browser
    ↓
    ├─→ Next.js Web App (Frontend + Backend)
    │       ↓
    │   PostgreSQL Database
    │
    └─→ FastAPI AI Service
         ↓
      OpenAI / Ollama
```

### 2.1 Web Application (Next.js)

The frontend and backend are unified in a **Next.js application** using the **App Router** pattern.

**Key Characteristics:**
- Protected and public routes with authentication
- Server-side rendering for optimal performance
- API routes for various features (learner, decks, study, placement, notes)
- Real-time session management
- Audio playback support for word pronunciation
- Built-in middleware for authentication and authorization

**Responsibilities:**
- User interface and learner interactions
- Session management and authentication
- Database queries and data retrieval
- Calling the AI service for AI-powered features
- WebSocket support for real-time updates (future)

### 2.2 AI Service (FastAPI)

A **dedicated AI microservice** handles all language processing and generation tasks.

**Key Capabilities:**
- **Provider abstraction**: Support for multiple AI providers (OpenAI, Ollama) with swappable implementations
- **Sentence generation**: Create contextual example sentences from words
- **Checked example generation**: Validate and refine AI-generated examples
- **Placement quiz generation**: Adaptive quiz creation based on learner level
- **Deck generation from text**: Automatically extract vocabulary and create decks from raw text
- **Ingestion helpers**: Adapters for converting source-specific content formats

**Architecture:**
- RESTful API endpoints
- Stateless design for scalability
- Async/await patterns for non-blocking I/O
- Integration with external LLM APIs

### 2.3 Data Layer (PostgreSQL)

All persistent state is stored in **PostgreSQL** with the following entities:

**Core Entities:**
- **Users**: Authentication and account information
- **Learner Profiles**: Native language, target language, proficiency level
- **Decks**: Collection of flashcards and metadata
- **Cards**: Individual words/phrases with examples and translations
- **Learning Events**: Study session logs, review history, performance metrics
- **User Notes**: Word-level annotations and session reflections
- **Known Words**: Tracking of words the learner has mastered
- **Content Sources**: Metadata about where content originated (attribution)

**Design Principles:**
- Normalized schema for data integrity
- Indexes on frequently queried columns (user_id, deck_id, learner_card_id)
- Audit columns (created_at, updated_at) for tracking changes
- Foreign key relationships to maintain referential integrity

---

## 3. Technology Stack

### 3.1 Frontend / Web Application

| Technology | Purpose |
|------------|---------|
| **Next.js 14+** | React framework with App Router for production-ready web app |
| **TypeScript** | Type-safe JavaScript for reduced runtime errors |
| **Node.js 18+** | JavaScript runtime |
| **React 18+** | UI component library |
| **CSS/TBD** | Styling (Tailwind CSS, CSS Modules, or similar) |
| **npm/yarn** | Package manager |
| **bcryptjs** | Password hashing for secure authentication |

### 3.2 Backend / API Layer

| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | REST API endpoints running on Node.js |
| **TypeScript** | Type-safe server-side code |
| **Session Management** | Built-in Next.js session handling |
| **Middleware** | Authentication and authorization checks |
| **bcryptjs** | Secure password hashing |

### 3.3 AI Service

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Modern Python web framework for building APIs |
| **Python 3.9+** | Server-side language for AI logic |
| **OpenAI API** | GPT-4 / GPT-4.1-mini for advanced language understanding |
| **Ollama** | Local LLM alternative with Llama 3.2 model |
| **Uvicorn** | ASGI web server for FastAPI |

### 3.4 Database

| Technology | Purpose |
|------------|---------|
| **PostgreSQL 14+** | Primary database for all learner data, decks, cards, events, notes |
| **pgAdmin** | Database management and monitoring (optional) |

### 3.5 Infrastructure & DevOps

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization for consistent environments |
| **Docker Compose** | Container orchestration for local development |
| **Git** | Version control |

### 3.6 External Integrations

| Service | Purpose |
|---------|---------|
| **Tatoeba API** | Source-backed example sentences with real-world context |
| **OpenAI API** | Advanced language generation and understanding |

---

## 4. Project Structure

The project is organized as a **monorepo** with the following structure:

```
linguaflow-ai/
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── app/               # App Router pages and layouts
│   │   │   ├── (auth)/        # Authentication routes
│   │   │   ├── (learner)/     # Protected learner routes
│   │   │   ├── api/           # API endpoints
│   │   │   └── layout.tsx      # Root layout
│   │   ├── components/        # Reusable React components
│   │   ├── lib/               # Utilities and helpers
│   │   ├── styles/            # Stylesheets and themes
│   │   ├── public/            # Static assets (images, fonts)
│   │   ├── package.json       # Web app dependencies
│   │   └── next.config.js     # Next.js configuration
│   │
│   ├── ai-service/             # FastAPI AI microservice
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── models/            # Data models and Pydantic schemas
│   │   ├── services/          # Business logic (generation, validation)
│   │   ├── routes/            # API endpoints
│   │   ├── providers/         # LLM provider implementations
│   │   ├── requirements.txt   # Python dependencies
│   │   └── Dockerfile         # Container configuration
│   │
│   └── core-service/           # Shared business logic (if applicable)
│
├── infra/                       # Infrastructure and deployment configs
│   ├── docker/                # Docker-related files
│   └── kubernetes/            # Kubernetes manifests (future)
│
├── docs/                        # Documentation
│   ├── PROJECT_DOCUMENTATION.md  # This comprehensive guide
│   └── API.md                    # API reference documentation
│
├── scripts/                     # Utility and automation scripts
│   ├── setup.sh               # Development environment setup
│   └── deploy.sh              # Deployment automation
│
├── docker-compose.yml           # Local development orchestration
├── package.json                 # Root workspace configuration
├── package-lock.json
├── .gitignore                   # Git ignore rules
└── README.md                    # Quick start guide

```

### Key Directories Explained

| Directory | Purpose |
|-----------|---------|
| `apps/web` | Next.js web application (frontend + backend routes) |
| `apps/ai-service` | Dedicated FastAPI service for AI-powered features |
| `apps/core-service` | Shared business logic and utilities |
| `infra` | Docker, environment variables, and deployment configurations |
| `docs` | Project documentation and API references |
| `scripts` | Automation scripts for setup, testing, and deployment |

---

## 5. Key Features

### 5.1 Learner Experience

#### Authentication & Onboarding
- **User Registration**: Secure account creation with email verification
- **Login**: Session-based authentication with password hashing
- **Onboarding Flow**: Language pair selection (native language → target language)

#### Placement & Level Assessment
- **Adaptive Placement Quiz**: AI-generated questions that assess learner level
- **Auto-Level Determination**: Quiz results automatically set initial learner state
- **Level-Based Content**: Starter decks and recommendations based on placement results

#### Core Study Loop
- **Study Queue**: Intelligent queue of cards due for review based on spaced repetition
- **Example-First Flashcard**: Learn from context with example sentences before definitions
- **Review Mechanics**: Rate knowledge (Continue → Quiz → Bucket Update)
- **Spaced Repetition**: Cards scheduled based on difficulty and prior performance

#### Learning Buckets
- **Known**: Mastered words, reviewed less frequently
- **Learning**: Active vocabulary, regular review
- **Hard**: Challenging words, frequent repetition

#### Session Management
- **Session Start**: Begin study with personalized card queue
- **Session End**: Save progress and calculate metrics
- **Session Recap**: Review statistics, learning insights, and progress summary

#### Word Management
- **Word Details Page**: Deep dive into single word with all examples and context
- **Audio Playback**: Native speaker pronunciation
- **Word Notes**: Add personal mnemonics, etymology, or other insights
- **Example Sentences**: Multiple contextual sentences from various sources

#### Session Reflections
- **Session Notes**: Capture learner reflections and insights from study session
- **Progress Tracking**: View historical learning patterns and trends

#### Deck Management
- **Deck Browsing**: Explore available learning content
- **Deck Details**: View deck statistics, word count, and sample cards
- **Deck Search**: Find decks by language, level, or theme

### 5.2 Content Creation & Ingestion

#### Starter Decks
- Pre-built foundational language decks created by linguists
- Level-appropriate vocabulary sequences
- High-quality example sentences

#### AI Deck Generation
- Automatically extract vocabulary from raw text
- AI-generated example sentences for context
- Batch processing for rapid deck creation

#### Text Import
- Upload text files (documents, articles, scripts)
- OCR support for scanned documents (future)
- Automatic word extraction and frequency analysis

#### Source-Backed Ingestion
- Import from authoritative language sources
- Content attribution and provenance tracking
- Quality assurance for imported content

#### Tatoeba Integration
- Live example sentence searching
- Import entire cards with sentences from Tatoeba
- Automatic quality validation

### 5.3 Future Product Features (Roadmap)

#### Teacher/Student Mode
- Educators can create and assign decks to students
- Progress tracking and performance analytics
- Classroom dashboard with group statistics

#### Community Deck Sharing
- Users can publish custom-created decks
- Community rating and review system
- Peer-curated learning content marketplace

#### Advanced Analytics
- Learning curve visualization
- Personalized recommendations
- Adaptive difficulty adjustment

---

## 6. How to Use

### 6.1 For Learners

#### Getting Started

1. **Create Account**
   - Visit the home page
   - Click "Sign Up" or "Register"
   - Provide email and secure password
   - Verify email address

2. **Complete Onboarding**
   - Select native language (e.g., English)
   - Choose target language (e.g., Spanish)
   - Confirm language pair

3. **Take Placement Quiz**
   - Answer AI-generated questions about language knowledge
   - Assessment typically takes 5-10 minutes
   - Results determine your starting level

4. **Explore Dashboard**
   - View personalized greeting and stats
   - See starter deck recommendation
   - Access quick-start study button

#### Main Learning Flow

1. **Start Study Session** (`/study`)
   - Click "Begin Study" or "Continue Learning"
   - View personalized card queue
   - First card appears with example sentence

2. **Review Each Card**
   - Read example sentence in target language
   - Understand word meaning from context
   - Click word to hear pronunciation (if available)
   - Click definition to see more details

3. **Indicate Your Knowledge**
   - **Continue**: Familiar, but still practicing
   - **Quiz**: Test yourself with mini-quiz
   - **Easy**: Know this word well
   - **Hard**: Challenging, needs more practice

4. **Complete Session**
   - Finish your daily study goal
   - View session recap with statistics
   - See progress toward milestone

#### Advanced Features

**Browse Decks** (`/decks`)
- Explore available learning materials
- Filter by language and difficulty level
- Preview sample cards before adding to study

**Word Details** (`/words/[id]`)
- Dive deep into individual words
- View all example sentences
- Add personal notes and mnemonics
- Listen to multiple pronunciations

**Add Notes**
- Create study notes for individual cards
- Save etymology or memory aids
- Reference during future reviews

**Listen to Audio**
- Click any word to hear native pronunciation
- Repeat pronunciation for practice
- Multiple speaker options (future)

### 6.2 For Content Creators

#### Building Custom Decks

1. **Navigate to Build** (`/build`)
2. **Create New Deck**
   - Name your deck (e.g., "Spanish Travel Phrases")
   - Select target language
   - Define theme or category
   - Set difficulty level

3. **Add Vocabulary**
   - Enter target language word
   - Provide translation(s)
   - Add example sentences

4. **Use AI Assistance**
   - Click "Generate Example" to create AI examples
   - Review and accept suggestions
   - Edit examples as needed

5. **Quality Review**
   - Ensure all cards have proper context
   - Verify translations are accurate
   - Check example sentences for clarity

6. **Publish**
   - Make deck public or keep private
   - Add deck description and cover image
   - Publish to community (future)

#### Importing from Sources

1. **Access Import Feature**
   - Go to `/build` or dedicated import page
   - Select "Import from Source"

2. **Choose Import Type**
   - **Text File**: Upload .txt or .pdf
   - **Tatoeba**: Search and select sentences
   - **Web Page**: Copy-paste article text

3. **Process Content**
   - System extracts vocabulary automatically
   - AI generates example sentences
   - Matches sentences with Tatoeba (if available)

4. **Review & Validate**
   - Approve extracted vocabulary
   - Verify AI-generated examples
   - Adjust translations as needed

5. **Map to Deck Structure**
   - Organize vocabulary by topic
   - Set difficulty levels
   - Group related words

6. **Publish**
   - Review final deck structure
   - Add metadata (description, author, license)
   - Publish or save as draft

---

## 7. API Routes

### 7.1 Learner-Facing Pages

| Route | Purpose |
|-------|---------|
| `/` | Home page with dashboard and quick stats |
| `/login` | Authentication page for user login |
| `/onboarding` | Initial setup: language selection and profile creation |
| `/dashboard` | Learner dashboard with progress overview |
| `/study` | Main study interface with card queue |
| `/study/summary` | Session recap with statistics and insights |
| `/decks` | Browse all available decks |
| `/decks/[deckId]` | Detailed view of specific deck with preview |
| `/words/[learnerCardId]` | Word detail page with examples, audio, and notes |
| `/placement` | Placement quiz interface |
| `/placement/results` | Placement results and recommendations |
| `/starter-deck` | Initial deck for new learners with auto-recommendations |
| `/first-run` | First-time user experience and setup wizard |
| `/build` | Deck creation and editing interface |

### 7.2 API Endpoints

#### Study Management Endpoints

```
GET  /api/study/queue
     Returns: Array of cards due for review
     Purpose: Populate study session with next cards

POST /api/study/session/start
     Body: { deckId?, sessionGoal? }
     Returns: { sessionId, initialCards }
     Purpose: Begin new study session

POST /api/study/session/end
     Body: { sessionId, cardsReviewed, timeSpent }
     Returns: { summary, achievements }
     Purpose: Complete study session and calculate metrics

POST /api/study/review-event
     Body: { cardId, knowledge: 'continue'|'quiz'|'easy'|'hard', timeSpent }
     Returns: { nextCard, updatedMetrics }
     Purpose: Submit review of individual card

GET  /api/study/session-summary
     Returns: { sessionStats, wordsMastered, newWords, hardWords }
     Purpose: Get detailed session recap data
```

#### Deck Management Endpoints

```
GET  /api/decks/my
     Returns: Array of user's owned and enrolled decks
     Purpose: List learner's personal decks

GET  /api/decks/[deckId]
     Returns: { name, description, cardCount, cards[] }
     Purpose: Get detailed deck information

POST /api/decks
     Body: { name, targetLanguage, description }
     Returns: { deckId, created }
     Purpose: Create new deck

PUT  /api/decks/[deckId]
     Body: { name?, description?, cards? }
     Returns: { updated }
     Purpose: Update deck content and metadata

DELETE /api/decks/[deckId]
      Returns: { deleted }
      Purpose: Delete deck (if owner)
```

#### Learner Card Management Endpoints

```
GET  /api/learner/cards
     Returns: Array of learner's cards with progress
     Purpose: Get all cards for current learner

POST /api/learner/cards/update
     Body: { cardId, bucket: 'known'|'learning'|'hard' }
     Returns: { updated, newMetrics }
     Purpose: Update card status in learner's bucket

GET  /api/learner/statistics
     Returns: { totalCards, known, learning, hard, masteredRate }
     Purpose: Get overall learning statistics
```

#### Word & Notes Endpoints

```
GET  /api/words/[learnerCardId]
     Returns: { word, definition, examples[], audio, notes, sources }
     Purpose: Get comprehensive word information

POST /api/notes/word
     Body: { cardId, note, tags[] }
     Returns: { noteId, created }
     Purpose: Add annotation to specific word

GET  /api/notes/word/[cardId]
     Returns: Array of notes for word
     Purpose: Retrieve word-level annotations

POST /api/notes/session
     Body: { sessionId, note, reflection }
     Returns: { noteId, created }
     Purpose: Add session-level learning reflection

GET  /api/notes/session/[sessionId]
     Returns: { notes, reflection, insights }
     Purpose: Get session notes and reflections
```

#### Placement & Assessment Endpoints

```
GET  /api/placement
     Returns: { questions[], currentQuestion, progress }
     Purpose: Get placement quiz questions

POST /api/placement/submit
     Body: { answers[], completionTime }
     Returns: { level, recommendations, startingDecks }
     Purpose: Submit quiz answers and get level assessment
```

#### Source Integration Endpoints

```
GET  /api/sources/tatoeba/search
     Query: ?q=word&targetLanguage=es
     Returns: Array of example sentences with audio links
     Purpose: Search Tatoeba for real-world examples

POST /api/sources/tatoeba/import-card
     Body: { word, sentenceIds[], targetLanguage }
     Returns: { cardId, imported }
     Purpose: Import Tatoeba sentence into new card

GET  /api/sources/[sourceType]/available
     Returns: Array of available sources for import
     Purpose: List active content sources
```

#### Setup Endpoints

```
POST /api/first-run/setup-deck
     Body: { targetLanguage, level }
     Returns: { deckId, cards[], setup: 'complete' }
     Purpose: Initialize starter deck for new learner
```

#### Authentication Endpoints

```
POST /api/auth/register
     Body: { email, password, nativeLang, targetLang }
     Returns: { userId, token, created }
     Purpose: Create new user account

POST /api/auth/login
     Body: { email, password }
     Returns: { userId, token, sessionId }
     Purpose: Authenticate user and create session

POST /api/auth/logout
     Returns: { success }
     Purpose: End user session

GET  /api/auth/profile
     Returns: { userId, email, nativeLang, targetLang, createdAt }
     Purpose: Get authenticated user profile
```

---

## 8. Development Setup

### 8.1 Prerequisites

Before setting up development environment, ensure you have:

- **Git**: Version control system (https://git-scm.com/)
- **Docker**: Container platform (https://www.docker.com/products/docker-desktop)
- **Docker Compose**: Container orchestration (included with Docker Desktop)
- **Node.js 18+**: JavaScript runtime (https://nodejs.org/)
- **Python 3.9+**: Python runtime (https://www.python.org/)
- **PostgreSQL 14+**: Database (recommended via Docker)
- **Optional: Ollama**: Local LLM (https://ollama.ai/) for local AI features

### 8.2 Environment Configuration

#### AI Service Environment Variables

Create `.env` file in `apps/ai-service/`:

```bash
# AI Provider configuration
AI_PROVIDER=ollama  # Options: 'ollama' or 'openai'

# OpenAI configuration (if using OpenAI)
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4-1-mini

# Ollama configuration (if using Ollama locally)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama2
# For Mac, use: http://host.docker.internal:11434
# For Linux, use: http://localhost:11434
# For Windows, use: http://host.docker.internal:11434

# Service configuration
SERVICE_PORT=8000
LOG_LEVEL=info
```

#### Web Application Environment Variables

Create `.env.local` file in `apps/web/`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000

# Database Configuration
DATABASE_URL=postgresql://linguaflow:password@localhost:5432/linguaflow_db

# Session configuration
SESSION_SECRET=your-secret-key-change-in-production

# Optional: External service credentials
TATOEBA_API_KEY=optional-api-key
OPENAI_API_KEY=optional-for-fallback
```

#### Docker Compose Environment

Create `.env` file in project root for Docker Compose:

```bash
# PostgreSQL
POSTGRES_USER=linguaflow
POSTGRES_PASSWORD=secure_password_change_this
POSTGRES_DB=linguaflow_db
POSTGRES_PORT=5432

# Node environment
NODE_ENV=development

# AI Service
PYTHON_VERSION=3.11
```

### 8.3 Running Locally with Docker Compose

#### Quick Start (Recommended)

```bash
# Clone repository
git clone https://github.com/linguaflow/linguaflow-ai.git
cd linguaflow-ai

# Build and start all services
docker compose up --build

# Services will be available at:
# - Web App: http://localhost:3000
# - AI Service: http://localhost:8000
# - Database: localhost:5432
# - Docs: http://localhost:3000/docs (FastAPI docs at 8000/docs)
```

#### Stopping Services

```bash
# Stop all running containers
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

#### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f ai-service
```

### 8.4 Manual Service Startup (Alternative)

If you prefer running services individually without Docker:

#### Terminal 1: PostgreSQL Database

```bash
# Option 1: Docker container
docker run --name linguaflow-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=linguaflow_db \
  -p 5432:5432 \
  postgres:15

# Option 2: Use existing PostgreSQL installation
psql -U postgres -c "CREATE DATABASE linguaflow_db;"
```

#### Terminal 2: AI Service

```bash
cd apps/ai-service

# Create virtual environment (first time)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 3: Web Application

```bash
cd apps/web

# Install dependencies (first time)
npm install

# Run development server
npm run dev

# Or build for production
npm run build
npm start
```

### 8.5 Database Setup

After services are running, initialize the database:

```bash
cd apps/web

# Run migrations (if implemented)
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 8.6 Typical Development Workflow

1. **Make Code Changes**
   - Edit files in `apps/web`, `apps/ai-service`, or database schema
   - Changes auto-reload in development mode

2. **Test Changes**
   - Visit http://localhost:3000 in browser for frontend changes
   - Use HTTP client (curl, Postman) for API changes
   - Check http://localhost:8000/docs for FastAPI interactive docs

3. **Check Logs**
   - Monitor terminal windows for errors and debug output
   - Use `docker compose logs` for containerized services

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature-branch
   ```

5. **Create Pull Request**
   - Push feature branch to GitHub
   - Open pull request with description of changes
   - Wait for code review and CI/CD checks

### 8.7 Useful Development Commands

```bash
# Build
npm run build              # Build Next.js for production
docker compose build       # Rebuild Docker images

# Development
npm run dev               # Start Next.js dev server
docker compose up --build # Start with Docker Compose rebuild

# Database
npm run migrate           # Run database migrations
npm run seed              # Seed initial data

# Testing
npm test                  # Run test suite
python -m pytest          # Run Python tests

# Linting & Formatting
npm run lint              # Lint TypeScript/JavaScript
npm run format            # Format code with prettier
npm run type-check        # Check TypeScript types

# Cleanup
docker compose down       # Stop containers
docker compose down -v    # Stop containers and remove volumes
docker system prune       # Remove unused Docker resources

# Logs
docker compose logs -f    # Stream logs from all services
docker compose logs -f web  # Stream logs from specific service

# Database Access
psql -h localhost -U linguaflow -d linguaflow_db  # Connect to PostgreSQL
```

---

## 9. Current Strengths & Gaps

### 9.1 Current Strengths

LinguaFlow AI has achieved several important milestones:

✅ **Real Learner Study Loop**
- Complete end-to-end study session workflow
- Card review with spaced repetition
- Progress tracking and session management

✅ **Content Always Available**
- Automatic starter deck generation for new learners
- No dead-ends where learners run out of content
- Adaptive content based on learner level

✅ **Content Inspection**
- Learners can explore and browse available decks
- Word detail pages with comprehensive information
- Example sentences from multiple sources

✅ **Adaptive Assessment**
- Placement quiz integrates with learner state
- Level-appropriate content recommendations
- Future content shaping based on results

✅ **Rich Learning Features**
- Audio pronunciation support
- Session notes and reflections
- Word-level annotations
- Session recap with statistics
- Comprehensive spaced repetition algorithm

✅ **Flexible Content Creation**
- Build custom decks from scratch
- Import from text files
- Tatoeba sentence integration
- AI-assisted example generation

✅ **Modular Architecture**
- Clean separation between web, AI service, and database
- Swappable LLM providers (OpenAI, Ollama)
- Extensible source integration framework

### 9.2 Known Gaps

Areas identified for improvement:

❌ **Navigation & UX**
- Navigation could be more cohesive and unified
- Some screens remain text-heavy and overwhelming
- Visual hierarchy could be stronger

❌ **Reliability**
- Tatoeba live search needs stabilization
- Connection error handling improvements needed
- Timeout handling for external API calls

❌ **Placement Quiz**
- Should be more adaptive during quiz
- Post-placement shaping of content needs improvement
- Better difficulty estimation needed

❌ **Flashcard Standardization**
- Study card UI should align to final design specification
- Inconsistent layouts between study and word detail pages
- Need unified flashcard component

❌ **Advanced Features Not Yet Built**
- Teacher/student assignment model incomplete
- Community deck sharing not implemented
- Multi-user classroom features missing

❌ **Content Quality**
- Ingestion pipeline needs hardening
- Source quality scoring not implemented
- Limited content validation

---

## 10. Future Plans

### 10.1 Near-Term Roadmap (Next 1-2 Quarters)

#### 1. Navigation & Dashboard Consolidation
**Goal**: Create a unified, cohesive product experience
- Consolidate navigation patterns across all pages
- Create consistent visual language and component library
- Unify dashboard to serve as command center
- Streamline learner flow to feel like one guided product

**Expected Outcome**: Learners navigate smoothly through entire product

#### 2. Canonical Flashcard UI
**Goal**: Standardize flashcard layout to final design specification
- Create unified flashcard component (PDF-inspired design)
- Apply consistently across `/study` and `/words/[id]` pages
- Improve visual hierarchy and readability
- Enhance interactive elements (audio, examples)

**Expected Outcome**: Consistent, beautiful flashcard experience everywhere

#### 3. Stronger Starter Shaping
**Goal**: Improve initial content recommendations and sequencing
- Analyze placement quiz results more deeply
- Generate personalized content sequencing
- Implement spaced introduction of new content types
- Add guided tutorials for new learners

**Expected Outcome**: Better retention and engagement for new learners

### 10.2 Mid-Term Roadmap (2-4 Quarters)

#### 4. Teacher/Student Assignment Model
**Goal**: Enable classroom and structured learning environments
- Create teacher dashboard with class management
- Implement deck assignment workflows
- Build progress tracking for educators
- Add performance analytics per student
- Enable communication between teachers and students

**Expected Outcome**: Schools and tutors can use LinguaFlow for structured learning

#### 5. Community Deck Sharing
**Goal**: Create peer-to-peer content marketplace
- Allow users to publish decks publicly
- Implement rating and review system
- Create deck discovery marketplace
- Add quality scoring and filtering
- Implement revenue sharing (optional)

**Expected Outcome**: Community-curated learning content available to all

#### 6. Ingestion Pipeline Hardening
**Goal**: Make content import robust and scalable
- Improve text extraction accuracy
- Add quality validation for imported content
- Implement batch processing for large imports
- Create content source quality scoring
- Add automated content review workflows

**Expected Outcome**: Reliable, fast content ingestion from multiple sources

### 10.3 Long-Term Vision (6+ Months)

#### Expanded Learning Ecosystem
- **Group Learning**: Small study groups with shared decks
- **Peer Collaboration**: Learners can create decks together
- **Marketplace**: Teachers and content creators can monetize
- **Advanced Analytics**: ML-powered learning insights
- **Adaptive Difficulty**: Dynamic content difficulty adjustment

#### Multiple Language Pairs
- Support for simultaneous learning of multiple language pairs
- Cross-language learning paths
- Language family relationships (Romance languages, etc.)

#### Mobile Experience
- Native iOS/Android apps or React Native web app
- Offline study capability
- Push notifications for review reminders

#### Enterprise Features
- White-label solutions for language schools
- Custom integrations with learning management systems
- Advanced reporting and compliance features

---

## 11. Future Technology Stack Enhancements

### 11.1 Frontend Enhancements

#### Advanced State Management
**Current**: React hooks and Context API
**Recommended**: TanStack Query (React Query)
**Benefits**:
- Efficient server state synchronization
- Built-in caching and background refetching
- Improved data consistency
- Better handling of async operations

#### Component Library & Design System
**Recommendation**: Shadcn/ui or Radix UI + Tailwind CSS
**Benefits**:
- Consistent, accessible components
- Reduced styling boilerplate
- Better collaboration with designers
- Automated component updates

#### Real-Time Features
**Recommendation**: WebSockets with Socket.io or Turbo
**Use Cases**:
- Live class sessions
- Real-time progress updates
- Multiplayer study sessions
- Live notifications

#### Mobile Support
**Options**:
- React Native for native apps
- Next.js mobile web (PWA)
- Expo for easier mobile development
**Benefits**:
- Mobile learner reach
- Offline study capability
- Native OS integrations

#### Performance Optimizations
- Image optimization with Next.js Image component
- Code splitting and dynamic imports
- Edge caching with CDN (Cloudflare, Vercel)
- Web vitals monitoring

### 11.2 Backend & AI Service Enhancements

#### Advanced LLM Models
**Evolution Path**:
- Current: GPT-4, Llama 3.2
- Next: GPT-4 Turbo, Claude 3
- Future: Custom fine-tuned models on language learning data

**Benefits**:
- Better quality example sentences
- More accurate placement assessments
- Improved content generation

#### Local LLM Optimization
**Recommendation**: Fine-tune Ollama models on language learning datasets
**Benefits**:
- Lower latency and cost
- Privacy (no external API calls)
- Customized for educational context

#### Audio Processing
**Services**: Google Cloud Speech-to-Text, Azure Speech, or Eleven Labs
**Features**:
- Text-to-speech for word pronunciation
- Multiple speaker voices
- Speech-to-text for pronunciation practice
- Accent analysis

#### Caching Layer
**Recommendation**: Redis
**Use Cases**:
- Session management
- AI response caching
- Frequently accessed user data
- Rate limiting

#### Async Task Queue
**Recommendation**: Celery with Redis backend
**Use Cases**:
- Background deck generation
- Content import processing
- Batch email notifications
- Analytics computation

#### API Rate Limiting & Throttling
**Implementation**: FastAPI middleware with Redis
**Benefits**:
- Protect against abuse
- Fair usage allocation
- Cost control for external APIs

### 11.3 Data & Analytics

#### Data Warehouse
**Recommendation**: BigQuery or Snowflake
**Benefits**:
- Scalable analytics for millions of learners
- Historical trend analysis
- Complex data transformations
- Cost-effective for large datasets

#### Event Streaming
**Recommendation**: Kafka or Apache Pulsar
**Use Cases**:
- Real-time analytics pipeline
- Event-driven architecture
- Distributed system communication
- Audit logs

#### Business Intelligence Tools
**Recommendation**: Looker or Metabase
**Dashboards**:
- Educator progress tracking
- Platform usage analytics
- Learner retention metrics
- Revenue reporting

#### Machine Learning Pipeline
**Framework**: TensorFlow or PyTorch
**Applications**:
- Personalized learning recommendations
- Content difficulty prediction
- Learner success forecasting
- Optimal review scheduling

### 11.4 Infrastructure & DevOps

#### Kubernetes Orchestration
**Current**: Docker Compose (development)
**Production**: Kubernetes (EKS, GKE, or AKS)
**Benefits**:
- Auto-scaling based on demand
- Load balancing
- Service mesh (Istio)
- Declarative infrastructure

#### CI/CD Pipeline
**Recommendation**: GitHub Actions
**Workflow**:
- Automated testing on pull requests
- Docker image building and registry push
- Automated deployment to staging
- Production deployment with approval gates

#### Observability Stack
**Monitoring**: Datadog or New Relic
**Logging**: ELK Stack or Datadog Logs
**Tracing**: Jaeger or Datadog APM
**Alerting**: PagerDuty or Opsgenie

#### Load Balancing & CDN
**Services**:
- AWS ELB or GCP Cloud Load Balancing
- Cloudflare for edge caching
- DDoS protection
- Geographic routing

#### Database Scaling
**Strategies**:
- Read replicas for scaling reads
- Connection pooling (PgBouncer)
- Partitioning for large tables
- Backup and disaster recovery

### 11.5 Testing & Quality Assurance

#### End-to-End Testing
**Recommendation**: Playwright or Cypress
**Coverage**:
- Critical user journeys
- Cross-browser testing
- Visual regression testing
- Mobile responsiveness

#### Load Testing
**Tools**: k6 or Apache JMeter
**Scenarios**:
- Peak load simulation
- Stress testing
- Endurance testing
- Spike testing

#### Security Testing
**Tools**: OWASP ZAP, Burp Suite
**Areas**:
- SQL injection vulnerability
- XSS prevention
- CSRF protection
- Authentication/authorization

#### Code Coverage
**Target**: 80%+ coverage
**Tools**: Jest (JavaScript), Pytest (Python)
**CI Integration**: Codecov or Coveralls

### 11.6 Security Enhancements

#### Authentication & Authorization
**Upgrade from**: Custom session-based auth
**Upgrade to**:
- OAuth 2.0 / OpenID Connect (Social login)
- JWT with proper rotation
- Refresh token strategies
- Multi-factor authentication (MFA)

#### API Security
- Rate limiting and throttling
- API key management
- HTTPS/TLS everywhere
- CORS policy enforcement
- API versioning

#### Data Security
- TLS encryption in transit
- AES-256 encryption at rest
- Sensitive data masking in logs
- Secure key management (HashiCorp Vault)

#### Infrastructure Security
- Network segmentation
- Firewall rules
- VPN access
- Regular security audits
- Penetration testing

### 11.7 Emerging Technologies to Evaluate

#### Large Multimodal Models (LMMs)
**Examples**: GPT-4 Vision, Claude 3 Vision
**Applications**:
- Visual vocabulary learning (images, diagrams)
- Chart and infographic understanding
- Context from real-world photos

#### Retrieval-Augmented Generation (RAG)
**Use Case**: Improve sentence quality with knowledge bases
**Benefits**:
- Grounded sentences in facts
- Consistent terminology
- Reduction of hallucinations
- Better context awareness

#### Model Quantization & Compression
**Techniques**: INT8, FP16 quantization
**Benefits**:
- Faster inference
- Lower memory requirements
- Cost reduction
- Better mobile performance

#### Edge AI
**Concept**: Run models on learner devices
**Benefits**:
- Privacy (no data to servers)
- Offline capability
- Reduced latency
- Lower infrastructure costs

---

## Conclusion

LinguaFlow AI is a **well-architected, modern language learning platform** built on proven technologies and sound design principles. The combination of Next.js, FastAPI, and PostgreSQL provides a solid, scalable foundation.

### Key Strengths
✅ Clear learner journey with no dead-ends
✅ Modular, extensible architecture
✅ AI-powered content generation
✅ Multi-source content ingestion
✅ Spaced repetition and adaptive learning

### Strategic Focus Areas
🎯 **Near-term**: Product cohesion and UI consistency
🎯 **Mid-term**: Teacher/student and community features
🎯 **Long-term**: Scaled ecosystem and multi-learner platform

### Technology Roadmap
📈 Advanced AI models and local optimization
📈 Kubernetes orchestration and cloud scaling
📈 Real-time features and mobile support
📈 Advanced analytics and personalization

### Success Criteria
✨ Improved learner retention and engagement
✨ Scalable infrastructure handling millions of learners
✨ Vibrant community of content creators
✨ Proven educational outcomes

The platform has strong foundations and a clear path forward. Success depends on consistent execution, user feedback integration, and thoughtful technology choices that remain aligned with the vision of making language learning adaptive, engaging, and accessible to all.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-24
**Status**: Comprehensive Documentation Ready

For questions or contributions, please contact the development team or open an issue on the project repository.
