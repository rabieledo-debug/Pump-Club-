import React, { useState } from 'react';
import { Dumbbell, Lock, User, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import { User as UserType } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ username: username.trim(), password });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans" dir="rtl">
      {/* Background aesthetic gym glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-xl shadow-amber-500/20 mb-4 ring-4 ring-amber-500/20">
            <Dumbbell className="w-10 h-10 text-slate-950 font-black" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase mb-1">
            PUMP <span className="text-amber-500">CLUB</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            نظام إدارة الجيم والاشتراكات المحلي
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-200">تسجيل الدخول للنظام</h2>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-11 pl-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-11 pl-11 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>دخول البرنامج</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick default login helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline transition-colors cursor-pointer"
            >
              تسجيل الدخول الافتراضي: admin / admin123
            </button>
          </div>
        </div>

        {/* Offline Badge Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>قاعدة بيانات SQLite محلية • تعمل بدون إنترنت بنسبة 100%</span>
        </div>
      </div>
    </div>
  );
};
