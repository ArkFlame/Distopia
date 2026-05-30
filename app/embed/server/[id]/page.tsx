import Link from 'next/link';
import { db } from '@/lib/db';
import { listMembers } from '@/lib/queries';

export default async function EmbedServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = db.prepare('SELECT id, name, description, vanityCode, publicJoin FROM servers WHERE id = ?').get(id) as any;
  if (!server) return <main className="shell-bg empty">Server not found.</main>;
  const members = listMembers(id) as any[];
  const invite = db.prepare('SELECT code FROM server_invites WHERE serverId = ? ORDER BY createdAt ASC LIMIT 1').get(id) as any;
  return <main className="shell-bg home"><section className="hero"><div className="logo-word"><span className="logo-mark">D</span> Distopia Embed</div><h1>{server.name}</h1><p>{server.description}</p><div className="pill-row"><span className="pill">{members.length} members</span><span className="pill">{server.publicJoin ? 'Open join' : 'Closed join'}</span></div></section><section className="auth-card"><h2>Members</h2>{members.slice(0,8).map((member) => <div className="member" key={member.id}><div className="avatar">{member.displayName.slice(0,1)}</div><div><div className="member-name" style={{color:member.nameColor}}>{member.displayName}</div><div className="member-role">{member.role}</div></div></div>)}{invite && <Link className="primary" style={{display:'inline-block', marginTop:12}} href={`/join/${invite.code}`}>Join</Link>}</section></main>;
}
