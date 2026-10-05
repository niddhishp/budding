import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Connect a WhatsApp number: the app issues a one-time code, and the parent sends it from
// WhatsApp (prefilled via a wa.me link) so Budding knows the number is theirs.
export function WhatsAppSheet({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/whatsapp/link')
      .then((r) => r.json())
      .then((b) => { setPhone(b.phone); setNumber(b.number); })
      .catch(() => setError('Could not check your WhatsApp connection.'))
      .finally(() => setLoading(false));
  }, []);

  const getCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/link', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setCode(body.code);
      setNumber(body.number);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not create a code.');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    const res = await fetch('/api/whatsapp/link', { method: 'DELETE' });
    if (res.ok) setPhone(null);
    setLoading(false);
  };

  const digits = number?.replace(/\D/g, '');
  const waLink = digits && code ? `https://wa.me/${digits}?text=${encodeURIComponent(`LINK ${code}`)}` : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-title"
        className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8"
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-full bg-[#25D366]/15 flex items-center justify-center mb-5">
          <MessageCircle className="w-6 h-6 text-[#128C4B]" />
        </div>
        <h2 id="wa-title" className="font-heading text-3xl text-slate-850 mb-2 pr-8">Budding on WhatsApp</h2>
        <p className="text-slate-500 mb-6">Message Budding like a friend in the middle of a hard moment. Same guidance, no app to open.</p>

        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : phone ? (
          <>
            <p className="flex items-center gap-2 p-4 rounded-2xl bg-sage/10 text-slate-700 mb-4">
              <Check className="w-5 h-5 text-sage" /> Connected to {phone}
            </p>
            {digits && (
              <Button asChild className="w-full h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white mb-3">
                <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">Open chat</a>
              </Button>
            )}
            <button onClick={disconnect} className="w-full text-sm text-slate-500 hover:text-red-600">Disconnect</button>
          </>
        ) : !number ? (
          <p className="text-slate-600">WhatsApp is coming soon.</p>
        ) : code ? (
          <>
            <p className="text-sm text-slate-600 mb-3">Tap below. WhatsApp opens with your code ready — just press send.</p>
            <p className="text-center font-mono text-3xl tracking-[0.3em] text-slate-850 py-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">{code}</p>
            {waLink && (
              <Button asChild className="w-full h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-lg">
                <a href={waLink} target="_blank" rel="noreferrer">Send code on WhatsApp</a>
              </Button>
            )}
            <p className="mt-3 text-xs text-center text-slate-400">
              Or send <span className="font-mono">LINK {code}</span> to {number}. The code expires in 15 minutes.
            </p>
          </>
        ) : (
          <Button onClick={getCode} className="w-full h-14 rounded-full bg-slate-850 hover:bg-slate-800 text-white text-lg">Connect my WhatsApp</Button>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </motion.div>
    </div>
  );
}
