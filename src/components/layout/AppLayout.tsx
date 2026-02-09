import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ThemePicker } from '@/components/shared/ThemePicker';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Sidebar />}
      
      {/* Top bar with theme picker */}
      <div className={`fixed top-0 right-0 z-40 p-4 ${isMobile ? 'left-0' : 'left-64'}`}>
        <div className="flex justify-end">
          <ThemePicker />
        </div>
      </div>
      
      <main className={`${isMobile ? 'pb-20' : 'ml-64'} min-h-screen`}>
        <div className="p-4 md:p-8 pt-14 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
      {isMobile && <MobileNav />}
    </div>
  );
}
