import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ClassifiedCategory,
  ClassifiedAd,
  ClassifiedBroadcast,
  apiClient
} from '../services/api';

const CLASSIFIED_PRICING = [
  { durationDays: 1, label: 'Umunsi umwe', priceRwf: 15000 },
  { durationDays: 30, label: 'Iminsi 30', priceRwf: 5000 },
  { durationDays: 180, label: 'Amezi 6', priceRwf: 50000 }
] as const;

const CLASSIFIED_CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
  cyamunara: 'Cyamunara',
  akazi: 'Akazi',
  guhinduza: 'Guhinduza amakuru',
  ibindi: 'Andi matangazo'
};

const categories: ClassifiedCategory[] = ['cyamunara', 'akazi', 'guhinduza', 'ibindi'];

const ClassifiedAds = () => {
  const { category } = useParams<{ category?: string }>();
  const { user, isAuthenticated } = useAuth();
  const selectedCategory = categories.includes(category as ClassifiedCategory)
    ? (category as ClassifiedCategory)
    : undefined;

  const [form, setForm] = useState({
    category: selectedCategory || 'cyamunara',
    title: '',
    description: '',
    phone: '',
    email: user?.email || '',
    durationDays: 30,
    attachmentUrl: '',
    attachmentName: ''
  });
  const [broadcastText, setBroadcastText] = useState('');
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [myAds, setMyAds] = useState<ClassifiedAd[]>([]);
  const [allAds, setAllAds] = useState<ClassifiedAd[]>([]);
  const [broadcasts, setBroadcasts] = useState<ClassifiedBroadcast[]>([]);

  const selectedPricing = CLASSIFIED_PRICING.find((p) => p.durationDays === Number(form.durationDays)) || CLASSIFIED_PRICING[1];

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvedAds, allBroadcasts] = await Promise.all([
        apiClient.getClassifiedAds({ category: selectedCategory }),
        apiClient.getClassifiedBroadcasts()
      ]);
      setAds(approvedAds);
      setBroadcasts(allBroadcasts);

      if (isAuthenticated && user) {
        const mine = await apiClient.getMyClassifiedAds();
        setMyAds(mine);
      } else {
        setMyAds([]);
      }

      if (isAuthenticated && user && (user.role === 'ADMIN' || user.role === 'EDITOR')) {
        const all = await apiClient.getAllClassifiedAds();
        setAllAds(all);
      } else {
        setAllAds([]);
      }
    } catch (error) {
      console.error('Failed to load classifieds:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, isAuthenticated, user?.id, user?.role]);

  const submitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await apiClient.submitClassifiedAd({
      category: form.category as ClassifiedCategory,
      title: form.title,
      description: form.description,
      phone: form.phone,
      email: form.email,
      attachmentName: form.attachmentName || undefined,
      attachmentUrl: form.attachmentUrl || undefined,
      durationDays: Number(form.durationDays),
      priceRwf: selectedPricing.priceRwf
    });

    setForm((prev) => ({ ...prev, title: '', description: '', attachmentName: '', attachmentUrl: '' }));
    await loadData();
    alert('Itangazo ryawe ryoherejwe. Rizabanza kugenzurwa (Pending).');
  };

  const moderate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const note = status === 'REJECTED' ? window.prompt('Impamvu yo kwanga (optional):', '') || '' : 'Byemejwe.';
    await apiClient.updateClassifiedStatus(id, status, note);
    await loadData();
  };

  const sendBroadcast = async () => {
    if (!user) return;
    const created = await apiClient.createClassifiedBroadcast(broadcastText);
    if (created) {
      setBroadcastText('');
      await loadData();
      alert('Ubutumwa bwoherejwe ku bakoresha bose.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] py-6">
      <div className="max-w-7xl mx-auto px-3 space-y-5">
        {loading && (
          <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4 text-sm text-gray-400">Turimo kuzana amatangazo...</div>
        )}

        <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Amatangazo</h1>
            {!isAuthenticated ? (
              <div className="flex gap-2">
                <Link to="/subscriber-login" className="px-4 py-2 rounded-lg bg-[#2b2f36] text-white">Injira</Link>
                <Link to="/register" className="px-4 py-2 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold">Kora konte</Link>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {categories.map((cat) => (
              <Link key={cat} to={`/amatangazo/${cat}`} className={`rounded-lg px-3 py-2 border text-center ${selectedCategory === cat ? 'bg-[#fcd535] text-[#0b0e11] border-[#fcd535]' : 'bg-[#0b0e11] text-white border-[#2b2f36]'}`}>
                {CLASSIFIED_CATEGORY_LABELS[cat]}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
          <h2 className="text-white font-semibold mb-2">Ibiciro (RWF)</h2>
          <p className="text-gray-400 text-sm mb-3">Igihe itangazo rimara kigendana n'amafaranga.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {CLASSIFIED_PRICING.map((p) => (
              <div key={p.durationDays} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3 text-gray-300">
                <p className="font-semibold text-white">{p.label}</p>
                <p>{p.priceRwf.toLocaleString()} RWF</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Yishyura nyuma yo kugenzurwa, uzahamagarwa.</p>
        </div>

        {isAuthenticated && user ? (
          <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Ohereza Itangazo</h2>
            <form onSubmit={submitAd} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ClassifiedCategory })}>
                {categories.map((cat) => <option key={cat} value={cat}>{CLASSIFIED_CATEGORY_LABELS[cat]}</option>)}
              </select>
              <select className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}>
                {CLASSIFIED_PRICING.map((p) => <option key={p.durationDays} value={p.durationDays}>{p.label} - {p.priceRwf.toLocaleString()} RWF</option>)}
              </select>

              <input className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" placeholder="Umutwe w'itangazo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />

              <input className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" placeholder="Izina rya file (Ifoto/PDF/Doc)" value={form.attachmentName} onChange={(e) => setForm({ ...form, attachmentName: e.target.value })} />

              <input className="md:col-span-2 bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" placeholder="Link ya file (optional)" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
              <textarea className="md:col-span-2 bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white" rows={4} placeholder="Umwanya wo kwandikamo itangazo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

              <div className="md:col-span-2 flex justify-between items-center">
                <p className="text-sm text-gray-400">Igiciro cyatoranyijwe: <span className="text-[#fcd535] font-semibold">{selectedPricing.priceRwf.toLocaleString()} RWF</span></p>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#fcd535] text-[#0b0e11] font-semibold">Ohereza Gusuzumwa</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
          <h2 className="text-white font-semibold mb-3">Amatangazo Yemejwe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ads.length === 0 ? <p className="text-gray-400 text-sm">Nta matangazo yemejwe arimo.</p> : ads.map((ad) => (
              <div key={ad.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3">
                <p className="text-white font-semibold">{ad.title}</p>
                <p className="text-sm text-gray-300 mt-1">{ad.description}</p>
                <p className="text-xs text-gray-500 mt-2">{CLASSIFIED_CATEGORY_LABELS[ad.category]} • {ad.phone}</p>
              </div>
            ))}
          </div>
        </div>

        {isAuthenticated && user && user.role === 'USER' ? (
          <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Amatangazo Yanjye</h2>
            <div className="space-y-2">
              {myAds.length === 0 ? <p className="text-gray-400 text-sm">Nta matangazo wohereje.</p> : myAds.map((ad) => (
                <div key={ad.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white">{ad.title}</p>
                    <p className="text-xs text-gray-500">{CLASSIFIED_CATEGORY_LABELS[ad.category]} • {new Date(ad.createdAt).toLocaleDateString('rw-RW')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${ad.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : ad.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{ad.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isAuthenticated && user && (user.role === 'ADMIN' || user.role === 'EDITOR') ? (
          <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4 space-y-4">
            <h2 className="text-white font-semibold">Admin Review</h2>
            <div className="space-y-2">
              {allAds.length === 0 ? <p className="text-gray-400 text-sm">Nta matangazo ariho.</p> : allAds.map((ad) => (
                <div key={ad.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3">
                  <p className="text-white font-semibold">{ad.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{ad.userName} • {ad.phone} • {CLASSIFIED_CATEGORY_LABELS[ad.category]}</p>
                  <p className="text-sm text-gray-300 mb-2">{ad.description}</p>
                  <div className="flex gap-2">
                    <button onClick={() => moderate(ad.id, 'APPROVED')} className="px-3 py-1 rounded bg-emerald-600 text-white text-xs">Approve</button>
                    <button onClick={() => moderate(ad.id, 'REJECTED')} className="px-3 py-1 rounded bg-rose-600 text-white text-xs">Reject</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2b2f36] pt-4">
              <h3 className="text-white font-semibold mb-2">Andikira Users bose icyarimwe</h3>
              <textarea
                className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg px-3 py-2 text-white"
                rows={3}
                placeholder="Andika ubutumwa bwoherezwa ku bakoresha bose..."
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
              />
              <button onClick={sendBroadcast} className="mt-2 px-4 py-2 rounded bg-[#fcd535] text-[#0b0e11] font-semibold">Ohereza Ubutumwa</button>
            </div>
          </div>
        ) : null}

        {broadcasts.length > 0 && (
          <div className="bg-[#181a20] border border-[#2b2f36] rounded-xl p-4">
            <h2 className="text-white font-semibold mb-2">Ubutumwa Rusange</h2>
            <div className="space-y-2">
              {broadcasts.slice(0, 5).map((b) => (
                <div key={b.id} className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3">
                  <p className="text-sm text-gray-300">{b.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(b.createdAt).toLocaleString('rw-RW')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassifiedAds;
