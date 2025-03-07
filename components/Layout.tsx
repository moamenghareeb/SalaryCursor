import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Icons (you can replace these with actual icon components)
const DashboardIcon = () => <svg>...</svg>;
const SalaryIcon = () => <svg>...</svg>;
const LeaveIcon = () => <svg>...</svg>;
const ProfileIcon = () => <svg>...</svg>;
const LogoutIcon = () => <svg>...</svg>;

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Navigation = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: <DashboardIcon />,
      requiredRole: null 
    },
    { 
      href: '/salary', 
      label: 'Salary', 
      icon: <SalaryIcon />,
      requiredRole: null 
    },
    { 
      href: '/leave', 
      label: 'Leave', 
      icon: <LeaveIcon />,
      requiredRole: null 
    },
    { 
      href: '/profile', 
      label: 'Profile', 
      icon: <ProfileIcon />,
      requiredRole: null 
    }
  ];

  return (
    <nav 
      className="fixed left-0 top-0 h-full w-64 bg-white shadow-md transition-all duration-300"
      aria-label="Main Navigation"
    >
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Salary Management</h2>
      </div>
      
      <ul className="py-4">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link 
              href={item.href}
              className={`
                flex items-center p-3 hover:bg-gray-100 
                ${router.pathname === item.href ? 'bg-blue-50 text-blue-600' : ''}
              `}
              aria-current={router.pathname === item.href ? 'page' : undefined}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          </li>
        ))}
        
        <li>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-3 hover:bg-red-50 hover:text-red-600"
            aria-label="Logout"
          >
            <LogoutIcon />
            <span className="ml-3">Logout</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, title = 'Salary Management' }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navigation />
      
      <main 
        className="flex-grow p-8 ml-64 transition-all duration-300"
        aria-live="polite"
      >
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 
              className="text-3xl font-bold text-gray-800"
              aria-label={`Current Page: ${title}`}
            >
              {title}
            </h1>
          </header>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout; 