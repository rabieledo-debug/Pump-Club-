import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Dumbbell,
  Users,
  Edit2,
  Trash2,
  Upload,
  X,
  RefreshCw,
  Search,
  Eye,
} from 'lucide-react';
import { Coach, Customer } from '../types';
import { api } from '../utils/api';

interface CoachesViewProps {
  coaches: Coach[];
  loading: boolean;
  onRefresh: () => void;
  onSelectCustomer: (id: number) => void;
}

export const CoachesView: React.FC<CoachesViewProps> = ({
  coaches,
  loading,
  onRefresh,
  onSelectCustomer,
}) => {
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [selectedCoachData, setSelectedCoachData] = useState<{ coach: Coach; customers: Customer[] } | null>(null);
  const [loadingCoachData, setLoadingCoachData] = useState(false);

  // Coach Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingCoach(null);
    setName('');
    setPhone('');
    setSpecialty('');
    setNotes('');
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setName(coach.name);
    setPhone(coach.phone || '');
    setSpecialty(coach.specialty || '');
    setNotes(coach.notes || '');
    setImageFile(null);
    setImagePreview(coach.image_path || null);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleViewCoachClients = async (coachId: number) => {
    setSelectedCoachId(coachId);
    setLoadingCoachData(true);
    try {
      const res = await api.getCoach(coachId);
      setSelectedCoachData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoachData(false);
    }
  };

  const handleDeleteCoach = async (coach: Coach) => {
    if (window.confirm(`هل أنت متأكد من حذف المدرب "${coach.name}"؟ سيتم إلغاء ربطه بالعملاء.`)) {
      try {
        await api.deleteCoach(coach.id);
        onRefresh();
        if (selectedCoachId === coach.id) {
          setSelectedCoachId(null);
          setSelectedCoachData(null);
        }
      } catch (err: any) {
        alert(err.message || 'فشل حذف المدرب');
      }
    }
  };

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('اسم الكوتش مطلوب');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (phone) formData.append('phone', phone.trim());
      if (specialty) formData.append('specialty', specialty.trim());
      if (notes) formData.append('notes', notes.trim());
      if (imageFile) formData.append('image', imageFile);

      if (editingCoach) {
        await api.updateCoach(editingCoach.id, formData);
      } else {
        await api.createCoach(formData);
      }

      setShowFormModal(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ بيانات المدرب');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>إدارة فريق المدربين (Coaches)</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-purple-400 font-bold border border-slate-700">
              {coaches.length} كوتش
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إضافة المدربين، متابعة العملاء المرتبطين بكل مدرب وإدارة التدريب الخاص (Private).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كوتش جديد</span>
          </button>
        </div>
      </div>

      {/* Coaches Grid */}
      {coaches.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Dumbbell className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">لا يوجد مدربين مسجلين بعد</h3>
          <p className="text-xs text-slate-500 mb-4">أضف كوتش جديد لربطه بعملاء التدريب الخاص.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مدرب الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coaches.map((coach) => {
            const isSelected = selectedCoachId === coach.id;
            return (
              <div
                key={coach.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {coach.image_path ? (
                      <img
                        src={coach.image_path}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl font-black text-purple-400">
                        {coach.name.substring(0, 1)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-white truncate">{coach.name}</h3>
                    <p className="text-xs text-purple-400 font-medium">
                      {coach.specialty || 'مدرب لياقة وبناء أجسام'}
                    </p>
                    {coach.phone && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span dir="ltr">{coach.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Coach Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl text-center border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي العملاء</span>
                    <span className="font-bold text-slate-200">{coach.total_customers ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl text-center border border-slate-800/80">
                    <span className="text-[10px] text-purple-400 block mb-0.5">عملاء Private</span>
                    <span className="font-bold text-purple-400">{coach.private_customers ?? 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleViewCoachClients(coach.id)}
                    className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>عرض العملاء ({coach.total_customers ?? 0})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(coach)}
                      title="تعديل"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCoach(coach)}
                      title="حذف"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Coach Clients Drawer / Section */}
      {selectedCoachId && (
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  العملاء المرتبطين بالكوتش: {selectedCoachData?.coach.name}
                </h3>
                <p className="text-xs text-slate-400">
                  قائمة بجميع المشتركين المسندين لهذا المدرب.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCoachId(null);
                setSelectedCoachData(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loadingCoachData ? (
            <div className="py-12 text-center text-xs text-slate-500">جاري تحميل العملاء...</div>
          ) : !selectedCoachData?.customers || selectedCoachData.customers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              لا يوجد عملاء مسجلين تحت إشراف هذا المدرب حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedCoachData.customers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => onSelectCustomer(cust.id)}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 flex items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {cust.image_path ? (
                        <img
                          src={cust.image_path}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-bold text-purple-400">
                          {cust.full_name.substring(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{cust.full_name}</p>
                      <p className="text-[10px] text-slate-400">{cust.membership_id} • {cust.phone}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      cust.is_private ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cust.is_private ? 'Private' : 'Regular'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Coach Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-100">
                  {editingCoach ? 'تعديل بيانات المدرب' : 'إضافة مدرب جديد'}
                </h2>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoach} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Coach Photo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-600" />
                  )}
                  <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-purple-400 font-bold transition-opacity cursor-pointer">
                    تغيير
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageFile(e.target.files[0]);
                          setImagePreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-xs text-slate-400">صورة المدرب (اختياري)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">اسم المدرب *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: كابتن حسام"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">التخصص</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="كمال أجسام / لياقة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مواعيد العمل أو ملاحظات..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {formLoading ? 'جاري الحفظ...' : 'حفظ بيانات المدرب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
