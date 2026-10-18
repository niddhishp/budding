"use client";
import { useEffect, useState } from 'react';
import { todayDate } from '@/lib/family-care';

// A tab kept open overnight should move to the new India-calendar day too.
export function useTodayDate() {
  const [date, setDate] = useState(todayDate);
  useEffect(() => {
    const refresh = () => setDate(todayDate());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return date;
}
