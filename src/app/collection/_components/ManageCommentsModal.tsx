'use client';

import { useState, useMemo, useCallback } from 'react';
import { api } from '~/trpc/react';

interface ManageCommentsModalProps {
  onClose: () => void;
}

type CategoryKey = 'keyBpm' | 'genre' | 'url' | 'hex' | 'combination' | 'other';
type TransformType = 'comma' | 'dash' | 'slash' | 'wrap';
type TransformPreview = { original: string; transformed: string };

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  keyBpm: 'Key/BPM Info',
  genre: 'Genre/Style',
  url: 'URLs',
  hex: 'HEX Fingerprints',
  combination: 'Combination',
  other: 'Other',
};

export default function ManageCommentsModal({ onClose }: ManageCommentsModalProps) {
  const utils = api.useUtils();
  const commentsQuery = api.collection.uniqueComments.useQuery();
  const updateMutation = api.collection.updateCommentsBatch.useMutation({
    onSuccess: () => {
      void utils.collection.allTracks.invalidate();
      void utils.collection.uniqueComments.invalidate();
    },
  });

  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(
    new Set(['keyBpm', 'genre', 'url', 'other'])
  );
  
  // Transform preview mode
  const [transformPreviews, setTransformPreviews] = useState<TransformPreview[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Flatten combination comments for display
  const allComments = useMemo(() => {
    if (!commentsQuery.data) return { categories: {} as Record<CategoryKey, string[]> };
    
    const data = commentsQuery.data;
    return {
      categories: {
        keyBpm: data.keyBpm,
        genre: data.genre,
        url: data.url,
        hex: data.hex,
        combination: data.combination.map((c) => c.comment),
        other: data.other,
      } as Record<CategoryKey, string[]>,
    };
  }, [commentsQuery.data]);

  const toggleCategory = useCallback((category: CategoryKey) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const toggleComment = useCallback((comment: string) => {
    setSelectedComments((prev) => {
      const next = new Set(prev);
      if (next.has(comment)) {
        next.delete(comment);
      } else {
        next.add(comment);
      }
      return next;
    });
  }, []);

  const selectAllInCategory = useCallback((category: CategoryKey) => {
    const comments = allComments.categories[category] ?? [];
    setSelectedComments((prev) => {
      const next = new Set(prev);
      comments.forEach((c) => next.add(c));
      return next;
    });
  }, [allComments]);

  const deselectAllInCategory = useCallback((category: CategoryKey) => {
    const comments = allComments.categories[category] ?? [];
    setSelectedComments((prev) => {
      const next = new Set(prev);
      comments.forEach((c) => next.delete(c));
      return next;
    });
  }, [allComments]);

  const handleUpdate = useCallback(() => {
    if (selectedComments.size === 0) return;
    
    updateMutation.mutate({
      oldComments: Array.from(selectedComments),
      newComment,
    });
  }, [selectedComments, newComment, updateMutation]);

  // Transform functions
  const commaToBrackets = useCallback((text: string) => {
    return text.split(/,\s*/).map(s => s.trim()).filter(Boolean).map(s => `[${s}]`).join(' ');
  }, []);

  const dashToBrackets = useCallback((text: string) => {
    return text.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean).map(s => `[${s}]`).join(' ');
  }, []);

  const slashToBrackets = useCallback((text: string) => {
    // Match single or double slash: "a / b" or "a // b"
    return text.split(/\s*\/{1,2}\s*/).map(s => s.trim()).filter(Boolean).map(s => `[${s}]`).join(' ');
  }, []);

  const wrapWithBrackets = useCallback((text: string) => {
    return `[${text.trim()}]`;
  }, []);

  const getTransformFn = useCallback((type: TransformType) => {
    switch (type) {
      case 'comma': return commaToBrackets;
      case 'dash': return dashToBrackets;
      case 'slash': return slashToBrackets;
      case 'wrap': return wrapWithBrackets;
    }
  }, [commaToBrackets, dashToBrackets, slashToBrackets, wrapWithBrackets]);

  // Start transform preview mode
  const startTransformPreview = useCallback((type: TransformType) => {
    if (selectedComments.size === 0) return;
    
    const transformFn = getTransformFn(type);
    const previews = Array.from(selectedComments).map(original => ({
      original,
      transformed: transformFn(original),
    }));
    
    setTransformPreviews(previews);
    setCurrentPreviewIndex(0);
  }, [selectedComments, getTransformFn]);

  // Apply current transform and move to next
  const applyCurrentTransform = useCallback(() => {
    const current = transformPreviews[currentPreviewIndex];
    if (!current) return;
    
    updateMutation.mutate({
      oldComments: [current.original],
      newComment: current.transformed,
    }, {
      onSuccess: () => {
        // Move to next or exit preview mode
        if (currentPreviewIndex < transformPreviews.length - 1) {
          setCurrentPreviewIndex(prev => prev + 1);
        } else {
          // Done with all transforms
          setTransformPreviews([]);
          setCurrentPreviewIndex(0);
          setSelectedComments(new Set());
        }
      },
    });
  }, [transformPreviews, currentPreviewIndex, updateMutation]);

  // Skip current transform
  const skipCurrentTransform = useCallback(() => {
    if (currentPreviewIndex < transformPreviews.length - 1) {
      setCurrentPreviewIndex(prev => prev + 1);
    } else {
      setTransformPreviews([]);
      setCurrentPreviewIndex(0);
    }
  }, [currentPreviewIndex, transformPreviews.length]);

  // Cancel transform mode
  const cancelTransformMode = useCallback(() => {
    setTransformPreviews([]);
    setCurrentPreviewIndex(0);
  }, []);

  // Editable transformed value for current preview
  const updateCurrentTransformed = useCallback((newValue: string) => {
    setTransformPreviews(prev => {
      const next = [...prev];
      const current = next[currentPreviewIndex];
      if (current) {
        next[currentPreviewIndex] = { ...current, transformed: newValue };
      }
      return next;
    });
  }, [currentPreviewIndex]);

  if (commentsQuery.isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Manage Comments</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (commentsQuery.error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Manage Comments</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p className="error">Error: {commentsQuery.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform Preview Mode
  if (transformPreviews.length > 0) {
    const current = transformPreviews[currentPreviewIndex];
    
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && cancelTransformMode()}>
        <div className="modal-content manage-comments-modal">
          <div className="modal-header">
            <h2>Transform Preview</h2>
            <button className="close-button" onClick={cancelTransformMode}>×</button>
          </div>

          <div className="modal-body">
            <div className="transform-progress">
              <span>Transform {currentPreviewIndex + 1} of {transformPreviews.length}</span>
            </div>

            {current && (
              <div className="transform-preview">
                <div className="transform-original">
                  <label>Original:</label>
                  <div className="transform-value original">{current.original}</div>
                </div>
                <div className="transform-arrow">→</div>
                <div className="transform-result">
                  <label>Transform to:</label>
                  <input
                    type="text"
                    value={current.transformed}
                    onChange={(e) => updateCurrentTransformed(e.target.value)}
                    className="transform-input"
                  />
                </div>
              </div>
            )}

            <div className="transform-actions">
              <button
                className="transform-apply-btn"
                onClick={applyCurrentTransform}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Applying...' : 'Apply'}
              </button>
              <button
                className="transform-skip-btn"
                onClick={skipCurrentTransform}
                disabled={updateMutation.isPending}
              >
                Skip
              </button>
              <button
                className="transform-cancel-btn"
                onClick={cancelTransformMode}
              >
                Cancel All
              </button>
            </div>

            {/* Upcoming transforms list */}
            {transformPreviews.length > 1 && (
              <div className="upcoming-transforms">
                <label>Upcoming:</label>
                <div className="upcoming-list">
                  {transformPreviews.slice(currentPreviewIndex + 1, currentPreviewIndex + 4).map((preview, idx) => (
                    <div key={preview.original} className="upcoming-item">
                      <span className="upcoming-num">{currentPreviewIndex + 2 + idx}.</span>
                      <span className="upcoming-original">{preview.original.slice(0, 40)}{preview.original.length > 40 ? '...' : ''}</span>
                      <span className="upcoming-arrow">→</span>
                      <span className="upcoming-result">{preview.transformed.slice(0, 30)}{preview.transformed.length > 30 ? '...' : ''}</span>
                    </div>
                  ))}
                  {transformPreviews.length - currentPreviewIndex - 1 > 4 && (
                    <div className="upcoming-more">
                      ...and {transformPreviews.length - currentPreviewIndex - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="cancel-button" onClick={cancelTransformMode}>
              Exit Transform Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content manage-comments-modal">
        <div className="modal-header">
          <h2>Manage Comments</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Update Controls */}
          {selectedComments.size > 0 && (
            <div className="update-controls">
              <span className="selected-count">{selectedComments.size} comment(s) selected</span>
              <div className="update-row">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="New comment value (empty to clear)"
                  className="update-input"
                />
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="update-button"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update All'}
                </button>
              </div>
              <div className="quick-actions">
                <span className="quick-actions-label">Quick transforms (review one by one):</span>
                <button
                  className="quick-action-btn"
                  onClick={() => startTransformPreview('comma')}
                  title='Convert "a, b, c" to "[a] [b] [c]"'
                >
                  Comma → Brackets
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => startTransformPreview('dash')}
                  title='Convert "a - b -" to "[a] [b]"'
                >
                  Dash → Brackets
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => startTransformPreview('slash')}
                  title='Convert "a / b / c" to "[a] [b] [c]"'
                >
                  Slash → Brackets
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => startTransformPreview('wrap')}
                  title='Wrap with brackets "[text]"'
                >
                  Wrap [ ]
                </button>
              </div>
              {updateMutation.isSuccess && (
                <p className="success-message">
                  Updated {updateMutation.data.updatedCount} track(s)
                </p>
              )}
            </div>
          )}

          {/* Category Sections */}
          <div className="categories-container">
            {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((category) => {
              const comments = allComments.categories[category] ?? [];
              if (comments.length === 0) return null;
              
              const isExpanded = expandedCategories.has(category);
              const selectedInCategory = comments.filter((c) => selectedComments.has(c)).length;
              const allSelected = selectedInCategory === comments.length;

              return (
                <div key={category} className="category-section">
                  <div className="category-header" onClick={() => toggleCategory(category)}>
                    <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
                    <span className="category-name">{CATEGORY_LABELS[category]}</span>
                    <span className="category-count">
                      ({comments.length})
                      {selectedInCategory > 0 && (
                        <span className="selected-badge"> · {selectedInCategory} selected</span>
                      )}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="category-content">
                      <div className="category-actions">
                        <button
                          className="select-all-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (allSelected) {
                              deselectAllInCategory(category)
                            } else {
                              selectAllInCategory(category);
                            } 
                          }}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="comments-list">
                        {comments.map((comment) => (
                          <label key={comment} className="comment-item">
                            <input
                              type="checkbox"
                              checked={selectedComments.has(comment)}
                              onChange={() => toggleComment(comment)}
                            />
                            <span className="comment-text">
                              {comment}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
