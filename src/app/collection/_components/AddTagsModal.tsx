'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { api } from '~/trpc/react';

interface Track {
  key: string;
  title: string;
  artist?: string;
  comment?: string;
}

const AI_TAGGED_MARKER = '[AITagged]';

interface TagLogEntry {
  artist: string;
  title: string;
  tags: string[];
}

interface AddTagsModalProps {
  tracks: Track[];
  onClose: () => void;
}

const BATCH_SIZE = 10; // Small batches to stay within rate limits
const BATCH_DELAY_MS = 10000; // 10 seconds between batches for rate limiting

export default function AddTagsModal({ tracks, onClose }: AddTagsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [logEntries, setLogEntries] = useState<TagLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<{ updated: number; skipped: number; alreadyTagged: number } | null>(null);
  const abortRef = useRef(false);

  const addTagsMutation = api.collection.addTagsToTracks.useMutation();

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processBatches = useCallback(async () => {
    if (tracks.length === 0) {
      setError('No tracks to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLogEntries([]);
    setProgress(0);
    setTotalToProcess(0);
    abortRef.current = false;

    // Pre-check: test API availability with a single track
    setError('Checking API availability...');
    try {
      const testResponse = await fetch('/api/batch-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: [{ id: 'test', artist: 'Test', title: 'Test' }]
        })
      });

      if (testResponse.status === 429) {
        const errData = await testResponse.json() as { error?: string };
        const waitMatch = /(\d+)\s*seconds/i.exec(errData.error ?? '');
        const waitSeconds = waitMatch?.[1] ? parseInt(waitMatch[1], 10) + 10 : 70;

        // Wait with countdown before starting
        for (let s = waitSeconds; s > 0 && !abortRef.current; s--) {
          setError(`API rate limited. Waiting ${s}s before starting...`);
          await delay(1000);
        }

        if (abortRef.current) {
          setIsProcessing(false);
          return;
        }
      } else if (!testResponse.ok) {
        const errData = await testResponse.json() as { error?: string };
        throw new Error(errData.error ?? 'API not available');
      }
    } catch (testError) {
      if (testError instanceof Error && testError.message.includes('Rate limited')) {
        // Already handled above
      } else {
        console.error('API test failed:', testError);
        setError(testError instanceof Error ? testError.message : 'API test failed');
        setIsProcessing(false);
        return;
      }
    }

    setError(null);

    let totalUpdated = 0;
    let totalSkipped = 0;
    let processedCount = 0;

    // Filter out tracks that already have [AITagged] marker
    const tracksToProcess = tracks.filter(track => {
      const comment = track.comment?.toLowerCase() ?? '';
      return !comment.includes(AI_TAGGED_MARKER.toLowerCase());
    });

    const alreadyTaggedCount = tracks.length - tracksToProcess.length;

    if (tracksToProcess.length === 0) {
      setIsComplete(true);
      setSummary({ updated: 0, skipped: 0, alreadyTagged: alreadyTaggedCount });
      setIsProcessing(false);
      return;
    }

    setTotalToProcess(tracksToProcess.length);

    // Split tracks into batches
    const batches: Track[][] = [];
    for (let i = 0; i < tracksToProcess.length; i += BATCH_SIZE) {
      batches.push(tracksToProcess.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (abortRef.current) break;

      const batch = batches[batchIndex];
      if (!batch) continue;

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Call the batch-tag API
          const aiResponse = await fetch('/api/batch-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracks: batch.map(t => ({
                id: t.key,
                artist: t.artist ?? 'Unknown',
                title: t.title
              }))
            })
          });

          // Handle rate limiting with automatic retry
          if (aiResponse.status === 429) {
            const errData = await aiResponse.json() as { error?: string };
            const waitMatch = /(\d+)\s*seconds/i.exec(errData.error ?? '');
            const waitSeconds = waitMatch?.[1] ? parseInt(waitMatch[1], 10) + 5 : 65; // Add 5s buffer

            retryCount++;
            if (retryCount < maxRetries) {
              setError(`Rate limited. Waiting ${waitSeconds}s before retry (attempt ${retryCount}/${maxRetries})...`);

              // Wait with countdown
              for (let s = waitSeconds; s > 0 && !abortRef.current; s--) {
                setError(`Rate limited. Retrying in ${s}s (attempt ${retryCount}/${maxRetries})...`);
                await delay(1000);
              }
              setError(null);
              continue; // Retry the batch
            } else {
              throw new Error(`Rate limited after ${maxRetries} attempts. Please try again later.`);
            }
          }

          if (!aiResponse.ok) {
            const errData = await aiResponse.json() as { error?: string };
            throw new Error(errData.error ?? `API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json() as {
            results: { id: string; tags: string[] }[]
          };

          // Update tracks with the tags
          const updates = aiData.results
            .filter(r => r.tags.length > 0)
            .map(r => ({
              trackKey: r.id,
              tags: r.tags
            }));

          if (updates.length > 0) {
            const result = await addTagsMutation.mutateAsync({ updates });
            totalUpdated += result.updatedCount;
            totalSkipped += result.skippedCount;

            // Add to log
            result.tagsAdded.forEach(entry => {
              setLogEntries(prev => [...prev, {
                artist: entry.artist,
                title: entry.title,
                tags: entry.newTags
              }]);
            });
          }

          break; // Success, exit retry loop

        } catch (batchError) {
          console.error(`Batch ${batchIndex + 1} error:`, batchError);
          setError(batchError instanceof Error ? batchError.message : 'Unknown error');
          break; // Exit retry loop on non-rate-limit errors
        }
      }

      processedCount += batch.length;
      setProgress(processedCount);

      // Rate limit delay (skip on last batch)
      if (batchIndex < batches.length - 1 && !abortRef.current) {
        await delay(BATCH_DELAY_MS);
      }
    }

    setIsProcessing(false);
    setIsComplete(true);
    setSummary({ updated: totalUpdated, skipped: totalSkipped, alreadyTagged: alreadyTaggedCount });
  }, [tracks, addTagsMutation]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
  }, []);

  // Pre-calculate how many tracks already have the AITagged marker
  const preFilterStats = useMemo(() => {
    const alreadyTagged = tracks.filter(t =>
      (t.comment?.toLowerCase() ?? '').includes(AI_TAGGED_MARKER.toLowerCase())
    ).length;
    return {
      alreadyTagged,
      toProcess: tracks.length - alreadyTagged
    };
  }, [tracks]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}>
      <div className="modal-container add-tags-modal">
        <div className="modal-header">
          <h2>AI Auto-Tagging</h2>
          {!isProcessing && !isComplete && (
            <button className="modal-close" onClick={onClose}>×</button>
          )}
        </div>

        <div className="modal-body">
          {!isProcessing && !isComplete && (
            <div className="add-tags-start">
              <p>
                Ready to process <strong>{preFilterStats.toProcess}</strong> tracks.
                {preFilterStats.alreadyTagged > 0 && (
                  <span className="add-tags-info" style={{ marginLeft: '0.5rem' }}>
                    ({preFilterStats.alreadyTagged} already tagged, will be skipped)
                  </span>
                )}
              </p>
              <p className="add-tags-info">
                Tracks will be processed in batches of {BATCH_SIZE} with a {BATCH_DELAY_MS / 1000}s delay between batches.
              </p>
              <p className="add-tags-info">
                Estimated time: ~{Math.ceil(preFilterStats.toProcess / BATCH_SIZE * (BATCH_DELAY_MS / 1000 + 2))} seconds
              </p>
              <button
                className="utility-button primary"
                onClick={processBatches}
                disabled={preFilterStats.toProcess === 0}
              >
                {preFilterStats.toProcess === 0 ? 'All Tracks Already Tagged' : 'Start Tagging'}
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="add-tags-progress">
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${totalToProcess > 0 ? (progress / totalToProcess) * 100 : 0}%` }}
                />
              </div>
              <p className="progress-text">
                Processing {progress} / {totalToProcess} tracks
              </p>
              <button className="utility-button cancel" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}

          {error && (
            <div className="add-tags-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {logEntries.length > 0 && (
            <div className="add-tags-log">
              <h4>Live Log ({logEntries.length} tagged)</h4>
              <div className="log-table-container">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Artist - Title</th>
                      <th>Tags Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.slice(-20).reverse().map((entry, i) => (
                      <tr key={i}>
                        <td>{entry.artist} - {entry.title}</td>
                        <td>{entry.tags.map(t => `[${t}]`).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isComplete && summary && (
            <div className="add-tags-summary">
              <h3>✅ Tagging Complete</h3>
              <p><strong>{summary.updated}</strong> tracks updated with new tags</p>
              {summary.alreadyTagged > 0 && (
                <p><strong>{summary.alreadyTagged}</strong> tracks skipped (already AI-tagged)</p>
              )}
              {summary.skipped > 0 && (
                <p><strong>{summary.skipped}</strong> tracks skipped (not found or no tags generated)</p>
              )}
              <button className="utility-button primary" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
