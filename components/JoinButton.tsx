'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  async function join() {
    const response = await fetch('/api/servers/join-by-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Join failed. Login first.');
      return;
    }
    router.push('/app');
  }
  return <div><button className="primary" onClick={join}>Join Distopia space</button><p className="error">{error}</p></div>;
}
