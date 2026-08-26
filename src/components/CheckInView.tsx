import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  Clock,
  User,
  Phone,
  Dumbbell,
  RefreshCw,
  MessageCircle,
  Search,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Sparkles,
} from 'lucide-react';
import jsQR from 'jsqr';
import { Customer, CheckInRecord } from '../types';
import { api } from '../utils/api';
import { soundEffects } from '../utils/audio';

interface CheckInViewProps {
  onOpenRenew: (customer: Customer) => void;
  onOpenWhatsApp: (customer: Customer) => void;
  onSelectCustomer: (id: number) => void;
}

export const CheckInView: React.FC<CheckInViewProps> = ({
  onOpenRenew,
  onOpenWhatsApp,
  onSelectCustomer,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera QR scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<{
    granted: boolean;
    status: string;
    message: string;
    customer?: Customer;
    check_in_time?: string;
  } | null>(null);

  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Auto focus scanner input
  useEffect(() => {
    inputRef.current?.focus();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getCheckInHistory({ search: searchHistory });
      setHistory(res.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const processScanCode = useCallback(
    async (rawCode: string) => {
      const codeToScan = rawCode.trim();
      if (!codeToScan) return;

      setLoading(true);
      try {
        const res = await api.scanCheckIn(codeToScan);
        setScanResult(res);

        if (soundEnabled) {
          if (res.status === 'active') {
            soundEffects.playSuccess();
          } else if (res.status === 'expiring_soon') {
            soundEffects.playWarning();
          } else {
            soundEffects.playDenied();
          }
        }

        loadHistory();
      } catch (err: any) {
        setScanResult({
          granted: false,
          status: 'error',
          message: err.message || 'لم يتم العثور على العضو أو حدث خطأ في المسح',
        });
        if (soundEnabled) {
          soundEffects.playDenied();
        }
      } finally {
        setLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    },
    [soundEnabled]
  );

  const handleManualScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    setBarcodeInput('');
    await processScanCode(code);
  };

  // Camera QR scanning engine
  const scanQrVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const now = Date.now();
          // Debounce same QR scan for 2.5 seconds
          if (now - lastScannedTimeRef.current > 2500) {
            lastScannedTimeRef.current = now;
            processScanCode(code.data);
          }
        }
      }
    }

    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(scanQrVideoFrame);
    }
  }, [cameraActive, processScanCode]);

  useEffect(() => {
    if (cameraActive) {
      let isMounted = true;
      setCameraError(null);

      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        .then((stream) => {
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().then(() => {
              animationFrameRef.current = requestAnimationFrame(scanQrVideoFrame);
            });
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setCameraError('تعذر فتح الكاميرا (يرجى التأكد من إذن الكاميرا أو استخدام ماسح USB).');
          setCameraActive(false);
        });

      return () => {
        isMounted = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [cameraActive, scanQrVideoFrame]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Station Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/10">
            <QrCode className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>نقطة مسح رمز الـ QR وتسجيل الدخول</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                2D QR Code Scanner
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              متوافق مع قارئات الـ QR / الباركود USB والكاميرا والتعرف الفوري على رقم العضوية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle Camera QR Scanner */}
          <button
            onClick={() => setCameraActive(!cameraActive)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              cameraActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>{cameraActive ? 'إيقاف الكاميرا' : 'مسح عبر الكاميرا'}</span>
          </button>

          {/* Toggle Sound */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'الصوت مفعل' : 'الصوت معطل'}</span>
          </button>
        </div>
      </div>

      {/* Camera Viewfinder if Active */}
      {cameraActive && (
        <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Box Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-amber-400 border-dashed rounded-2xl relative flex items-center justify-center animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                <span className="text-[10px] text-amber-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded">
                  وجّه رمز الـ QR هنا
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 font-bold mt-3 text-center">
            قرّب بطاقة العضوية الذكية أمام الكاميرا لمسح رمز الـ QR تلقائياً.
          </p>
        </div>
      )}

      {cameraError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code Reader & Live Scan Card */}
        <div className="lg:col-span-6 space-y-6">
          {/* Scanner Input Box */}
          <div className="bg-slate-900/90 border-2 border-slate-800 focus-within:border-amber-500 rounded-3xl p-6 shadow-2xl transition-all">
            <form onSubmit={handleManualScan} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>امسح رمز الـ QR الآن أو اكتب رقم العضوية</span>
                <span className="text-amber-400 font-mono text-[11px]">مثال: PC-2026-0001</span>
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="جاهز للمسح عبر قارئ الـ QR / الباركود USB..."
                  className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-500 rounded-2xl py-4 pr-12 pl-24 text-base font-mono font-bold text-amber-400 placeholder-slate-600 focus:outline-none transition-colors"
                />
                <QrCode className="w-6 h-6 text-slate-600 absolute right-4 top-4" />
                <button
                  type="submit"
                  disabled={loading || !barcodeInput.trim()}
                  className="absolute left-3 top-2.5 bottom-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-4 rounded-xl text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
                >
                  {loading ? '...' : 'دخول'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                عند استخدام قارئ الـ QR الضوئي USB سيتم فك الشفرة فورياً وعرض حالة الاشتراك مع إشعار صوتي.
              </p>
            </form>
          </div>

          {/* Real-time Giant Status Card */}
          {scanResult && (
            <div
              className={`p-6 rounded-3xl border-2 shadow-2xl transition-all ${
                scanResult.granted
                  ? scanResult.status === 'expiring_soon'
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-emerald-950/20 border-emerald-500/50'
                  : 'bg-rose-950/20 border-rose-500/50'
              }`}
            >
              {/* Status Header Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {scanResult.granted ? (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-7 h-7 font-black" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                      <AlertTriangle className="w-7 h-7 font-black" />
                    </div>
                  )}

                  <div>
                    <h2
                      className={`text-xl font-black uppercase tracking-wider ${
                        scanResult.granted
                          ? scanResult.status === 'expiring_soon'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {scanResult.granted
                        ? 'ACCESS GRANTED • تم السماح بالدخول'
                        : scanResult.status === 'frozen'
                        ? 'SUBSCRIPTION FROZEN • الاشتراك مجمد'
                        : 'SUBSCRIPTION EXPIRED • الاشتراك منتهي'}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">{scanResult.message}</p>
                  </div>
                </div>

                {scanResult.customer?.status && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-black uppercase ${
                      scanResult.customer.status === 'active'
                        ? 'bg-emerald-500 text-slate-950'
                        : scanResult.customer.status === 'expiring_soon'
                        ? 'bg-amber-500 text-slate-950'
                        : scanResult.customer.status === 'frozen'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {scanResult.customer.status}
                  </span>
                )}
              </div>

              {/* Customer Profile info if matched */}
              {scanResult.customer && (
                <div className="bg-slate-950/70 rounded-2xl p-5 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                      {scanResult.customer.image_path ? (
                        <img
                          src={scanResult.customer.image_path}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xl font-black text-amber-400">
                          {scanResult.customer.full_name.substring(0, 1)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        onClick={() => onSelectCustomer(scanResult.customer!.id)}
                        className="text-lg font-black text-white hover:text-amber-400 cursor-pointer truncate"
                      >
                        {scanResult.customer.full_name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        رقم العضوية: <span className="font-mono text-amber-400 font-bold">{scanResult.customer.membership_id}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        الهاتف: <span className="font-mono text-slate-200" dir="ltr">{scanResult.customer.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">نوع الاشتراك</span>
                      <span className="font-bold text-slate-200">{scanResult.customer.plan_type}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">تاريخ الانتهاء</span>
                      <span className="font-mono font-bold text-amber-400">{scanResult.customer.end_date}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">الأيام المتبقية</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {scanResult.customer.days_remaining ?? 0} يوم
                      </span>
                    </div>
                  </div>

                  {/* Actions for expired / warning */}
                  {!scanResult.granted && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => onOpenRenew(scanResult.customer!)}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>تجديد الاشتراك فوراً</span>
                      </button>
                      <button
                        onClick={() => onOpenWhatsApp(scanResult.customer!)}
                        className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer"
                        title="إرسال رسالة واتساب"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Check-in History */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  سجل الدخول الأخير ({history.length})
                </h3>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="تحديث السجل"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* History List */}
            {history.length === 0 ? (
              <div className="flex-1 py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <QrCode className="w-12 h-12 text-slate-800" />
                <span>لم يتم تسجيل أي عمليات دخول اليوم</span>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[550px]">
                {history.map((item) => {
                  const isGranted = item.status === 'granted';
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectCustomer(item.customer_id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {item.image_path ? (
                            <img
                              src={item.image_path}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-300">
                              {item.full_name?.substring(0, 1) || 'ع'}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{item.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.membership_id} • {item.plan_type}
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold block mb-1 ${
                            isGranted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isGranted ? 'ACCESS GRANTED' : 'DENIED'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.check_in_time).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
