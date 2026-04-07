import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profileUrl: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = new URLSearchParams(window.location.search).get('redirect') || '';
  const safeRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/subscriber/account';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Ijambo ry'ibanga ntirihura.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Ijambo ry'ibanga rigomba kuba nibura inyuguti 6.");
      return;
    }

    setIsLoading(true);

    try {
      const username = formData.email.split('@')[0] || `user${Date.now()}`;
      const response = await apiClient.register({
        username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        profileUrl: formData.profileUrl ? formData.profileUrl.trim() : undefined
      });

      if (response.success) {
        if (response.user?.role !== 'USER') {
          setError("Kwiyandikisha byagenze nabi ku ruhande rwa server. Ongera ugerageze cyangwa hamagara support.");
          return;
        }

        localStorage.setItem('umunsi_user', JSON.stringify(response.user));
        if (response.token) {
          localStorage.setItem('umunsi_token', response.token);
        }
        window.location.href = safeRedirect;
        return;
      }

      setError('Kwiyandikisha byanze. Ongera ugerageze.');
    } catch (err: any) {
      setError(err?.message || 'Kwiyandikisha byanze.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#181a20] border border-[#2b2f36] rounded-2xl p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src="/images/logo.png" alt="Umunsi.com Logo" className="h-12 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Fungura Konti y'Abafatabuguzi</h1>
          <p className="text-gray-400 text-sm mt-1">Kwiyandikisha ukoresheje imeyili</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Izina</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg pl-10 pr-3 py-3 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Izina ry'umuryango</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg px-3 py-3 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Imeyili</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg pl-10 pr-3 py-3 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">URL ya Account yawe (Optional)</label>
            <input
              type="url"
              name="profileUrl"
              value={formData.profileUrl}
              onChange={handleInputChange}
              placeholder="https://www.umunsimedia.com/your-account"
              className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg px-3 py-3 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Ijambo ry'ibanga</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg pl-10 pr-10 py-3 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Emeza ijambo ry'ibanga</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg pl-10 pr-10 py-3 text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#fcd535] text-[#0b0e11] font-bold py-3 rounded-lg hover:bg-[#f0b90b] disabled:opacity-60"
          >
            {isLoading ? 'Birimo...' : 'Fungura Konti'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          Google signup iri gutegurwa. Ubu koresha imeyili.
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          Usanzwe ufite konti?
          <Link to="/subscriber-login" className="text-[#fcd535] ml-1 hover:underline">
            Injira
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
