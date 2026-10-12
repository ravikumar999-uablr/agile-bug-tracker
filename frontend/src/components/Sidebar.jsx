import React from 'react';

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-indigo-400 mb-8">
          🐛 BugTracker
        </h1>
        <nav className="space-y-4">
          <a href="#" className="block py-2.5 px-4 rounded transition bg-slate-800 text-white">
            📊 Dashboard
          </a>
          <a href="#" className="block py-2.5 px-4 rounded transition text-gray-400 hover:bg-slate-800 hover:text-white">
            🎟️ Tickets
          </a>
          <a href="#" className="block py-2.5 px-4 rounded transition text-gray-400 hover:bg-slate-800 hover:text-white">
            ⚙️ Settings
          </a>
        </nav>
      </div>
      <div className="border-t border-slate-800 pt-4 text-sm text-gray-500">
        Logged in as: <span className="text-gray-300 block font-medium">Developer</span>
      </div>
    </aside>
  );
}

export default Sidebar;
