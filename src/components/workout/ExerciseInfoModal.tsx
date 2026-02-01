import { useState, useEffect } from 'react';
import type { ExerciseDefinition } from '@/types';
import { fetchExerciseMedia, type ExerciseMediaInfo } from '@/data/exerciseMedia';

interface ExerciseInfoModalProps {
  exercise: ExerciseDefinition;
  onClose: () => void;
}

export function ExerciseInfoModal({ exercise, onClose }: ExerciseInfoModalProps) {
  const [mediaInfo, setMediaInfo] = useState<ExerciseMediaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function loadMedia() {
      setLoading(true);
      const info = await fetchExerciseMedia(exercise.id);
      setMediaInfo(info);
      setLoading(false);
    }
    loadMedia();
  }, [exercise.id]);

  // Auto-cycle images for animation effect
  useEffect(() => {
    if (!mediaInfo?.images.length || mediaInfo.images.length < 2) return;

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % mediaInfo.images.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [mediaInfo?.images.length]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-elevated flex items-center justify-between">
          <h2 className="text-lg font-semibold">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <div className="w-32 h-32 bg-surface-elevated rounded-lg mx-auto mb-4" />
                <div className="h-4 bg-surface-elevated rounded w-3/4 mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* Exercise Images */}
              {mediaInfo?.found && mediaInfo.images.length > 0 && !imageError ? (
                <div className="relative bg-black/30 p-4">
                  <div className="relative w-48 h-48 mx-auto">
                    {mediaInfo.images.map((src, index) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${exercise.name} - position ${index + 1}`}
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                          index === activeImageIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                        onError={() => setImageError(true)}
                      />
                    ))}
                  </div>
                  {mediaInfo.images.length > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                      {mediaInfo.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === activeImageIndex ? 'bg-primary' : 'bg-surface-elevated'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-elevated/30">
                  <div className="w-20 h-20 bg-surface-elevated rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-text-muted text-sm">No images available</p>
                </div>
              )}

              {/* Exercise Details */}
              <div className="p-4 space-y-4">
                {/* Quick Info */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-surface-elevated rounded text-xs">
                    {exercise.equipment_type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-1 bg-surface-elevated rounded text-xs">
                    {exercise.movement_pattern.replace(/_/g, ' ')}
                  </span>
                  {exercise.primary_muscle_groups.map((muscle) => (
                    <span key={muscle} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                      {muscle.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                {/* Instructions */}
                {mediaInfo?.found && mediaInfo.instructions.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">How to Perform</h3>
                    <ol className="space-y-2">
                      {mediaInfo.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-3 text-sm text-text-secondary">
                          <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* No instructions fallback */}
                {(!mediaInfo?.found || mediaInfo.instructions.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-text-muted text-sm">
                      No detailed instructions available for this exercise.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Close button (mobile) */}
        <div className="p-4 border-t border-surface-elevated">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-elevated hover:bg-surface rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
