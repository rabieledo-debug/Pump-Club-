import React, { useState, useEffect } from 'react';
import { X, Upload, Dumbbell, Calendar, User, Phone, DollarSign, FileText } from 'lucide-react';
import { Customer, Coach } from '../types';
import { api } from '../utils/api';

interface CustomerFormModalProps {
  customer?: Customer | null;
  coaches: Coach[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  coaches,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!customer;

  const [fullName, setFullName] = useState(customer?.full_name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [nationalId, setNationalId] = useState(customer?.national_id || '');
  const [planType, setPlanType] = useState(customer?.plan_type || 'Monthly');
  const [durationMonths, setDurationMonths] = useState<number>(customer?.duration_months || 1);
  const [startDate, setStartDate] = useState(customer?.start_date || new Date().toISOString().split('T')[0]);
  const [isPrivate, setIsPrivate] = useState<boolean>(customer?.is_private === 1 || customer?.is_private === true);
  const [coachId, setCoachId] = useState<string>(customer?.coach_id ? String(customer.coach_id) : '');
  const [pricePaid, setPricePaid] = useState<string>(customer?.price_paid ? String(customer.price_paid) : '0');
  const [notes, setNotes] = useState(customer?.notes || '');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(customer?.image_path || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto calculate end date
  const calculateEndDate = (start: string, months: number): string => {
    try {
      const d = new Date(start);
      d.setMonth(d.getMonth() + months);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const [computedEndDate, setComputedEndDate] = useState<string>(
    calculateEndDate(startDate, durationMonths)
  );

  useEffect(() => {
    setComputedEndDate(calculateEndDate(startDate, durationMonths));
  }, [startDate, durationMonths]);

  const handlePlanChange = (plan: string, months: number) => {
    setPlanType(plan);
    setDurationMonths(months);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('الاسم ورقم الهاتف حقول مطلوبة');
      return;
    }

    if (isPrivate && !coachId) {
      setError('يرجى اختيار الكوتش المسؤول عن التدريب الخاص');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('full_name', fullName.trim());
      formData.append('phone', phone.trim());
      if (nationalId) formData.append('national_id', nationalId.trim());
      formData.append('plan_type', planType);
      formData.append('duration_months', String(durationMonths));
      formData.append('start_date', startDate);
      formData.append('is_private', isPrivate ? '1' : '0');
      if (coachId) formData.append('coach_id', coachId);
      formData.append('price_paid', pricePaid || '0');
      if (notes) formData.append('notes', notes.trim());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isEditing && customer) {
        await api.updateCustomer(customer.id, formData);
      } else {
        await api.createCustomer(formData);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h2>
              <p className="text-xs text-slate-400">
                سيتم حفظ البيانات والصور محلياً في قاعدة بيانات SQLite.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Photo & Basic Info Row */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Customer Photo Upload */}
            <div className="flex flex-col items-center gap-2 self-center sm:self-start">
              <div className="w-28 h-28 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-500">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    <span className="text-[10px] block">صورة العميل</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-amber-400 font-bold transition-opacity cursor-pointer">
                  تغيير
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-500">حفظ محلي في المجلد</span>
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">رقم الهاتف *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">الرقم القومي / الهوية</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="اختياري"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {!isEditing && (
            <>
              {/* Subscription Plans Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">نوع ومدة الاشتراك</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { name: 'Monthly', label: 'شهر (Monthly)', months: 1 },
                    { name: '3 Months', label: '3 أشهر (Quarterly)', months: 3 },
                    { name: '6 Months', label: '6 أشهر (Half Year)', months: 6 },
                    { name: 'Yearly', label: 'سنة (Yearly)', months: 12 },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handlePlanChange(p.name, p.months)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        planType === p.name && durationMonths === p.months
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Auto End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>تاريخ بداية الاشتراك</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    تاريخ انتهاء الاشتراك (محسوب تلقائياً)
                  </label>
                  <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400">
                    {computedEndDate}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Private Coach Selection */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">تدريب خاص مع كوتش (Private Training)</p>
                  <p className="text-[10px] text-slate-400">تخصيص مدرب خاص لمتابعة تدريب العميل</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {isPrivate && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-400 mb-1">اختر الكوتش المسؤول *</label>
                <select
                  value={coachId}
                  onChange={(e) => setCoachId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                  required={isPrivate}
                >
                  <option value="">-- اختر المدرب --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      كوتش: {c.name} {c.specialty ? `(${c.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Price & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>المبلغ المدفوع</span>
              </label>
              <input
                type="number"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>ملاحظات إضافية</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات صحية أو رياضية..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isEditing ? (
                'حفظ التعديلات'
              ) : (
                'إضافة العميل وإصدار العضوية'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
