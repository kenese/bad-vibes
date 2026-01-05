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
          href="/playlist-tools" 
          className={`nav-link ${pathname.startsWith('/playlist-tools') ? 'active' : ''}`}
        >
          Playlist Tools
        </Link>
        <Link 
          href="/soulseek" 
          className={`nav-link ${pathname.startsWith('/soulseek') ? 'active' : ''}`}
        >
          Soulseek
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
