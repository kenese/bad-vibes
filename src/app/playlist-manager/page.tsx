export default function PlaylistManagerPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0d1117]">
      <div className="max-w-md p-10 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl">
        <div className="text-6xl mb-6">🔨</div>
        <h1 className="text-3xl font-bold mb-4 text-[#f0f6fc]">Playlist Manager</h1>
        <p className="text-[#8b949e] mb-8">
          This feature is currently under development. Soon you'll be able to manage your 
          Traktor playlists with advanced batch tools and automated organization.
        </p>
        <div className="h-1 w-24 bg-[#388bfd] mx-auto rounded-full"></div>
      </div>
    </div>
  );
}
