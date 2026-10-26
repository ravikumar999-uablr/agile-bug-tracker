import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthPage from './components/AuthPage';

const API_URL = 'https://onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState('Medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_URL, {
        headers: { 'x-auth-token': token }
      });
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        API_URL, 
        { title: newTicketTitle, priority: newTicketPriority }, 
        { headers: { 'x-auth-token': token } }
      );
      setTickets([response.data, ...tickets]);
      setNewTicketTitle('');
      setNewTicketPriority('Medium');
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  // 📡 NEW: UPDATE STATUS API CALL HANDLER
  const handleStatusChange = async (id, nextStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/${id}/status`,
        { status: nextStatus },
        { headers: { 'x-auth-token': token } }
      );
      
      // Update local state smoothly: find the ticket by ID and swap out its status values
      setTickets(tickets.map(ticket => ticket._id === id ? response.data : ticket));
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setTickets(tickets.filter(ticket => ticket._id !== id));
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTickets([]);
  };

  if (!user) {
    return <AuthPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* 🧭 Re-Branded Sidebar Menu */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400 mb-8">🚀 IssueFlow Pro</h1>
          <nav className="space-y-4">
            <a href="#" className="block py-2.5 px-4 rounded transition bg-slate-800 text-white">📊 Dashboard</a>
            <a href="#" className="block py-2.5 px-4 rounded transition text-gray-400 hover:bg-slate-800 hover:text-white">🎟️ Tickets</a>
          </nav>
        </div>
        <div className="border-t border-slate-800 pt-4 text-sm flex flex-col gap-3">
          <div className="text-gray-400">
            User: <span className="text-indigo-300 font-medium block truncate">{user.name}</span>
          </div>
          <button onClick={handleLogout} className="w-full text-left py-2 px-3 rounded text-xs bg-red-950 text-red-300 hover:bg-red-900 transition font-medium">
            Authorization Clear (Log Out)
          </button>
        </div>
      </aside>

      {/* Main panel body container */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Workspace Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Live agile development ticket analytics</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow transition">
            + New Ticket
          </button>
        </header>

        {/* Analytics Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">Open Issues</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{tickets.filter(t => t.status === 'Open').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">In Progress</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{tickets.filter(t => t.status === 'In Progress').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-400 font-medium text-sm uppercase">Resolved</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{tickets.filter(t => t.status === 'Resolved').length}</p>
          </div>
        </div>

        {/* Dynamic Log Cards Wrapper */}
        <h3 className="text-xl font-bold text-gray-800 mb-4">Open Bug Log Queue</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500 font-medium animate-pulse">🔄 Loading cloud files...</div>
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
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      ticket.status === 'Open' ? 'bg-gray-100 text-gray-700' :
                      ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      ⚙️ {ticket.status}
                    </span>
                  </div>
                </div>
                
                {/* 🔘 Dynamic Interactive Action Workflow Buttons Panel */}
                <div className="flex items-center gap-2">
                  {ticket.status === 'Open' && (
                    <button onClick={() => handleStatusChange(ticket._id, 'In Progress')} className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition">
                      🛠️ Start Work
                    </button>
                  )}
                  {ticket.status === 'In Progress' && (
                    <button onClick={() => handleStatusChange(ticket._id, 'Resolved')} className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition">
                      ✅ Resolve Issue
                    </button>
                  )}
                  <button onClick={() => handleDelete(ticket._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Ticket">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up Form Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Log New Project Issue</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title Description</label>
                <input type="text" required value={newTicketTitle} onChange={(e) => setNewTicketTitle(e.target.value)} placeholder="e.g., Application router context crash" className="w-full border p-2 rounded-lg outline-indigo-600 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Issue Priority Level</label>
                <select value={newTicketPriority} onChange={(e) => setNewTicketPriority(e.target.value)} className="w-full border p-2 rounded-lg outline-indigo-600 bg-white">
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition"
                >
                  Add Bug Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
