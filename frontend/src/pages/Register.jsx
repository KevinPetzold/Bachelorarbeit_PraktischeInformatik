// /frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/Button';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password, budgetId });
      navigate('/login'); // nach erfolgreicher Registrierung → Login
    } catch (err) {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full">
      <h2 className="text-2xl font-bold mb-4">📝 Registrieren</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600">{error}</p>}
        <div>
          <label className="block font-semibold mb-1">Name: </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">E-Mail: </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Budget-ID: </label>
          <input
            type="text"
            value={budgetId}
            onChange={e => setBudgetId(e.target.value)}
            placeholder="MdB-ID"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Passwort: </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? '⏳ …' : 'Registrieren'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Hast du schon einen Account? <Link to="/login" className="text-blue-600 underline">Hier einloggen</Link>
      </p>
    </div>
  );
}
