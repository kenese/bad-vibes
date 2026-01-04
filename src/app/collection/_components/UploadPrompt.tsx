'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { api } from '~/trpc/react';

const UploadPrompt = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
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
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/collection/upload/vercel-blob',
      });

      console.log('Blob uploaded:', newBlob.url);
      registerCollection.mutate({ url: newBlob.url });
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

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full py-3 px-4 bg-[#238636] hover:bg-[#2eaa42] disabled:bg-[#238636]/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            {isUploading ? 'Uploading Collection...' : 'Get Started'}
          </button>
        </form>

        <p className="text-xs text-[#484f58] mt-6 italic">
          Files up to 100MB supported. Uploading may take a moment.
        </p>
      </div>
    </div>
  );
};

export default UploadPrompt;
