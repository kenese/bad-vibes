'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          Home
        </Link>
        <Link 
          href="/collection" 
          className={`nav-link ${pathname.startsWith('/collection') ? 'active' : ''}`}
        >
          Traktor Collection
        </Link>
        <Link 
          href="/playlist-manager" 
          className={`nav-link ${pathname.startsWith('/playlist-manager') ? 'active' : ''}`}
        >
          Playlist Manager
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
