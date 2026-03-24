CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'learner',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    native_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    self_reported_level TEXT,
    verified_level TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    initial_quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
    daily_goal_words INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placement_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    estimated_level TEXT NOT NULL,
    confidence INT NOT NULL DEFAULT 70,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    source_id UUID,
    source_type TEXT NOT NULL DEFAULT 'internal',
    source_ref TEXT,
    source_url TEXT,
    difficulty_level TEXT,
    category TEXT,
    quality_score NUMERIC(5,2) DEFAULT 0,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    target_word TEXT NOT NULL,
    translation TEXT NOT NULL,
    pronunciation TEXT,
    example_sentence TEXT,
    example_translation_native TEXT,
    explanation TEXT,
    gloss_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL DEFAULT 'learning',
    mastery_score INT NOT NULL DEFAULT 0,
    streak_count INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, card_id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    session_type TEXT NOT NULL DEFAULT 'review',
    total_items INT NOT NULL DEFAULT 0,
    correct_items INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_card_id UUID NOT NULL REFERENCES learner_cards(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    result TEXT NOT NULL,
    response_time_ms INT,
    bucket_after TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS known_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    word TEXT NOT NULL,
    source_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    confidence_score INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, language, word)
);

CREATE TABLE IF NOT EXISTS sentence_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_card_id UUID REFERENCES learner_cards(id) ON DELETE SET NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    target_word TEXT NOT NULL,
    target_language TEXT NOT NULL,
    learner_level TEXT,
    generated_sentence TEXT NOT NULL,
    explanation TEXT,
    advanced_word_count INT NOT NULL DEFAULT 0,
    advanced_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    known_words_matched_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    replacements_used_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    iterations_used INT NOT NULL DEFAULT 0,
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    review_status TEXT NOT NULL DEFAULT 'auto_accepted',
    teacher_feedback TEXT,
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    target_language TEXT NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_cohort TEXT NOT NULL DEFAULT 'learner',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    learner_card_id UUID NOT NULL REFERENCES learner_cards(id) ON DELETE CASCADE,
    result TEXT NOT NULL,
    bucket_after TEXT NOT NULL,
    response_time_ms INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    language TEXT,
    provider TEXT,
    source_url TEXT,
    license_label TEXT,
    ingestion_status TEXT NOT NULL DEFAULT 'active',
    quality_score NUMERIC(5,2) DEFAULT 0,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'decks_source_id_fk'
    ) THEN
        ALTER TABLE decks
        ADD CONSTRAINT decks_source_id_fk
        FOREIGN KEY (source_id)
        REFERENCES content_sources(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_sources_type
ON content_sources(source_type);

CREATE INDEX IF NOT EXISTS idx_content_sources_language
ON content_sources(language);

CREATE INDEX IF NOT EXISTS idx_decks_source_id
ON decks(source_id);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS content_import_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    language TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_import_requests_user_id
ON content_import_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_content_import_requests_status
ON content_import_requests(status);

CREATE TABLE IF NOT EXISTS learner_word_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_card_id UUID NOT NULL REFERENCES learner_cards(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, learner_card_id)
);

CREATE TABLE IF NOT EXISTS study_session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_word_notes_user_card
ON learner_word_notes(user_id, learner_card_id);

CREATE INDEX IF NOT EXISTS idx_study_session_notes_user_session
ON study_session_notes(user_id, session_id);

INSERT INTO content_sources (
    source_type,
    source_name,
    language,
    provider,
    source_url,
    license_label,
    quality_score,
    metadata_json
)
SELECT
    'starter',
    'Internal Starter Decks',
    NULL,
    'internal',
    NULL,
    'internal',
    90,
    '{"description":"Starter decks created inside LinguaFlow"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM content_sources WHERE source_name = 'Internal Starter Decks'
);

INSERT INTO content_sources (
    source_type,
    source_name,
    language,
    provider,
    source_url,
    license_label,
    quality_score,
    metadata_json
)
SELECT
    'ai_generated',
    'AI Generated Content',
    NULL,
    'ai-service',
    NULL,
    'internal',
    70,
    '{"description":"Content generated by AI and reviewed by app checks"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM content_sources WHERE source_name = 'AI Generated Content'
);

INSERT INTO content_sources (
    source_type,
    source_name,
    language,
    provider,
    source_url,
    license_label,
    quality_score,
    metadata_json
)
SELECT
    'ocr_import',
    'Imported OCR/Text Content',
    NULL,
    'import-pipeline',
    NULL,
    'user-content',
    60,
    '{"description":"User-imported OCR or pasted text"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM content_sources WHERE source_name = 'Imported OCR/Text Content'
);