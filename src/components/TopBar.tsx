import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { WhatsAppSheet } from '@/components/WhatsAppSheet';
import { SproutMark } from '@/components/illustrations';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, Plus, Check, Sparkles, Shield, Trash2, Stethoscope, MessageCircle } from 'lucide-react';

export function TopBar() {
  const { selectedChildId, children, selectChild, setAddingChild, userEmail, signOut, entitlement, openPaywall, openExpert } = useAppStore();
  const isPlus = entitlement?.plan === 'plus';
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200/60 flex items-center justify-between gap-3 px-4 md:px-6 flex-shrink-0">
      {/* Mobile brand */}
      <SproutMark className="md:hidden w-8 h-8 flex-shrink-0" />

      {/* Child switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full bg-clay/10 text-clay text-sm font-medium focus:outline-none focus:ring-2 focus:ring-clay/30">
          <span className="w-6 h-6 rounded-full bg-clay text-white flex items-center justify-center text-xs">
            {selectedChild?.name[0]}
          </span>
          <span className="truncate max-w-[10rem]">{selectedChild?.name}</span>
          <span className="text-clay/70 hidden sm:inline">· {selectedChild?.age.label}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {children.map((child) => (
            <DropdownMenuItem key={child.id} onSelect={() => selectChild(child.id)}>
              <span className="flex-1">{child.name} <span className="text-slate-400">· {child.age.label}</span></span>
              {child.id === selectedChildId && <Check className="w-4 h-4 text-clay" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAddingChild(true)}>
            <Plus className="w-4 h-4" /> Add a child
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {entitlement && !isPlus && (
        <button
          onClick={() => openPaywall()}
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-leaf/10 text-leaf text-xs font-semibold hover:bg-leaf/15"
        >
          <Sparkles className="w-3.5 h-3.5" /> {Math.max(0, entitlement.limit - entitlement.used)} free left · Upgrade
        </button>
      )}

      {/* Account */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Account"
        >
          <span className="text-xs font-medium text-white uppercase">{userEmail?.[0] ?? 'P'}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {userEmail && <DropdownMenuLabel className="font-normal text-slate-500 truncate">{userEmail}</DropdownMenuLabel>}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openPaywall()}>
            <Sparkles className="w-4 h-4" /> {isPlus ? 'Budding Plus · Manage' : 'Upgrade to Plus'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setWhatsAppOpen(true)}>
            <MessageCircle className="w-4 h-4" /> Connect WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openExpert('menu')}>
            <Stethoscope className="w-4 h-4" /> Talk to a child psychologist
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/privacy" target="_blank" rel="noreferrer"><Shield className="w-4 h-4" /> Privacy</a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => deleteAccount()} className="text-red-600 focus:text-red-700">
            <Trash2 className="w-4 h-4" /> Delete account & data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut className="w-4 h-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {whatsAppOpen && <WhatsAppSheet onClose={() => setWhatsAppOpen(false)} />}
    </header>
  );
}

async function deleteAccount() {
  const typed = window.prompt(
    'This permanently deletes your account, every child profile, log and decode, and cancels any subscription. Type DELETE to confirm.',
  );
  if (typed?.trim().toUpperCase() !== 'DELETE') return;
  const res = await fetch('/api/account/delete', { method: 'POST' });
  if (res.ok) {
    window.location.href = '/';
  } else {
    const body = await res.json().catch(() => null);
    window.alert(body?.error ?? 'We could not delete your account. Please try again.');
  }
}
