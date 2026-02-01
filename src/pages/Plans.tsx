import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStorage } from '@/lib/StorageContext';
import type { ExerciseDefinition, WorkoutPlan } from '@/types';
import { PlanBuilder } from '@/components/plan';

type ViewMode = 'list' | 'import' | 'create' | 'edit';

const AI_PROMPT = `You are a personal fitness coach helping me create a custom workout plan. I'll import the plan into my fitness tracking app, so please follow the exact JSON schema below.

## Your Task
1. Ask me about my fitness goals (strength, hypertrophy, weight loss, general fitness, etc.)
2. Ask about my experience level (beginner, intermediate, advanced)
3. Ask how many days per week I can train (2-6 days)
4. Ask about any equipment limitations or preferences
5. Ask about any injuries or movements I need to avoid
6. Based on my answers, create a complete workout plan

## JSON Schema

\`\`\`typescript
interface WorkoutPlan {
  plan_meta: {
    plan_id: string;        // lowercase_snake_case, e.g. "upper_lower_4day"
    plan_name: string;      // Display name, e.g. "4-Day Upper/Lower Split"
    version: string;        // "1.0"
    days_per_week: number;  // Number of workout days
    focus?: string;         // "strength" | "hypertrophy" | "powerbuilding" | "general"
    author_agent?: string;  // Your name, e.g. "Claude"
    notes?: string;         // Optional program notes
  };
  schedule: Array<{
    id: string;             // e.g., "day_a", "day_b"
    day_name: string;       // e.g., "Day A - Upper Body"
    day_order: number;      // 0, 1, 2, etc.
    exercises: Array<{
      order: number;              // 1, 2, 3, etc.
      exercise_id: string;        // lowercase_snake_case matching common exercises
      substitution_group: string; // Movement pattern for exercise swaps:
                                 // "horizontal_push" | "horizontal_pull" |
                                 // "vertical_push" | "vertical_pull" |
                                 // "knee_dominant" | "hip_dominant" |
                                 // "isolation" | "core" | "carry_conditioning"
      sets: number;               // Number of sets
      target_reps: string;        // "8-10" or "5" or "30 seconds"
      target_rpe?: number;        // 1-10 scale (optional)
      rest_seconds: number;       // Rest between sets
      notes?: string;             // Optional cues/notes
    }>;
  }>;
}
\`\`\`

## Common Exercise IDs
Use these exact IDs (or similar patterns):
- Horizontal Push: bench_press_barbell, bench_press_dumbbell, incline_bench_press_barbell, chest_press_machine, pushups, dips_chest
- Horizontal Pull: barbell_row, dumbbell_row, cable_row_seated, chest_supported_row, t_bar_row, face_pulls
- Vertical Push: overhead_press_barbell, overhead_press_dumbbell, lateral_raise_dumbbell, push_press
- Vertical Pull: pullups, chinups, lat_pulldown, lat_pulldown_close_grip
- Knee Dominant: squat_barbell, front_squat, leg_press, hack_squat, lunges_dumbbell, bulgarian_split_squat, leg_extension
- Hip Dominant: deadlift_conventional, deadlift_sumo, romanian_deadlift, trap_bar_deadlift, hip_thrust_barbell, leg_curl_lying, kettlebell_swing
- Isolation: bicep_curl_barbell, bicep_curl_dumbbell, hammer_curl, tricep_pushdown, skull_crushers, calf_raise_standing
- Core: plank, hanging_leg_raise, cable_crunch, ab_wheel_rollout, pallof_press

## Output
After our conversation, provide the complete JSON plan that I can copy and paste into my app. The JSON should be valid and ready to import.

Let's begin! What are your fitness goals?`;

const copyAIPrompt = async (): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(AI_PROMPT);
    return true;
  } catch {
    return false;
  }
};

