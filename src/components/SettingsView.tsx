import React, { useState } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  Save,
  Shield,
  MessageCircle,
  Building,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  HardDrive,
} from 'lucide-react';
import { GymSettings } from '../types';
import { api } from '../utils/api';

interface SettingsViewProps {
  settings: GymSettings | null;
  onRefreshSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefreshSettings }) => {
  const [gymName, setGymName] = useState(settings?.gym_name || 'Pump Club');
  const [phone, setPhone] = useState(settings?.phone || '01000000000');
  const [address, setAddress] = useState(settings?.address || 'القاهرة، مصر');
  const [currency, setCurrency] = useState(settings?.currency || 'ج.م');
  const [expiringDays, setExpiringDays] = useState<number>(settings?.expiring_soon_days || 3);
  const [whatsappExpired, setWhatsappExpired] = useState(
    settings?.whatsapp_expired_msg ||
      'أهلاً بك من Pump Club! نود إبلاغك أن اشتراكك في الجيم قد انتهى. ننتظرك لتجديده ومواصلة تمارينك بنجاح! 💪'
  );
  const [whatsappExpiringSoon, setWhatsappExpiringSoon] = useState(
    settings?.whatsapp_expiring_soon_msg ||
      'مرحباً بك من Pump Club! نود تذكيرك بأن اشتراكك قارب على الانتهاء بتاريخ {endDate}. بادر بالتجديد للاستمرار بدون انقطاع! 🏋️‍♂️'
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await api.updateSettings({
        gym_name: gymName,
        phone,
        address,
        currency,
        expiring_soon_days: expiringDays,
        whatsapp_expired_msg: whatsappExpired,
        whatsapp_expiring_soon_msg: whatsappExpiringSoon,
      });
      setSaveSuccess(true);
      onRefreshSettings();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    setBackupLoading(true);
    try {
      const a = document.createElement('a');
      a.href = api.getBackupUrl();
      a.download = `pumpclub-backup-${new Date().toISOString().split('T')[0]}.db`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) return;
    if (!window.confirm('تحذير: استعادة نسخة احتياطية سيستبدل قاعدة البيانات الحالية. هل تود المتابعة؟')) {
      return;
    }

    setRestoreLoading(true);
    setRestoreMsg(null);

    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);
      const res = await api.restoreBackup(formData);
      setRestoreMsg(res.message || 'تمت استعادة قاعدة البيانات بنجاح!');
      onRefreshSettings();
    } catch (err: any) {
      setRestoreMsg(`خطأ: ${err.message || 'فشل استعادة النسخة الاحتياطية'}`);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span>إعدادات النظام والنسخ الاحتياطي (Settings)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          إدارة بيانات الجيم، قوالب رسائل الواتساب، والنسخ الاحتياطي لقاعدة بيانات SQLite المحلية.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>تم حفظ الإعدادات في قاعدة البيانات المحلية بنجاح!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Gym General Info Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">بيانات النادي الرياضي (Gym Info)</h2>
              <p className="text-xs text-slate-400">تظهر في البطاقات المطبوعة والتقارير.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">اسم الجيم / النادي</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">رقم الهاتف الرسمي</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">العنوان أو الفرع</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">العملة</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">تنبيه قبل الانتهاء بـ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={expiringDays}
                    onChange={(e) => setExpiringDays(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-xs text-slate-400">أيام</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Templates Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">قوالب رسائل واتساب الافتراضية</h2>
              <p className="text-xs text-slate-400">يمكنك استخدام {'{endDate}'} لوضع تاريخ الانتهاء تلقائياً.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                رسالة التذكير بقرب انتهاء الاشتراك (Expiring Soon)
              </label>
              <textarea
                rows={3}
                value={whatsappExpiringSoon}
                onChange={(e) => setWhatsappExpiringSoon(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                رسالة تنبيه انتهاء الاشتراك (Expired)
              </label>
              <textarea
                rows={3}
                value={whatsappExpired}
                onChange={(e) => setWhatsappExpired(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}</span>
          </button>
        </div>
      </form>

      {/* Local SQLite Database & Backup Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">إدارة قاعدة البيانات المحلية (Local SQLite DB)</h2>
            <p className="text-xs text-slate-400">
              قاعدة البيانات مخزنة محلياً في <span className="font-mono text-cyan-400">/data/pumpclub.db</span> مع مجلدات الصور.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Backup Download */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                <Database className="w-4 h-4 text-amber-500" />
                <span>تصدير نسخة احتياطية (Backup)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                قم بتحميل ملف <span className="font-mono text-slate-300">pumpclub.db</span> لحفظه على فلاشة USB أو قرص خارجي لحماية بيانات الجيم.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={backupLoading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>تحميل ملف قاعدة البيانات الآن (.db)</span>
            </button>
          </div>

          {/* Backup Restore */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>استعادة نسخة احتياطية (Restore)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                استرجاع بيانات الجيم من ملف SQLite سابق تم نسخه.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />

              {restoreMsg && (
                <p className="text-xs font-semibold text-cyan-400">{restoreMsg}</p>
              )}

              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={!restoreFile || restoreLoading}
                className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {restoreLoading ? 'جاري الاستعادة...' : 'بدء استعادة قاعدة البيانات'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
