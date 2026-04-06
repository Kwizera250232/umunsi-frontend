import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { HeartHandshake, Mail, Crown, Smartphone, Wallet, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, SupportPayment } from '../services/api';

const paymentMethods = [
  {
    name: 'MTN Mobile Money',
    detail: '*182*8*1# cyangwa MoMo App',
    icon: Smartphone
  },
  {
    name: 'Airtel Money',
    detail: '*500# cyangwa Airtel Money App',
    icon: Smartphone
  },
  {
    name: 'Bank / Card',
    detail: 'Bank of Kigali, Equity, I&M, Visa/Mastercard',
    icon: Building2
  },
  {
    name: 'Izindi Wallet',
    detail: 'Mobicash n\'izindi serivisi zikora mu Rwanda',
    icon: Wallet
  }
];

const SubscriberAccount = () => {
  const { user } = useAuth();
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(Boolean(user?.isPremium));
  const [premiumUntil, setPremiumUntil] = useState<string | null>(user?.premiumUntil || null);
  const [payments, setPayments] = useState<SupportPayment[]>([]);

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
    let active = true;

    const loadProfile = async () => {
      try {
        const profile = await apiClient.getPaymentsProfile();
        if (!active) return;
        setIsPremium(Boolean(profile?.data?.user?.isPremium));
        setPremiumUntil(profile?.data?.user?.premiumUntil || null);
        setPayments(profile?.data?.payments || []);
      } catch (error) {
        // Keep page usable even if payment profile request fails.
      }
    };

    const verifyCallbackPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentMode = params.get('payment');
      const txRef = params.get('tx_ref');

      if (paymentMode !== 'callback' || !txRef) {
        return;
      }

      setIsVerifyingPayment(true);
      setSupportError(null);
      setSupportMessage('Turimo kwemeza ubwishyu bwawe...');

      try {
        const verification = await apiClient.verifyFlutterwaveSupportPayment(txRef);
        const status = verification?.data?.payment?.status;

        if (status === 'SUCCESS') {
          setSupportMessage('Murakoze! Premium yawe yafunguwe neza.');
          if (verification?.data?.premium?.premiumUntil) {
            setPremiumUntil(verification.data.premium.premiumUntil);
          }
          setIsPremium(true);
        } else {
          setSupportError('Ubusabe bwo kwishyura ntiburarangira cyangwa bwaranze. Ongera ugerageze.');
        }
      } catch (error: any) {
        setSupportError(error?.message || 'Kwemeza ubwishyu ntibikunze. Ongera ugerageze.');
      } finally {
        setIsVerifyingPayment(false);
        const cleanUrl = `${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    loadProfile();
    verifyCallbackPayment();

    return () => {
      active = false;
    };
  }, []);

  const handleStartSupportPayment = async () => {
    setSupportError(null);
    setSupportMessage(null);
    setIsInitializingPayment(true);

    try {
      const response = await apiClient.initializeFlutterwaveSupportPayment(500);
      const checkoutUrl = response?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Checkout URL ntiyabonetse');
      }
      window.location.href = checkoutUrl;
    } catch (error: any) {
      setSupportError(error?.message || 'Ntibyashobotse gutangiza kwishyura. Ongera ugerageze.');
    } finally {
      setIsInitializingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Konti y'Abafatabuguzi</h1>
          <p className="text-gray-400">
            Murakaza neza, {user.firstName}. Ubu ufite konti y'abafatabuguzi, kandi uzajya woherezwa imeyili y'inkuru nshya zasohotse.
          </p>

          <div className="mt-4 flex items-center gap-3 text-sm text-gray-300 bg-[#0f1115] border border-[#2b2f36] rounded-xl px-4 py-3">
            <Mail className="w-4 h-4 text-[#fcd535]" />
            <span>Imeyili yawe: {user.email}</span>
          </div>
        </div>

        <div className="bg-[#181a20] border border-[#2b2f36] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake className="w-5 h-5 text-[#fcd535]" />
            <h2 className="text-xl font-bold text-white">Dushyigikire</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Shyigikira Umunsi.com na 500 RWF kugira ngo ubone Premium, usome inkuru nyinshi zishimishije kandi zifite ireme.
          </p>

          <div className="bg-[#0f1115] border border-[#2b2f36] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-[#fcd535] font-bold text-lg">
              <Crown className="w-5 h-5" />
              Premium Support: 500 RWF
            </div>
            <p className="text-gray-400 text-sm mt-1">Kwishyura bizafungura Premium yawe mu buryo bwikora.</p>

            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-300">
                Status yawe: {isPremium ? 'Premium irakora' : 'Konti isanzwe'}
              </p>
              {premiumUntilLabel && (
                <p className="text-xs text-gray-400">Premium irangira: {premiumUntilLabel}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartSupportPayment}
              disabled={isInitializingPayment || isVerifyingPayment}
              className="mt-4 px-4 py-2 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold hover:bg-[#f0b90b] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isInitializingPayment ? 'Turimo gufungura checkout...' : 'Shyigikira Umunsi ukoresheje Flutterwave'}
            </button>

            {supportMessage && <p className="text-xs text-emerald-400 mt-2">{supportMessage}</p>}
            {supportError && <p className="text-xs text-rose-400 mt-2">{supportError}</p>}
          </div>

          <h3 className="text-white font-semibold mb-3">Uburyo bwo Kwishyura bukora mu Rwanda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.name} className="bg-[#0f1115] border border-[#2b2f36] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-[#fcd535]" />
                    <p className="text-white font-medium">{method.name}</p>
                  </div>
                  <p className="text-gray-400 text-sm">{method.detail}</p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Icyitonderwa: Flutterwave yemera uburyo butandukanye burimo card na mobile wallet bitewe n'iboneka kuri konte yawe.
          </p>

          {payments.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#2b2f36] bg-[#0f1115] p-4">
              <h4 className="text-white font-semibold mb-2">Payment zanyuma</h4>
              <div className="space-y-2">
                {payments.slice(0, 4).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-xs text-gray-300 border-b border-[#1f242c] pb-2">
                    <span>{payment.amount} {payment.currency}</span>
                    <span>{payment.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3 flex-wrap">
            <Link to="/" className="px-4 py-2 rounded-lg bg-[#2b2f36] text-white hover:bg-[#363a45]">
              Ahabanza
            </Link>
            <Link to="/newsletter" className="px-4 py-2 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold hover:bg-[#f0b90b]">
              Reba Inyandiko
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriberAccount;
