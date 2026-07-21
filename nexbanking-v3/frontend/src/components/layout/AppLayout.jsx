import Sidebar from './Sidebar';

const AppLayout = ({ children }) => (
  <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
    <Sidebar />
    <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 transition-all duration-300 min-w-0">
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto animate-slide-up">
        {children}
      </div>
    </main>
  </div>
);

export default AppLayout;
