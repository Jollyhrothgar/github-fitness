import { useState, useMemo } from 'react';
import type { ExerciseDefinition, MovementPattern } from '@/types';

interface SubstitutionModalProps {
  currentExercise: ExerciseDefinition;
  substitutionGroup: string;
  allExercises: ExerciseDefinition[];
  onSelect: (exercise: ExerciseDefinition) => void;
  onCancel: () => void;
}

export function SubstitutionModal({
  currentExercise,
  substitutionGroup,
  allExercises,
  onSelect,
  onCancel,
}: SubstitutionModalProps) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Separate recommended (same movement pattern) from others
  const { recommended, others } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const recommended: ExerciseDefinition[] = [];
    const others: ExerciseDefinition[] = [];

    for (const ex of allExercises) {
      // Exclude current exercise
      if (ex.id === currentExercise.id) continue;

      // If searching, filter by search term
      if (search && !ex.name.toLowerCase().includes(searchLower)) continue;

      // Categorize by movement pattern match
      if (ex.movement_pattern === (substitutionGroup as MovementPattern)) {
        recommended.push(ex);
      } else {
        others.push(ex);
      }
    }

    return {
      recommended: recommended.sort((a, b) => a.name.localeCompare(b.name)),
      others: others.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [allExercises, currentExercise, substitutionGroup, search]);

  const hasResults = recommended.length > 0 || others.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-elevated">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Swap Exercise</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-text-secondary">
            Replacing: <span className="font-medium">{currentExercise.name}</span>
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-surface-elevated">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full p-3 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto">
          {!hasResults ? (
            <div className="p-6 text-center">
              <p className="text-text-muted">No exercises found.</p>
              <p className="text-sm text-text-muted mt-1">
                Try a different search term or add exercises in the Exercise Library.
              </p>
            </div>
          ) : (
            <>
              {/* Recommended alternatives */}
              {recommended.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-surface-elevated sticky top-0">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Recommended ({substitutionGroup.replace(/_/g, ' ')})
                    </p>
                  </div>
                  <div className="divide-y divide-surface-elevated">
                    {recommended.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => onSelect(exercise)}
                        className="w-full p-4 text-left hover:bg-surface-elevated transition-colors"
                      >
                        <h3 className="font-medium">{exercise.name}</h3>
                        <p className="text-sm text-text-secondary">
                          {exercise.equipment_type.replace(/_/g, ' ')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Other exercises */}
              {others.length > 0 && (
                <div>
                  {!search && !showAll && recommended.length > 0 ? (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full p-4 text-center text-primary hover:bg-surface-elevated transition-colors"
                    >
                      Show all exercises ({others.length} more)
                    </button>
                  ) : (
                    <>
                      <div className="px-4 py-2 bg-surface-elevated sticky top-0">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                          {search ? 'Search Results' : 'All Exercises'}
                        </p>
                      </div>
                      <div className="divide-y divide-surface-elevated">
                        {others.map((exercise) => (
                          <button
                            key={exercise.id}
                            onClick={() => onSelect(exercise)}
                            className="w-full p-4 text-left hover:bg-surface-elevated transition-colors"
                          >
                            <h3 className="font-medium">{exercise.name}</h3>
                            <p className="text-sm text-text-secondary">
                              {exercise.equipment_type.replace(/_/g, ' ')} &middot; {exercise.movement_pattern.replace(/_/g, ' ')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Empty recommended state - show all by default */}
              {recommended.length === 0 && others.length > 0 && !search && (
                <p className="px-4 py-2 text-xs text-text-muted">
                  No exercises with matching movement pattern. Showing all exercises.
                </p>
              )}
            </>
          )}
        </div>

        {/* Cancel button (mobile) */}
        <div className="p-4 border-t border-surface-elevated sm:hidden">
          <button
            onClick={onCancel}
            className="w-full py-3 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
