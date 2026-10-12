import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthPage from './components/AuthPage';

const API_URL = 'http://localhost:5000/api/tickets';

function App() {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState('Medium');
  const [loading, setLoading] = useState(false);

  // 🔄 Check if user is already logged in on page load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch tickets whenever the logged-in user state updates
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setTickets(response.data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) return;

    try {
      const response = await axios.post(API_URL, {
        title: newTicketTitle,
        priority: newTicketPriority,
        userId: user.id // Send the authenticated active user ID along with our data payload
      });
      setTickets([response.data, ...tickets]);
      setNewTicketTitle('');
      setNewTicketPriority('Medium');
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setTickets(tickets.filter(ticket => ticket._id !== id));
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  // 🚪 Clear authentication storage data to log out cleanly
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTickets([]);
  };

  // 🛡️ Guard Clause Check: If user session object is null, force display of the authentication screen form
  if (!user) {
    return <AuthPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar Panel Layout */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400 mb-8">🐛 BugTracker</h1>
          <nav className="space-y-4">
            <a href="#" className="block py-2.5 px-4 rounded transition bg-slate-800 text-white">📊 Dashboard</a>
            <a href="#" className="block py-2.5 px-4 rounded transition text-gray-400 hover:bg-slate-800 hover:text-white">🎟️ Tickets</a>
          </nav>
        </div>
        <div className="border-t border-slate-800 pt-4 text-sm flex flex-col gap-3">
          <div className="text-gray-400">
            User: <span className="text-indigo-300 font-medium block truncate">{user.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full text-left py-2 px-3 rounded text-xs bg-red-950 text-red-300 hover:bg-red-900 transition font-medium"
          >
            🚪 Exit Session (Log Out)
          </button>
        </div>
      </aside>

      {/* Main Panel Content Frame */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Workspace Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Role-authenticated issue database logs</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow transition"
          >
            + New Ticket
          </button>
        </header>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">Total Active Issues</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{tickets.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">High Priority</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{tickets.filter(t => t.priority === 'High').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">Status: Open</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{tickets.filter(t => t.status === 'Open').length}</p>
          </div>
        </div>

        {/* Grid Log Display */}
        <h3 className="text-xl font-bold text-gray-800 mb-4">Open Bug Log Queue</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500 font-medium animate-pulse">🔄 Querying server pipeline...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl bg-white">No active issues logged.</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{ticket.title}</h4>
                  <div className="flex gap-3 mt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      ticket.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      ⚠️ {ticket.priority} Priority
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                      ⚙️ {ticket.status}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(ticket._id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up Data Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Log New Project Issue</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title Description</label>
                <input 
                  type="text" required value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="e.g., Application router context crash" 
                  className="w-full border p-2 rounded-lg outline-indigo-600 bg-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Issue Priority Level</label>
                <select 
                  value={newTicketPriority} onChange={(e) => setNewTicketPriority(e.target.value)}
                  className="w-full border p-2 rounded-lg outline-indigo-600 bg-white"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel Close</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Add Bug Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