export default function Plans() {
  const { plans, schedule, exercises } = useStorage();
  const { plans: planList, loading, importPlan, deletePlan, savePlan } = plans;
  const { activateplan, schedule: activeSchedule } = schedule;
  const { refresh: refreshExercises } = exercises;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [createdExercises, setCreatedExercises] = useState<ExerciseDefinition[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activation dialog state
  const [activatingPlan, setActivatingPlan] = useState<(typeof planList)[0] | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  const handleImport = async () => {
    setImportError(null);
    setImportSuccess(false);
    setCreatedExercises([]);

    try {
      const result = await importPlan(importJson);
      setCreatedExercises(result.createdExercises);
      setImportSuccess(true);
      setImportJson('');
      await refreshExercises();

      // Auto-close after longer delay if exercises were created
      const delay = result.createdExercises.length > 0 ? 3000 : 1500;
      setTimeout(() => {
        setViewMode('list');
        setImportSuccess(false);
        setCreatedExercises([]);
      }, delay);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleActivateClick = (plan: (typeof planList)[0]) => {
    setWeeklyGoal(plan.plan_meta.days_per_week || 3);
    setActivatingPlan(plan);
  };

  const handleConfirmActivate = () => {
    if (activatingPlan) {
      activateplan(activatingPlan, weeklyGoal);
      setActivatingPlan(null);
    }
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Delete this plan?')) {
      await deletePlan(planId);
    }
  };

  const handleSavePlan = async (plan: WorkoutPlan) => {
    await savePlan(plan);
    setViewMode('list');
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setViewMode('edit');
  };

  // Show Plan Builder for create/edit modes
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {viewMode === 'create' ? 'Create New Plan' : 'Edit Plan'}
          </h1>
        </div>
        <PlanBuilder
          existingPlan={editingPlan || undefined}
          onSave={handleSavePlan}
          onCancel={() => {
            setViewMode('list');
            setEditingPlan(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workout Plans</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('create')}
            className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'import' ? 'list' : 'import')}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm font-medium transition-colors"
          >
            {viewMode === 'import' ? 'Cancel' : 'Import'}
          </button>
        </div>
      </div>

      {/* Generate with AI Card */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate with AI
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Copy a prompt to use with ChatGPT, Claude, or Gemini to create a personalized workout plan.
            </p>
          </div>
          <button
            onClick={async () => {
              const success = await copyAIPrompt();
              if (success) {
                const btn = document.getElementById('copy-ai-btn');
                if (btn) {
                  btn.textContent = 'Copied!';
                  setTimeout(() => { btn.textContent = 'Copy Prompt'; }, 2000);
                }
              }
            }}
            id="copy-ai-btn"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Copy Prompt
          </button>
        </div>
      </div>

      {viewMode === 'import' && (
        <div className="bg-surface rounded-lg p-4 mb-4">
          <h2 className="text-lg font-medium mb-3">Import JSON Plan</h2>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="Paste your workout plan JSON here..."
            className="w-full h-48 p-3 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />

          {importError && (
            <p className="text-error text-sm mt-2">{importError}</p>
          )}
          {importSuccess && (
            <div className="mt-3 p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-success text-sm font-medium">Plan imported successfully!</p>
              {createdExercises.length > 0 && (
                <div className="mt-2">
                  <p className="text-text-secondary text-xs">
                    Created {createdExercises.length} new exercise{createdExercises.length !== 1 ? 's' : ''}:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {createdExercises.slice(0, 5).map((ex) => (
                      <li key={ex.id} className="text-xs text-text-muted">
                        • {ex.name} ({ex.equipment_type})
                      </li>
                    ))}
                    {createdExercises.length > 5 && (
                      <li className="text-xs text-text-muted">
                        ...and {createdExercises.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleImport}
              disabled={!importJson.trim()}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm font-medium transition-colors"
            >
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mb-4">
        <Link
          to="/exercises"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-elevated rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Exercise Library
        </Link>
      </div>

      {/* Plan List */}
      <section className="bg-surface rounded-lg p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Your Plans
        </h2>

        {loading ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : planList.length === 0 ? (
          <p className="text-text-muted text-sm">
            No plans yet. Import a JSON plan or create one from scratch.
          </p>
        ) : (
          <div className="space-y-3">
            {planList.map((plan) => {
              const isActive = activeSchedule?.active_plan_id === plan.plan_meta.plan_id;
              return (
                <div
                  key={plan.plan_meta.plan_id}
                  className={`p-3 rounded-lg ${
                    isActive ? 'bg-primary/20 border border-primary' : 'bg-surface-elevated'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{plan.plan_meta.plan_name}</h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {plan.schedule.length} days/week
                        {plan.plan_meta.focus && ` • ${plan.plan_meta.focus}`}
                      </p>
                      {plan.plan_meta.author_agent && (
                        <p className="text-xs text-text-muted mt-1">
                          by {plan.plan_meta.author_agent}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isActive ? (
                        <span className="px-2 py-1 bg-primary rounded text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleActivateClick(plan)}
                          className="px-3 py-1 bg-primary hover:bg-primary-hover rounded text-xs font-medium transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="px-3 py-1 bg-surface hover:bg-surface-elevated rounded text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan.plan_meta.plan_id!)}
                        className="px-3 py-1 bg-error/20 hover:bg-error/30 text-error rounded text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Day list */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.schedule.map((day) => (
                      <span
                        key={day.id}
                        className="px-2 py-1 bg-background rounded text-xs text-text-secondary"
                      >
                        {day.day_name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Activation Dialog */}
      {activatingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Activate Plan</h2>
            <p className="text-sm text-text-secondary mb-4">
              Set your weekly goal for <strong>{activatingPlan.plan_meta.plan_name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Weekly sessions goal
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWeeklyGoal(Math.max(1, weeklyGoal - 1))}
                  className="w-10 h-10 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-bold w-12 text-center">{weeklyGoal}</span>
                <button
                  onClick={() => setWeeklyGoal(Math.min(7, weeklyGoal + 1))}
                  className="w-10 h-10 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                The plan has {activatingPlan.schedule.length} different workouts
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActivatingPlan(null)}
                className="flex-1 px-4 py-2 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActivate}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
