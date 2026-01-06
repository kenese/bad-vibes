'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';

interface DiscogsImportProps {
    onImport: (items: { track: string; artist: string }[]) => void;
    onClose: () => void;
}

export function DiscogsImport({ onImport, onClose }: DiscogsImportProps) {
    const { data: session } = useSession();
    const [addedAfter, setAddedAfter] = useState('');
    const [page, setPage] = useState(1);
    
    // Check if user has Discogs linked? Check via finding account?
    // We can just try to fetch and if query fails with UNAUTHORIZED, show login button.
    
    const [selectedItems, setSelectedItems] = useState<Map<number, { track: string; artist: string; id: number }>>(new Map());

    const collectionQuery = api.discogs.getCollection.useQuery({
        page, 
        per_page: 50,
        added_after: addedAfter ? new Date(addedAfter).toISOString() : undefined
    }, {
        enabled: !!session?.user,
        retry: false
    });

    const toggleItem = (item: { track: string; artist: string; id: number }) => {
        const newSelected = new Map(selectedItems);
        if (newSelected.has(item.id)) {
            newSelected.delete(item.id);
        } else {
            newSelected.set(item.id, item);
        }
        setSelectedItems(newSelected);
    };

    const toggleAllPage = () => {
        if (!collectionQuery.data?.items) return;
        
        const newSelected = new Map(selectedItems);
        const pageItems = collectionQuery.data.items;
        const allSelected = pageItems.every(item => newSelected.has(item.id));
        
        if (allSelected) {
            pageItems.forEach(item => newSelected.delete(item.id));
        } else {
            pageItems.forEach(item => newSelected.set(item.id, item));
        }
        setSelectedItems(newSelected);
    };

    const handleImport = () => {
        if (selectedItems.size > 0) {
            onImport(Array.from(selectedItems.values()));
            onClose();
        }
    };

    if (collectionQuery.error?.data?.code === 'UNAUTHORIZED') {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-[#c9d1d9] mb-4">Connect Discogs</h2>
                    <p className="text-[#8b949e] mb-6">Link your Discogs account to import your collection.</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => window.location.href = '/api/discogs/auth'}
                            className="bg-[#388bfd] hover:bg-[#4396fd] text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Connect with Discogs
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-2xl w-full flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6 border-b border-[#30363d] pb-4">
                    <h2 className="text-xl font-bold text-[#c9d1d9]">Import from Discogs</h2>
                    <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9]">✕</button>
                </div>
                
                <div className="flex flex-wrap gap-4 mb-6 items-center bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">Added After</label>
                        <input 
                            type="date" 
                            className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-[#c9d1d9] outline-none focus:border-[#388bfd] [color-scheme:dark]"
                            value={addedAfter}
                            onChange={(e) => setAddedAfter(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-end h-full pt-5">
                       <div className="text-xs text-[#8b949e]">
                           {collectionQuery.isLoading ? 'Loading...' : 
                            collectionQuery.isError ? <span className="text-[#f85149]">Error loading collection</span> :
                            `${collectionQuery.data?.pagination.items ?? 0} items found`}
                       </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] border border-[#30363d] rounded-lg mb-6 bg-[#0d1117]">
                    {collectionQuery.isLoading ? (
                         <div className="flex items-center justify-center h-full text-[#8b949e]">Loading collection...</div>
                    ) : collectionQuery.data?.items.length === 0 ? (
                         <div className="flex items-center justify-center h-full text-[#8b949e]">No items found. Try adjusting filters.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-[#161b22] text-[#8b949e] font-semibold uppercase text-xs z-10">
                                <tr>
                                    <th className="py-2 px-4 border-b border-[#30363d] w-10">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-[#30363d] bg-[#0d1117] checked:bg-[#1f6feb] focus:ring-0 focus:ring-offset-0"
                                            checked={!!collectionQuery.data?.items?.length && collectionQuery.data.items.every(item => selectedItems.has(item.id))}
                                            onChange={toggleAllPage}
                                        />
                                    </th>
                                    <th className="py-2 px-4 border-b border-[#30363d]">Title</th>
                                    <th className="py-2 px-4 border-b border-[#30363d]">Artist</th>
                                    <th className="py-2 px-4 border-b border-[#30363d] text-right">Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collectionQuery.data?.items.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className={`border-b border-[#21262d] hover:bg-[#1c2128] cursor-pointer ${selectedItems.has(item.id) ? 'bg-[#1f6feb]/10' : ''}`}
                                        onClick={() => toggleItem(item)}
                                    >
                                        <td className="py-2 px-4 text-[#c9d1d9]">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedItems.has(item.id)}
                                                readOnly
                                                className="rounded border-[#30363d] bg-[#0d1117] checked:bg-[#1f6feb]"
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-[#c9d1d9]">{item.track}</td>
                                        <td className="py-2 px-4 text-[#c9d1d9] opacity-80">{item.artist}</td>
                                        <td className="py-2 px-4 text-[#8b949e] text-right font-mono text-xs">
                                            {new Date(item.added_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 px-3 py-1.5 rounded text-sm text-[#c9d1d9] border border-[#30363d]"
                        >
                            &larr; Prev
                        </button>
                        <span className="flex items-center text-sm text-[#8b949e] px-2">Page {page}</span>
                        <button 
                            disabled={page >= (collectionQuery.data?.pagination.pages ?? 1)}
                            onClick={() => setPage(p => p + 1)}
                            className="bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 px-3 py-1.5 rounded text-sm text-[#c9d1d9] border border-[#30363d]"
                        >
                            Next &rarr;
                        </button>
                    </div>

                    <div className="flex gap-3">
                         <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-[#8b949e] hover:text-[#c9d1d9] transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleImport}
                            disabled={selectedItems.size === 0}
                            className="bg-[#238636] hover:bg-[#2eaa42] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors border border-transparent shadow-md"
                        >
                            Import {selectedItems.size} Items
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
