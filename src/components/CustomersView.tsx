import React, { useState } from 'react';
import {
  Search,
  Plus,
  User,
  Filter,
  MessageCircle,
  RefreshCw,
  Snowflake,
  CreditCard,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
} from 'lucide-react';
import { Customer, Coach } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  coaches: Coach[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAdd: () => void;
  onOpenEdit: (customer: Customer) => void;
  onOpenProfile: (id: number) => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenFreeze: (customer: Customer) => void;
  onOpenPrintCard: (customer: Customer) => void;
  onOpenWhatsApp: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  coaches,
  loading,
  onRefresh,
  onOpenAdd,
  onOpenEdit,
  onOpenProfile,
  onOpenRenew,
  onOpenFreeze,
  onOpenPrintCard,
  onOpenWhatsApp,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [privateFilter, setPrivateFilter] = useState<string>('all');

  const filterTabs = [
    { id: 'all', label: 'الكل' },
    { id: 'active', label: 'النشطين' },
    { id: 'expiring_soon', label: 'ينتهي قريباً' },
    { id: 'expired', label: 'المنتهين' },
    { id: 'frozen', label: 'المجمدين' },
  ];

  // Filter list
  const filteredCustomers = customers.filter((c) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = c.full_name?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchId = c.membership_id?.toLowerCase().includes(q);
      const matchBarcode = c.barcode?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId && !matchBarcode) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }

    // Coach filter
    if (coachFilter !== 'all' && String(c.coach_id) !== coachFilter) {
      return false;
    }

    // Private filter
    if (privateFilter === 'private' && !c.is_private) return false;
    if (privateFilter === 'regular' && c.is_private) return false;

    return true;
  });

  const getStatusBadge = (status: string, days?: number) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>نشط ({days ?? 0} يوم)</span>
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{days === 0 ? 'ينتهي اليوم!' : `ينتهي بعد ${days} يوم`}</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>منتهي</span>
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            <Snowflake className="w-3.5 h-3.5" />
            <span>مجمد</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>إدارة العملاء والاشتراكات</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-bold border border-slate-700">
              {filteredCustomers.length} عميل
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إضافة العملاء، تجديد وتجميد الاشتراكات، طباعة بطاقات العضوية ومتابعة الباركود.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، رقم العضوية (PC-xxxx) أو الباركود..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>

          {/* Coach Filter */}
          <div className="w-full md:w-48">
            <select
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">جميع المدربين</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  كوتش: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={privateFilter}
              onChange={(e) => setPrivateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل الأنواع</option>
              <option value="private">تدريب خاص (Private)</option>
              <option value="regular">اشتراك عام (Regular)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table / Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <User className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">لا يوجد عملاء مطابقين للبحث</h3>
          <p className="text-xs text-slate-500 mb-4">جرب تغيير كلمات البحث أو الفلاتر، أو أضف عميل جديد.</p>
          <button
            onClick={onOpenAdd}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عميل الآن</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">العضوية والباركود</th>
                  <th className="py-3.5 px-4">نوع الاشتراك</th>
                  <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">المدرب</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Customer Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => onOpenProfile(cust.id)}
                          className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                        >
                          {cust.image_path ? (
                            <img
                              src={cust.image_path}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-black text-amber-400">
                              {cust.full_name.substring(0, 1)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p
                            onClick={() => onOpenProfile(cust.id)}
                            className="font-bold text-slate-200 hover:text-amber-400 cursor-pointer transition-colors"
                          >
                            {cust.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span dir="ltr">{cust.phone}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Membership & QR */}
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-amber-400">{cust.membership_id}</p>
                      <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <QrCode className="w-3 h-3 text-emerald-500" />
                        <span>QR مفعل</span>
                      </p>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-300 block">{cust.plan_type}</span>
                      <span className="text-[10px] text-slate-500">
                        {cust.duration_months} {cust.duration_months === 1 ? 'شهر' : 'أشهر'}
                      </span>
                    </td>

                    {/* End Date */}
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-200">{cust.end_date}</p>
                      <p className="text-[10px] text-slate-500">
                        البداية: {cust.start_date}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(cust.status, cust.days_remaining)}
                    </td>

                    {/* Coach */}
                    <td className="py-3.5 px-4">
                      {cust.is_private ? (
                        <div className="flex items-center gap-1.5 text-purple-400">
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span className="font-bold">{cust.coach_name || 'كوتش خاص'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">عام (بدون مدرب)</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Profile */}
                        <button
                          onClick={() => onOpenProfile(cust.id)}
                          title="عرض الملف الكامل"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* WhatsApp */}
                        <button
                          onClick={() => onOpenWhatsApp(cust)}
                          title="محادثة واتساب"
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {/* Renew */}
                        <button
                          onClick={() => onOpenRenew(cust)}
                          title="تجديد الاشتراك"
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Freeze */}
                        <button
                          onClick={() => onOpenFreeze(cust)}
                          title="تجميد الاشتراك"
                          className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                        >
                          <Snowflake className="w-4 h-4" />
                        </button>

                        {/* Print Card */}
                        <button
                          onClick={() => onOpenPrintCard(cust)}
                          title="طباعة بطاقة العضوية"
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onOpenEdit(cust)}
                          title="تعديل البيانات"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteCustomer(cust)}
                          title="حذف العميل"
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
