"use client";

import { useEffect, useState } from "react";

type Cohort = {
  id: string;
  name: string;
  target_language: string;
  created_by_user_id: string;
  created_at: string;
  member_count: number;
};

type CohortMember = {
  id: string;
  role_in_cohort: string;
  created_at: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
};

type CohortSentenceReview = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  target_word: string;
  target_language: string;
  learner_level: string | null;
  generated_sentence: string;
  advanced_word_count: number;
  review_status: string;
  created_at: string;
};

export default function TeacherDashboardClient() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [sentenceReviews, setSentenceReviews] = useState<CohortSentenceReview[]>([]);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortLanguage, setNewCohortLanguage] = useState("Spanish");
  const [learnerEmail, setLearnerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadCohorts() {
    const response = await fetch("/api/teacher/cohorts");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load cohorts.");
    }

    setCohorts(result.cohorts || []);
  }

  async function loadMembers(cohortId: string) {
    const response = await fetch(`/api/teacher/cohorts/${cohortId}/members`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load cohort members.");
    }

    setMembers(result.members || []);
  }

  async function loadSentenceReviews(cohortId: string) {
    const response = await fetch(`/api/teacher/cohorts/${cohortId}/sentence-reviews`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load cohort sentence reviews.");
    }

    setSentenceReviews(result.sentenceReviews || []);
  }

  async function handleCreateCohort() {
    try {
      const response = await fetch("/api/teacher/cohorts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCohortName,
          targetLanguage: newCohortLanguage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to create cohort.");
        return;
      }

      setMessage("Cohort created successfully.");
      setNewCohortName("");
      await loadCohorts();
    } catch (error) {
      console.error(error);
      setMessage("Failed to create cohort.");
    }
  }

  async function handleAddLearner() {
    if (!selectedCohortId) {
      setMessage("Please select a cohort first.");
      return;
    }

    try {
      const response = await fetch(
        `/api/teacher/cohorts/${selectedCohortId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            learnerEmail,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to add learner.");
        return;
      }

      setMessage(result.message || "Learner added.");
      setLearnerEmail("");
      await loadMembers(selectedCohortId);
      await loadSentenceReviews(selectedCohortId);
      await loadCohorts();
    } catch (error) {
      console.error(error);
      setMessage("Failed to add learner.");
    }
  }

  async function handleSelectCohort(cohortId: string) {
    setSelectedCohortId(cohortId);
    await loadMembers(cohortId);
    await loadSentenceReviews(cohortId);
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadCohorts();
        setMessage("Teacher dashboard loaded.");
      } catch (error) {
        console.error(error);
        setMessage("Failed to load teacher dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  return (
    <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-cyan-200">Teacher tools</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Cohorts and review workflows
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Build classes, attach learners, and inspect generated sentence quality.
        </p>
      </div>

      {message ? (
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          Loading teacher dashboard...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Create cohort</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <input
                value={newCohortName}
                onChange={(event) => setNewCohortName(event.target.value)}
                placeholder="Cohort name"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400"
              />

              <select
                value={newCohortLanguage}
                onChange={(event) => setNewCohortLanguage(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <option value="Spanish">Spanish</option>
                <option value="English">English</option>
              </select>

              <button
                type="button"
                onClick={handleCreateCohort}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Create cohort
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Your cohorts</p>
            <div className="mt-4 grid gap-3">
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  onClick={() => handleSelectCohort(cohort.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedCohortId === cohort.id
                      ? "border-cyan-400/30 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-base font-semibold text-white">{cohort.name}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {cohort.target_language} • {cohort.member_count} members
                  </p>
                </button>
              ))}

              {cohorts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No cohorts created yet.
                </div>
              ) : null}
            </div>
          </div>

          {selectedCohortId ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-400">Add learner to cohort</p>
                <div className="mt-4 flex gap-3">
                  <input
                    value={learnerEmail}
                    onChange={(event) => setLearnerEmail(event.target.value)}
                    placeholder="learner@example.com"
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddLearner}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    Add learner
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-400">Cohort members</p>
                <div className="mt-4 space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-base font-semibold text-white">
                        {member.full_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {member.email} • {member.role}
                      </p>
                    </div>
                  ))}

                  {members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      No learners in this cohort yet.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-400">Cohort sentence reviews</p>
                <div className="mt-4 space-y-3">
                  {sentenceReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {review.full_name} • {review.target_word}
                          </p>
                          <p className="text-sm text-slate-300">
                            {review.email} • {review.target_language} • {review.learner_level ?? "Unknown level"}
                          </p>
                        </div>

                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
                          {review.review_status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-white">{review.generated_sentence}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Advanced words: {review.advanced_word_count}
                      </p>
                    </div>
                  ))}

                  {sentenceReviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      No sentence reviews found for this cohort yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}