'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';

const UploadPrompt = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCloud, setUseCloud] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const deleteCollection = api.collection.deleteCollection.useMutation({
    onSuccess: () => {
      // Refresh to clear any stale state
      window.location.reload();
    },
    onError: (err) => {
      console.error('Failed to delete collection:', err);
      // Even if it fails, try to clear UI state
      setError(null);
    }
  });

  const handleDeleteCollection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to reset your collection data?')) return;
    deleteCollection.mutate();
    setError(null);
  };

  const registerCollection = api.collection.registerCollection.useMutation({
    onSuccess: () => {
      onUploadSuccess();
    },
    onError: () => {
      setError('Failed to register collection. Please try again.');
      setIsUploading(false);
    }
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In dev mode, use a mock user ID if no session
    const isDev = process.env.NODE_ENV === 'development';
    const userId = session?.user?.id ?? (isDev ? 'dev-user-001' : null);
    
    if (!file || !userId) return;

    setIsUploading(true);
    setError(null);

    try {
      let collectionUrl: string;

      if (useCloud) {
        const newBlob = await upload(`collections/${userId}/collection.nml`, file, {
          access: 'public',
          handleUploadUrl: '/api/collection/upload/vercel-blob',
        });
        console.log('Blob uploaded:', newBlob.url);
        collectionUrl = newBlob.url;
      } else {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/collection/upload/memory', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Memory upload failed');
        }
        
        const data = (await res.json()) as { url: string };
        collectionUrl = data.url;
      }

      registerCollection.mutate({ url: collectionUrl });
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload collection. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full p-8 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl text-center">
        <div className="text-5xl mb-6">📂</div>
        <h2 className="text-2xl font-bold mb-4 text-[#f0f6fc]">Upload Traktor Collection</h2>
        <p className="text-[#8b949e] mb-8 leading-relaxed">
          Welcome! To get started, please upload your <code>collection.nml</code> file. 
          This is typically found in your Documents folder under Native Instruments.
        </p>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="relative group">
            <input
              type="file"
              accept=".nml"
              onChange={handleFileChange}
              id="collection-upload"
              className="hidden"
            />
            <label
              htmlFor="collection-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#30363d] rounded-xl cursor-pointer hover:border-[#388bfd] hover:bg-[#1c2128] transition-all group-hover:border-[#388bfd]"
            >
              <span className="text-sm text-[#8b949e]">
                {file ? file.name : 'Click to select or drag & drop'}
              </span>
              {file && (
                <span className="text-xs text-[#58a6ff] mt-2">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </label>
          </div>

          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="cloud-backup"
              checked={useCloud}
              onChange={(e) => setUseCloud(e.target.checked)}
              className="rounded border-[#30363d] bg-[#0d1117] checked:bg-[#238636] focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="cloud-backup" className="text-sm text-[#c9d1d9] cursor-pointer select-none">
              Enable Cloud Backup (Slower, Persistent)
            </label>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex-1 py-3 px-4 bg-[#238636] hover:bg-[#2eaa42] disabled:bg-[#238636]/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              {isUploading ? 'Uploading Collection...' : 'Get Started'}
            </button>
            {error && (
              <button
                type="button"
                onClick={handleDeleteCollection}
                disabled={deleteCollection.isPending}
                className="px-4 bg-red-900/50 hover:bg-red-900 text-red-100 border border-red-800 rounded-lg transition-colors"
                title="Delete/Reset Collection"
              >
                🗑️
              </button>
            )}
          </div>
        </form>

        <p className="text-xs text-[#484f58] mt-6 italic">
          Files up to 100MB supported. Uploading may take a moment.
        </p>
      </div>
    </div>
  );
};

export default UploadPrompt;
