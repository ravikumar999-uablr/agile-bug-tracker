import React, { useState } from 'react';
import axios from 'axios';

function AuthPage({ onLoginSuccess }) {
  // 🔄 Tracking states for forms
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Determine which API route endpoint to call based on form layout state
    const endpoint = isLoginView ? 'login' : 'register';
    const payload = isLoginView ? { email, password } : { name, email, password };

    try {
      const response = await axios.post(`https://agile-bug-tracker-backend.onrender.com/api/auth/${endpoint}`, payload);
      
      // Save the encrypted credential passport token and user details inside the browser storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Trigger the success callback handler to unlock the parent application dashboard view
      onLoginSuccess(response.data.user);
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Authentication workflow failed. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-800">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-indigo-600 tracking-tight">🐛 BugTracker v2.0</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {isLoginView ? 'Secure Workspace Developer Login' : 'Register New Engineering Account'}
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium border border-red-200">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" className="w-full border p-2.5 rounded-lg outline-indigo-600 bg-white" 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@company.com" className="w-full border p-2.5 rounded-lg outline-indigo-600 bg-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="w-full border p-2.5 rounded-lg outline-indigo-600 bg-white" 
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow transition mt-2">
            {isLoginView ? 'Sign In to Workspace' : 'Create Developer Account'}
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-4">
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setErrorMessage(''); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            {isLoginView ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
