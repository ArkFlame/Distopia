import { db } from '@/lib/db';
import JoinButton from '@/components/JoinButton';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = db.prepare(`
    SELECT i.code, i.uses, i.maxUses, s.id as serverId, s.name, s.description, s.publicJoin
    FROM server_invites i
    JOIN servers s ON s.id = i.serverId
    WHERE i.code = ?
  `).get(code) as any;

  if (!invite) return <main className="shell-bg empty">Invite not found.</main>;

  return <main className="shell-bg home"><section className="hero"><div className="logo-word"><span className="logo-mark"><img src="/assets/brand/distopia-app-icon.webp" alt="" /></span> Distopia Invite</div><h1>{invite.name}</h1><p>{invite.description || 'Join this Distopia server.'}</p></section><section className="auth-card"><h2>Join server</h2><p className="server-desc">Code: {invite.code}</p><JoinButton code={invite.code} /></section></main>;
}
