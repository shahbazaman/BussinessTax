import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
const [loading, setLoading] = useState(false);
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await register(formData);
    window.dispatchEvent(new Event('authChange')); 
    navigate('/');
  } catch (err) {
    alert(err.response?.data?.message || "Registration failed");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2">Start managing your business tax today.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
              placeholder="John Doe"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
              placeholder="john@example.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input 
              type="password" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button disabled={loading} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
  {loading ? 'Creating Account...' : 'Create Free Account'}
</button>
        </form>
        <p className="text-center text-sm text-slate-600 mt-6">
          Already have an account? <Link to="/login" className="text-brand font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};
export default Register;