import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Crown, CreditCard, HeartHandshake, Lock, Mail, PhoneCall, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, PremiumDashboardPost, ClassifiedAd } from '../services/api';

interface PremiumRequestArticle {
  id: string;
  title: string;
  slug?: string;
  url: string;
  requestedAt: string;
}

const SUPPORT_WHATSAPP = '250791859465';
const SUPPORT_CALL = '0791859465';
const CLASSIFIED_CATEGORY_LABELS = {
  cyamunara: 'Cyamunara',
  akazi: 'Akazi',
  guhinduza: 'Guhinduza amakuru',
  ibindi: 'Andi matangazo'
} as const;

const PAYMENT_METHOD_OPTIONS = [
  { id: 'visa', label: 'VISA', subtitle: 'Card', pmethod: 'cc' as const, type: 'card' as const },
  { id: 'mastercard', label: 'Mastercard', subtitle: 'Card', pmethod: 'cc' as const, type: 'card' as const },
  { id: 'amex', label: 'American Express', subtitle: 'Card', pmethod: 'cc' as const, type: 'card' as const },
  { id: 'mtn-momo', label: 'MoMo MTN', subtitle: 'Mobile Money', pmethod: 'momo' as const, type: 'mobile' as const },
  { id: 'airtel-money', label: 'Airtel Money', subtitle: 'Mobile Money', pmethod: 'momo' as const, type: 'mobile' as const },
  { id: 'smartcash', label: 'SmartCash', subtitle: 'Wallet', pmethod: 'momo' as const, type: 'mobile' as const },
  { id: 'spenn', label: 'SPENN', subtitle: 'Wallet', pmethod: 'spenn' as const, type: 'mobile' as const }
] as const;

type PaymentMethodOption = typeof PAYMENT_METHOD_OPTIONS[number];

const buildWhatsAppLink = (name: string, email: string) => {
  const message = `Muraho Umunsi, nitwa ${name}, email yanjye ni ${email}. Nashatse Premium access, namaze kwishyura. Mungenzurire konti yanjye.`;
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
};

