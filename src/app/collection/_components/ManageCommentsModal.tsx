'use client';

import { useState, useMemo, useCallback } from 'react';
import { api } from '~/trpc/react';

interface ManageCommentsModalProps {
  onClose: () => void;
}

type CategoryKey = 'keyBpm' | 'genre' | 'url' | 'hex' | 'combination' | 'other';

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
