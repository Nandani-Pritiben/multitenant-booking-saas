import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <a href="/dashboard" className="block px-3 py-2 text-gray-700 bg-gray-100 rounded-md font-medium">
              Dashboard
            </a>
            <a href="/dashboard/services" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Services
            </a>
            <a href="/dashboard/providers" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Providers
            </a>
            <a href="/dashboard/calendar" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Calendar
            </a>
            <a href="/dashboard/bookings" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Bookings
            </a>
            <a href="/dashboard/clients" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Clients
            </a>
            <a href="/dashboard/billing" className="block px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md">
              Billing
            </a>
            <a href="/dashboard/settings" className="block px-3 py-2 text-gray-700 bg-gray-100 rounded-md font-medium">
              Settings
            </a>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;