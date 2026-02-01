import { useState, useMemo } from 'react';
import { useStorage } from '@/lib/StorageContext';
import type { ExerciseDefinition, EquipmentType, MovementPattern } from '@/types';
import { getWeightEntryMode, getDefaultBarWeight, inferMuscleGroups } from '@/types/exercise';

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  trap_bar: 'Trap Bar',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  fixed_barbell: 'Fixed Barbell',
  bodyweight: 'Bodyweight',
  sled: 'Sled',
  other: 'Other',
};

const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
  knee_dominant: 'Knee Dominant',
  hip_dominant: 'Hip Dominant',
  carry_conditioning: 'Carry/Conditioning',
  conditioning: 'Conditioning',
  isolation: 'Isolation',
  core: 'Core',
};

export default function Exercises() {
  const { exercises } = useStorage();
  const { exercises: exerciseList, loading, saveExercise, deleteExercise } = exercises;

  const [search, setSearch] = useState('');
  const [filterEquipment, setFilterEquipment] = useState<EquipmentType | 'all'>('all');
  const [filterMovement, setFilterMovement] = useState<MovementPattern | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExerciseDefinition>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<ExerciseDefinition>>({
    equipment_type: 'barbell',
    movement_pattern: 'horizontal_push',
    primary_muscle_groups: [],
  });
  const [muscleGroupInput, setMuscleGroupInput] = useState('');

  // Filter and sort exercises
  const filteredExercises = useMemo(() => {
    return exerciseList
      .filter((ex) => {
        const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
          ex.id.toLowerCase().includes(search.toLowerCase());
        const matchesEquipment = filterEquipment === 'all' || ex.equipment_type === filterEquipment;
        const matchesMovement = filterMovement === 'all' || ex.movement_pattern === filterMovement;
        return matchesSearch && matchesEquipment && matchesMovement;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseList, search, filterEquipment, filterMovement]);

  // Get unique equipment types and movement patterns for filters
  const uniqueEquipment = useMemo(() => {
    const types = new Set(exerciseList.map((ex) => ex.equipment_type));
    return Array.from(types).sort();
  }, [exerciseList]);

  const uniqueMovements = useMemo(() => {
    const patterns = new Set(exerciseList.map((ex) => ex.movement_pattern));
    return Array.from(patterns).sort();
  }, [exerciseList]);

  const startEdit = (exercise: ExerciseDefinition) => {
    setEditingId(exercise.id);
    setEditForm({
      name: exercise.name,
      equipment_type: exercise.equipment_type,
      movement_pattern: exercise.movement_pattern,
      primary_muscle_groups: exercise.primary_muscle_groups,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (exercise: ExerciseDefinition) => {
    await saveExercise({
      ...exercise,
      ...editForm,
    });
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this exercise? This cannot be undone.')) {
      await deleteExercise(id);
    }
  };

  const handleCreateExercise = async () => {
    if (!createForm.name?.trim()) return;

    const id = createForm.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const equipmentType = createForm.equipment_type || 'other';
    const movementPattern = createForm.movement_pattern || 'isolation';

    const newExercise: ExerciseDefinition = {
      id,
      name: createForm.name.trim(),
      equipment_type: equipmentType,
      movement_pattern: movementPattern,
      primary_muscle_groups:
        createForm.primary_muscle_groups?.length
          ? createForm.primary_muscle_groups
          : inferMuscleGroups(movementPattern),
      weight_entry_mode: getWeightEntryMode(equipmentType),
      default_bar_weight_lbs: getDefaultBarWeight(equipmentType),
    };

    await saveExercise(newExercise);
    setShowCreateForm(false);
    setCreateForm({
      equipment_type: 'barbell',
      movement_pattern: 'horizontal_push',
      primary_muscle_groups: [],
    });
    setMuscleGroupInput('');
  };

  const addMuscleGroup = (formType: 'create' | 'edit') => {
    const input = muscleGroupInput.trim().toLowerCase();
    if (!input) return;

    if (formType === 'create') {
      const current = createForm.primary_muscle_groups || [];
      if (!current.includes(input)) {
        setCreateForm({ ...createForm, primary_muscle_groups: [...current, input] });
      }
    } else {
      const current = editForm.primary_muscle_groups || [];
      if (!current.includes(input)) {
        setEditForm({ ...editForm, primary_muscle_groups: [...current, input] });
      }
    }
    setMuscleGroupInput('');
  };

  const removeMuscleGroup = (group: string, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      setCreateForm({
        ...createForm,
        primary_muscle_groups: (createForm.primary_muscle_groups || []).filter((g) => g !== group),
      });
    } else {
      setEditForm({
        ...editForm,
        primary_muscle_groups: (editForm.primary_muscle_groups || []).filter((g) => g !== group),
      });
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-sm text-text-secondary mt-1">
            {exerciseList.length} exercise{exerciseList.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Exercise
        </button>
      </div>

      {/* Create Exercise Form */}
      {showCreateForm && (
        <div className="bg-surface rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Create New Exercise</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary block mb-1">Exercise Name *</label>
              <input
                type="text"
                value={createForm.name || ''}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Incline Dumbbell Press"
                className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary block mb-1">Equipment</label>
                <select
                  value={createForm.equipment_type}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, equipment_type: e.target.value as EquipmentType })
                  }
                  className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">Movement Pattern</label>
                <select
                  value={createForm.movement_pattern}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, movement_pattern: e.target.value as MovementPattern })
                  }
                  className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Muscle Groups</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={muscleGroupInput}
                  onChange={(e) => setMuscleGroupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMuscleGroup('create'))}
                  placeholder="Type and press Enter"
                  className="flex-1 p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => addMuscleGroup('create')}
                  className="px-3 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
              {(createForm.primary_muscle_groups?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {createForm.primary_muscle_groups?.map((group) => (
                    <span
                      key={group}
                      className="px-2 py-1 bg-primary/20 text-primary rounded text-xs flex items-center gap-1"
                    >
                      {group}
                      <button
                        onClick={() => removeMuscleGroup(group, 'create')}
                        className="hover:text-error"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreateExercise}
              disabled={!createForm.name?.trim()}
              className="flex-1 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Create Exercise
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-surface rounded-lg p-4 mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value as EquipmentType | 'all')}
            className="px-3 py-1.5 bg-surface-elevated rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Equipment</option>
            {uniqueEquipment.map((type) => (
              <option key={type} value={type}>
                {EQUIPMENT_LABELS[type]}
              </option>
            ))}
          </select>

          <select
            value={filterMovement}
            onChange={(e) => setFilterMovement(e.target.value as MovementPattern | 'all')}
            className="px-3 py-1.5 bg-surface-elevated rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Movements</option>
            {uniqueMovements.map((pattern) => (
              <option key={pattern} value={pattern}>
                {MOVEMENT_LABELS[pattern]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercise List */}
      <section className="bg-surface rounded-lg">
        {loading ? (
          <p className="p-4 text-text-muted text-sm">Loading...</p>
        ) : filteredExercises.length === 0 ? (
          <p className="p-4 text-text-muted text-sm">
            {exerciseList.length === 0
              ? 'No exercises yet. Import a workout plan to auto-populate exercises.'
              : 'No exercises match your filters.'}
          </p>
        ) : (
          <div className="divide-y divide-surface-elevated">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="p-4">
                {editingId === exercise.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2 bg-surface-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Exercise name"
                    />

                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={editForm.equipment_type}
                        onChange={(e) =>
                          setEditForm({ ...editForm, equipment_type: e.target.value as EquipmentType })
                        }
                        className="px-3 py-1.5 bg-surface-elevated rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={editForm.movement_pattern}
                        onChange={(e) =>
                          setEditForm({ ...editForm, movement_pattern: e.target.value as MovementPattern })
                        }
                        className="px-3 py-1.5 bg-surface-elevated rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Muscle Groups Editor */}
                    <div>
                      <label className="text-sm text-text-secondary block mb-1">Muscle Groups</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={muscleGroupInput}
                          onChange={(e) => setMuscleGroupInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMuscleGroup('edit'))}
                          placeholder="Add muscle group"
                          className="flex-1 p-2 bg-surface-elevated rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={() => addMuscleGroup('edit')}
                          className="px-3 py-2 bg-surface-elevated hover:bg-surface rounded-lg text-sm"
                        >
                          Add
                        </button>
                      </div>
                      {(editForm.primary_muscle_groups?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {editForm.primary_muscle_groups?.map((group) => (
                            <span
                              key={group}
                              className="px-2 py-1 bg-primary/20 text-primary rounded text-xs flex items-center gap-1"
                            >
                              {group}
                              <button
                                onClick={() => removeMuscleGroup(group, 'edit')}
                                className="hover:text-error"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(exercise)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 bg-surface-elevated hover:bg-surface rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{exercise.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-surface-elevated rounded text-xs text-text-secondary">
                          {EQUIPMENT_LABELS[exercise.equipment_type]}
                        </span>
                        <span className="px-2 py-0.5 bg-surface-elevated rounded text-xs text-text-secondary">
                          {MOVEMENT_LABELS[exercise.movement_pattern]}
                        </span>
                      </div>
                      {exercise.primary_muscle_groups.length > 0 && (
                        <p className="text-xs text-text-muted mt-1">
                          {exercise.primary_muscle_groups.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => startEdit(exercise)}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors"
                        aria-label="Edit exercise"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                        aria-label="Delete exercise"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