const SubscriberAccount = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(Boolean(user?.isPremium));
  const [premiumUntil, setPremiumUntil] = useState<string | null>(user?.premiumUntil || null);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<PaymentMethodOption['id']>('mtn-momo');
  const [pendingTxRef, setPendingTxRef] = useState<string | null>(null);
  const [premiumStories, setPremiumStories] = useState<PremiumDashboardPost[]>([]);
  const [myClassifiedAds, setMyClassifiedAds] = useState<ClassifiedAd[]>([]);
  const [requestedPremiumArticles, setRequestedPremiumArticles] = useState<PremiumRequestArticle[]>([]);

  if (!user) return null;

  if (user.role !== 'USER') {
    return <Navigate to="/admin" replace />;
  }

  const premiumUntilLabel = useMemo(() => {
    if (!premiumUntil) return null;
    const date = new Date(premiumUntil);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('rw-RW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [premiumUntil]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedRequests = JSON.parse(localStorage.getItem('umunsi_premium_request_articles') || '[]') as PremiumRequestArticle[];
      setRequestedPremiumArticles(storedRequests);
    } catch (error) {
      setRequestedPremiumArticles([]);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const profile = await apiClient.getPaymentsProfile();
        if (!active) return;
        setIsPremium(Boolean(profile?.data?.user?.isPremium));
        setPremiumUntil(profile?.data?.user?.premiumUntil || null);
      } catch (error) {
        if (!active) return;
        setProfileError('Ntibyashobotse kubona premium status yawe. Ongera ugerageze.');
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    const loadPremiumStories = async () => {
      try {
        setLoadingStories(true);
        const response = await apiClient.getPremiumDashboardPosts();
        if (!active) return;
        setPremiumStories(response?.data || []);
      } finally {
        if (active) {
          setLoadingStories(false);
        }
      }
    };

    const loadMyClassifiedAds = async () => {
      try {
        const data = await apiClient.getMyClassifiedAds();
        if (!active) return;
        setMyClassifiedAds(data);
      } catch (error) {
        if (!active) return;
        setMyClassifiedAds([]);
      }
    };

    loadProfile();
    loadPremiumStories();
    loadMyClassifiedAds();

    return () => {
      active = false;
    };
  }, []);

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
  const whatsappLink = buildWhatsAppLink(fullName, user.email);
  const shouldShowOnboardingPayment = searchParams.get('onboardPayment') === '1';

  const refreshProfile = async () => {
    const profile = await apiClient.getPaymentsProfile();
    setIsPremium(Boolean(profile?.data?.user?.isPremium));
    setPremiumUntil(profile?.data?.user?.premiumUntil || null);
  };

  const selectedPaymentMethod = useMemo(
    () => PAYMENT_METHOD_OPTIONS.find((option) => option.id === selectedPaymentMethodId) || PAYMENT_METHOD_OPTIONS[0],
    [selectedPaymentMethodId]
  );

  const handleVerifiedPremium = async (message: string) => {
    setPaymentSuccess(message);
    setPendingTxRef(null);
    await refreshProfile();
    window.setTimeout(() => {
      navigate('/subscriber/account', { replace: true });
    }, 1200);
  };

  const handleStartKpayPayment = async () => {
    const pmethod = selectedPaymentMethod.pmethod;
    const methodType = selectedPaymentMethod.type;
    setPaymentError(null);
    setPaymentSuccess(null);
    setPendingTxRef(null);

    // Phone number only required for mobile money/wallet methods
    if (methodType === 'mobile' && !paymentPhone.trim()) {
      setPaymentError('Andika nimero ya telefoni wishyuriraho. Urugero: 078XXXXXXX cyangwa 25078XXXXXXX.');
      return;
    }

    try {
      setPaymentLoading(true);
      
      // For card methods, only send minimum required data
      const payload: any = {
        pmethod,
        amount: 500
      };
      
      // Only include phone for mobile methods
      if (methodType === 'mobile') {
        payload.msisdn = paymentPhone.trim();
      }

      const response = await apiClient.initializeKpaySupportPayment(payload);

      if (response?.data?.premium?.isPremium) {
        await handleVerifiedPremium('Ubwishyu bwemejwe ako kanya. Premium yawe yahise ifungurwa.');
        return;
      }

      if (response?.data?.checkoutUrl) {
        if (methodType === 'card') {
          setPaymentSuccess(`Urimo koherezwa kuri ${selectedPaymentMethod.label} checkout ya KPay. Emeza ubwishyu hano.`);
          window.location.href = response.data.checkoutUrl;
        } else {
          setPaymentSuccess('Urimo koherezwa kuri KPay kugira ngo urangize ubwishyu.');
          window.location.href = response.data.checkoutUrl;
        }
        return;
      }

      if (response?.data?.txRef && methodType === 'mobile') {
        setPendingTxRef(response.data.txRef);
        setPaymentSuccess(`Ubutumwa bwo kwemeza ubwishyu bwoherejwe kuri telefoni yawe (${selectedPaymentMethod.label}). Emeza ubwishyu, premium ihite ifungurwa.`);
        return;
      }

      setPaymentSuccess(methodType === 'card'
        ? `Ubusabe bwa ${selectedPaymentMethod.label} bwoherejwe. Komeza urangirize ubwishyu kuri KPay.`
        : 'Ubusabe bwo kwishyura bwoherejwe. Tegereza gato nyuma yo kwemeza kuri telefoni yawe.');
    } catch (error: any) {
      setPaymentError(error?.message || 'Ntibyashobotse gutangiza ubwishyu bwa KPay. Ongera ugerageze.');
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    const provider = (searchParams.get('provider') || '').toLowerCase();
    const paymentState = (searchParams.get('payment') || '').toLowerCase();
    const txRef = searchParams.get('txRef') || '';

    if (provider !== 'kpay' || paymentState !== 'callback' || !txRef) {
      return;
    }

    let active = true;
    const verifyKpay = async () => {
      try {
        setPaymentLoading(true);
        setPaymentError(null);
        const verification = await apiClient.verifyKpaySupportPayment(txRef);
        if (!active) return;

        if (verification?.data?.payment?.status === 'SUCCESS') {
          await handleVerifiedPremium('Ubwishyu bwemejwe neza. Ufunguwe gusoma inkuru za premium.');
        } else if (verification?.data?.payment?.status === 'PENDING') {
          setPaymentSuccess('Ubwishyu buracyagenzurwa. Turacyagenzura status ya KPay.');
          setPendingTxRef(txRef);
        } else {
          setPaymentError('Ubwishyu ntabwo bwagenze neza. Ongera ugerageze kwishyura.');
          setPendingTxRef(null);
        }
      } catch (error: any) {
        if (!active) return;
        setPaymentError(error?.message || 'Ntibyashobotse kugenzura ubwishyu bwa KPay.');
      } finally {
        if (active) {
          setPaymentLoading(false);
        }
      }
    };

    verifyKpay();

    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  useEffect(() => {
    if (!pendingTxRef) {
      return;
    }

    let cancelled = false;
    let attemptCount = 0;
    const maxAttempts = 20;

    const pollPayment = async () => {
      try {
        attemptCount += 1;
        const verification = await apiClient.verifyKpaySupportPayment(pendingTxRef);
        if (cancelled) {
          return;
        }

        if (verification?.data?.payment?.status === 'SUCCESS') {
          await handleVerifiedPremium('Ubwishyu bwakiriwe neza. Premium yawe yahise ifungurwa.');
          return;
        }

        if (verification?.data?.payment?.status === 'FAILED') {
          setPendingTxRef(null);
          setPaymentError('Ubwishyu bwawe ntibwemejwe. Ongera ugerageze cyangwa ugenzure telefoni yawe.');
          return;
        }

        if (attemptCount >= maxAttempts) {
          setPendingTxRef(null);
          setPaymentSuccess('Twategereje igihe gihagije ariko status ntirarangira. Kanda "Reba premium status" niba wamaze kwemeza kuri telefoni yawe.');
        }
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        if (attemptCount >= maxAttempts) {
          setPendingTxRef(null);
          setPaymentError(error?.message || 'Ntibyashobotse kugenzura ubwishyu bwa KPay.');
        }
      }
    };

    pollPayment();
    const intervalId = window.setInterval(() => {
      if (attemptCount < maxAttempts) {
        pollPayment();
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [navigate, pendingTxRef]);

  const handleRefreshPremiumStatus = async () => {
    try {
      setLoadingProfile(true);
      setProfileError(null);
      await refreshProfile();
    } catch (error) {
      setProfileError('Ntibyashobotse kubona premium status yawe. Ongera ugerageze.');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="subscriber-account-page min-h-screen bg-[#0b0e11] py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Konti y'Abafatabuguzi</h1>
          <p className="text-gray-400">
            Murakaza neza, {user.firstName}. Ubu ufite konti y'abafatabuguzi, kandi uzajya woherezwa imeyili y'inkuru nshya zasohotse.
          </p>

          <div className="subscriber-dark-card mt-4 flex items-center gap-3 text-sm text-gray-300 bg-[#0f1115] border border-[#2b2f36] rounded-xl px-4 py-3">
            <Mail className="w-4 h-4 text-[#fcd535]" />
            <span>Imeyili yawe: {user.email}</span>
          </div>
        </div>

        <div className="bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake className="w-5 h-5 text-[#fcd535]" />
            <h2 className="text-xl font-bold text-white">Premium Access</h2>
          </div>
          <p className="text-gray-300 mb-4">
            {shouldShowOnboardingPayment
              ? 'Dushyigikire wishyure 500 RWF / Ku kwezi ubone inkuru za Premium ndetse ubashe no kuvugana natwe byoroshye.'
              : 'Wishyura 500 RWF ku kwezi ukoresheje KPay, hanyuma premium ikahita ifungurwa iyo ubwishyu bwemejwe.'}
          </p>

          <div className="subscriber-dark-card bg-[#0f1115] border border-[#2b2f36] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-[#fcd535] font-bold text-lg">
              <Crown className="w-5 h-5" />
              Premium Membership
            </div>
            <p className="text-[#fcd535] text-sm mt-2 font-semibold">Gusoma inkuru ziri Premium ni ukwishyura 500 RWF ku Kwezi.</p>
            <p className="text-gray-400 text-sm mt-1">Hitamo payment method ushaka (Card, MoMo, SmartCash cyangwa SPENN), wandike nimero ya telefoni, ubone confirmation ku gihe nyacyo.</p>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">KPay Payment Methods</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const active = selectedPaymentMethodId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(option.id)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${active ? 'border-[#fcd535] bg-[#fcd535]/10' : 'border-[#2b2f36] bg-[#12161c] hover:border-[#fcd535]/50'}`}
                    >
                      <p className={`text-sm font-semibold ${active ? 'text-[#fcd535]' : 'text-white'}`}>{option.label}</p>
                      <p className="text-xs text-gray-400">{option.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              {selectedPaymentMethod.type === 'mobile' && (
                <input
                  type="tel"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="Nimero ya telefoni (078... cyangwa 25078...)"
                  className="w-full bg-[#1e2329] border border-[#2b2f36] rounded-lg px-3 py-3 text-white"
                />
              )}
              {selectedPaymentMethod.type === 'card' && (
                <div className="text-sm text-gray-400 flex items-center px-3 py-3">
                  <p>Kanda isano ngo ugire credit card checkout ku isafuraricye ya KPay.</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleStartKpayPayment}
                disabled={paymentLoading || (selectedPaymentMethod.type === 'mobile' && !paymentPhone.trim())}
                className="px-4 py-3 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold hover:bg-[#f0b90b] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {paymentLoading ? 'Birimo...' : `Komeza na ${selectedPaymentMethod.label}`}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3">Method wahisemo: <span className="text-[#fcd535] font-semibold">{selectedPaymentMethod.label}</span>. Nimba ari mobile money uzabona confirmation kuri telefoni yawe, maze premium ifungurwe auto.</p>

            {paymentSuccess && <p className="text-xs text-emerald-400 mt-3">{paymentSuccess}</p>}
            {paymentError && <p className="text-xs text-rose-400 mt-3">{paymentError}</p>}
            {pendingTxRef && <p className="text-xs text-[#fcd535] mt-3">Turimo kugenzura ubwishyu bwawe. Numara kwemera kuri telefoni yawe, konti irahita ifungurwa.</p>}

            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-300">
                Status yawe: {isPremium ? 'Premium irakora' : 'Konti isanzwe'}
              </p>
              {premiumUntilLabel && (
                <p className="text-xs text-gray-400">Premium irangira: {premiumUntilLabel}</p>
              )}
              {loadingProfile && <p className="text-xs text-gray-500">Turimo kugenzura premium status...</p>}
              {profileError && <p className="text-xs text-rose-400">{profileError}</p>}
              <button
                type="button"
                onClick={handleRefreshPremiumStatus}
                className="text-xs text-[#fcd535] hover:underline"
              >
                Reba premium status
              </button>
            </div>
          </div>

          <h3 className="text-white font-semibold mb-3">Saba Premium</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="subscriber-dark-card bg-[#0f1115] border border-[#2b2f36] rounded-xl p-4 hover:border-[#25d366]/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-[#25d366]" />
                <p className="text-white font-medium">WhatsApp</p>
              </div>
              <p className="text-gray-400 text-sm">Andikira support kuri 0791859465</p>
            </a>
            <a
              href={`tel:${SUPPORT_CALL.replace(/\s+/g, '')}`}
              className="subscriber-dark-card bg-[#0f1115] border border-[#2b2f36] rounded-xl p-4 hover:border-[#fcd535]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall className="w-4 h-4 text-[#fcd535]" />
                <p className="text-white font-medium">Hamagara Support</p>
              </div>
              <p className="text-gray-400 text-sm">{SUPPORT_CALL}</p>
            </a>
          </div>

          <div className="subscriber-dark-card mt-4 rounded-xl border border-[#2b2f36] bg-[#0f1115] p-4">
            <h4 className="text-white font-semibold mb-2">Uko bigenzura</h4>
            <p className="text-gray-400 text-sm">1. Kora ubwishyu uko mubyumvikanye na support.</p>
            <p className="text-gray-400 text-sm">2. Ohereza proof kuri WhatsApp cyangwa telefone.</p>
            <p className="text-gray-400 text-sm">3. Admin agufungurira Premium access nyuma yo kubyemeza.</p>
            <p className="text-gray-400 text-sm">4. Iyo Premium ikuweho cyangwa igihe kirangiye, inkuru zose za Premium zihita zifungwa kugeza wongereye kwishyura tukongera kugufungurira.</p>
          </div>

          <div className="subscriber-dark-card mt-6 rounded-xl border border-[#2b2f36] bg-[#0f1115] p-4">
            <h4 className="text-white font-semibold mb-3">Saved Premium Articles</h4>
            {requestedPremiumArticles.length === 0 ? (
              <p className="text-sm text-gray-400">Nta nkuru urasaba. Kanda Bookmark ku nkuru ya Premium kugira ngo igaragare hano.</p>
            ) : (
              <div className="space-y-2">
                {requestedPremiumArticles.slice(0, 10).map((story) => (
                  <div key={story.id} className="subscriber-dark-card border border-[#2b2f36] rounded-lg p-3 bg-[#12161c]">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Lock className="w-4 h-4 text-[#fcd535]" />
                      <p className="font-medium text-white">{story.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Iyi nkuru iri muri Premium. Ntisomeka kugeza wishyuye, watwandikiye, hanyuma admin akagufungurira access.</p>
                    <a href={story.url} className="text-xs text-[#fcd535] hover:underline mt-2 inline-block">Fungura iyi nkuru</a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="subscriber-dark-card mt-6 rounded-xl border border-[#2b2f36] bg-[#0f1115] p-4">
            <h4 className="text-white font-semibold mb-3">Premium Stories Dashboard</h4>
            {loadingStories ? (
              <p className="text-sm text-gray-400">Turimo kuzana premium stories...</p>
            ) : premiumStories.length === 0 ? (
              <p className="text-sm text-gray-400">Nta premium stories zirashyirwaho.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {premiumStories.slice(0, 8).map((story) => (
                  story.hasAccess ? (
                    <Link key={story.id} to={`/post/${story.slug}`} className="border border-[#2b2f36] rounded-lg p-3 hover:border-[#fcd535]/40 transition-colors">
                      <p className="text-white font-medium">{story.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Kanda usome inkuru</p>
                    </Link>
                  ) : (
                    <div key={story.id} className="subscriber-dark-card border border-[#2b2f36] rounded-lg p-3 bg-[#12161c]">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Lock className="w-4 h-4 text-[#fcd535]" />
                        <p className="font-medium">Premium Story (Locked)</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Uru rubuga ruzafunguka nyuma yo kwemererwa na admin.</p>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="subscriber-dark-card mt-6 rounded-xl border border-[#2b2f36] bg-[#0f1115] p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-white font-semibold">Amatangazo Yanjye</h4>
              <Link to="/amatangazo" className="text-sm text-[#fcd535] hover:underline">Ohereza itangazo</Link>
            </div>
            {myClassifiedAds.length === 0 ? (
              <p className="text-sm text-gray-400">Nta matangazo wohereje. Kanda kuri "Ohereza itangazo".</p>
            ) : (
              <div className="space-y-2">
                {myClassifiedAds.slice(0, 8).map((ad) => (
                  <div key={ad.id} className="border border-[#2b2f36] rounded-lg p-3 bg-[#12161c] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white font-medium">{ad.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{CLASSIFIED_CATEGORY_LABELS[ad.category]} • {new Date(ad.createdAt).toLocaleDateString('rw-RW')}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded ${ad.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : ad.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {ad.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3 flex-wrap">
            <Link to="/" className="px-4 py-2 rounded-lg bg-[#2b2f36] text-white hover:bg-[#363a45]">
              Ahabanza
            </Link>
            <Link to="/newsletter" className="px-4 py-2 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold hover:bg-[#f0b90b]">
              Inkuru zose
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriberAccount;
