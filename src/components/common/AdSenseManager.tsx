import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchAdSenseScript, pushAdSenseSlots, startAdSlotObserver } from '../../lib/adsense';

const AdSenseManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.pathname.startsWith('/admin')) return;

    prefetchAdSenseScript();

    const stopObserver = startAdSlotObserver();

    const flush = () => pushAdSenseSlots(document);
    flush();

    const retryTimers = [0, 16, 80, 200, 500, 1200].map((delay) => window.setTimeout(flush, delay));

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      stopObserver();
    };
  }, [location.pathname, location.search]);

  return null;
};

export default AdSenseManager;
