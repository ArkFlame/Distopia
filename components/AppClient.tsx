'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: string; username: string; displayName: string; avatarUrl: string; bio: string; theme: string; nameColor: string; font: string; verified: boolean; allowFriendRequests: boolean; allowServerInvites: boolean; };
type Server = { id: string; name: string; description: string; iconUrl: string; publicJoin: number; vanityCode: string; theme: string; role: string; };
type Channel = { id: string; serverId: string; name: string; type: string; position: number; };
type Member = { id: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; role: string; nickname: string; online?: boolean | number; };
type Message = { id: string; channelId: string; content: string; attachmentUrl: string; createdAt: string; userId: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; };
type Friend = { id: string; status: string; otherId: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; direction: string; };
type Rate = { bucket: string; limit: number; remaining: number; resetAt: number; retryAfterMs: number; };
type Bootstrap = { user: User; servers: Server[]; channels: Channel[]; members: Member[]; messages: Message[]; friends: Friend[]; webhooks: unknown[]; invites: unknown[]; appUrl: string; };

type Modal = 'server' | 'channel' | 'invite' | 'profile' | 'webhook' | 'friends' | 'join' | null;
type View = 'home' | 'server';

export default function AppClient() {
  const router = useRouter();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState('');
  const [rate, setRate] = useState<Rate | null>(null);
  const [fileName, setFileName] = useState('');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const selectedServer = useMemo(() => data?.servers.find((s) => s.id === selectedServerId) || data?.servers[0], [data, selectedServerId]);
  const officialServer = useMemo(() => data?.servers.find((s) => s.vanityCode === 'distopia') || data?.servers[0], [data]);
  const channels = useMemo(() => data?.channels.filter((c) => c.serverId === selectedServer?.id) || [], [data, selectedServer]);
  const selectedChannel = useMemo(() => channels.find((c) => c.id === selectedChannelId) || channels[0], [channels, selectedChannelId]);
  const theme = data?.user.theme || selectedServer?.theme || 'obsidian';

  const load = useCallback(async () => {
    const response = await fetch('/api/bootstrap', { cache: 'no-store' });
    const json = await response.json();
    if (!json.ok) {
      router.push('/');
      return;
    }
    const boot = json.data as Bootstrap;
    setData(boot);
    const preferred = boot.servers.find((s) => s.vanityCode === 'distopia') || boot.servers[0];
    setSelectedServerId((current) => current || preferred?.id || '');
    const preferredChannel = boot.channels.find((c) => c.serverId === preferred?.id);
    setSelectedChannelId((current) => current || preferredChannel?.id || boot.channels[0]?.id || '');
  }, [router]);

  const loadMessages = useCallback(async () => {
    if (view !== 'server' || !selectedChannel?.id) return;
    const response = await fetch(`/api/channels/${selectedChannel.id}/messages`, { cache: 'no-store' });
    const json = await response.json();
    if (!json.ok) return;
    setData((previous) => previous ? { ...previous, messages: json.data.messages } : previous);
  }, [selectedChannel?.id, view]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const first = channels[0]?.id || '';
    setSelectedChannelId((current) => channels.some((channel) => channel.id === current) ? current : first);
  }, [channels]);
  useEffect(() => { void loadMessages(); const timer = setInterval(() => void loadMessages(), 1800); return () => clearInterval(timer); }, [loadMessages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [data?.messages.length, selectedChannelId, view]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/channels/${selectedChannel.id}/messages`, { method: 'POST', body: form });
    const json = await response.json();
    setRate(shouldExposeRate(json.rate) ? json.rate : null);
    if (!json.ok) {
      setError(json.error || 'Message failed');
      return;
    }
    (event.currentTarget.elements.namedItem('content') as HTMLInputElement).value = '';
    (event.currentTarget.elements.namedItem('image') as HTMLInputElement).value = '';
    setFileName('');
    await loadMessages();
  }

  async function simplePost(url: string, body: Record<string, unknown>, after?: () => void) {
    setError('');
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json();
    setRate(shouldExposeRate(json.rate) ? json.rate : null);
    if (!json.ok) {
      setError(json.error || 'Request failed');
      return null;
    }
    await load();
    after?.();
    return json.data;
  }

  function openServer(server: Server) {
    setSelectedServerId(server.id);
    setView('server');
    setMenuOpen(false);
  }

  function openModal(next: Modal) {
    setModal(next);
    setMenuOpen(false);
  }

  if (!data) return <main className="shell-bg empty">Loading Distopia...</main>;

  const messages = data.messages.filter((m) => m.channelId === selectedChannel?.id);
  const members = data.members;
  const activeMembers = members.filter((member) => Boolean(member.online));
  const inactiveMembers = members.filter((member) => !Boolean(member.online));
  const appUrl = data.appUrl;
  const statusText = error || (fileName ? `${fileName} selected · max 2 MB` : rate ? formatRate(rate) : '');

  return (
    <main className={`app-shell theme-${theme} ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <aside className="rail" aria-label="Server rail">
        <button className={`server-dot ${view === 'home' ? 'active' : ''}`} title="Home" onClick={() => setView('home')}>
          <img src="/assets/brand/distopia-icon-transparent.webp" alt="" />
        </button>
        {data.servers.map((server) => (
          <button key={server.id} className={`server-dot ${view === 'server' && server.id === selectedServer?.id ? 'active' : ''}`} title={server.name} onClick={() => openServer(server)}>
            <ServerIcon server={server} />
          </button>
        ))}
        <button className="icon-btn" title="Create server" onClick={() => openModal('server')}><Icon name="server-plus" /></button>
      </aside>

      <aside className="side" aria-label="Channels">
        <div className="side-head">
          <div className="side-title">
            <span>{selectedServer?.name || 'No server'}</span>
            <div className="menu-anchor">
              <button className="mini-icon" title="Server options" onClick={() => setMenuOpen((open) => !open)}><Icon name="dots" /></button>
              {menuOpen && <ActionMenu open={openModal} canUseServer={Boolean(selectedServer)} />}
            </div>
          </div>
          <div className="server-desc">{selectedServer?.description || 'Create or join a server to start.'}</div>
        </div>
        <div className="channel-list">
          {channels.map((channel) => (
            <button className={`channel ${view === 'server' && channel.id === selectedChannel?.id ? 'active' : ''}`} key={channel.id} onClick={() => { setSelectedChannelId(channel.id); setView('server'); }}>
              <Icon name="hash" /> <span>{channel.name}</span>
            </button>
          ))}
          {!channels.length && <div className="empty">No channels.</div>}
        </div>
      </aside>

      <section className="chat">
        <header className="chat-head">
          <button className="mini-icon hide-mobile" title={leftCollapsed ? 'Open channels' : 'Collapse channels'} onClick={() => setLeftCollapsed((collapsed) => !collapsed)}>
            <Icon name={leftCollapsed ? 'chevron-right' : 'chevron-left'} />
          </button>
          <div className="chat-head-copy">
            <div className="chat-title">{view === 'home' ? 'Start' : `# ${selectedChannel?.name || 'empty'}`}</div>
            <div className="chat-sub">{view === 'home' ? 'Invite friends, create server, or join server.' : 'Compact feed. Local SQLite. Moderation active.'}</div>
          </div>
          <div className="head-actions">
            <button className="mini-icon" title="Profile" onClick={() => openModal('profile')}><Avatar user={data.user} small /></button>
            <button className="mini-icon hide-mobile" title={rightCollapsed ? 'Open members' : 'Collapse members'} onClick={() => setRightCollapsed((collapsed) => !collapsed)}>
              <Icon name={rightCollapsed ? 'chevron-left' : 'chevron-right'} />
            </button>
          </div>
        </header>

        {view === 'home' ? (
          <HomeStage
            user={data.user}
            officialServer={officialServer}
            openServer={openServer}
            openModal={openModal}
            appUrl={appUrl}
          />
        ) : (
          <>
            <div className="messages" ref={scrollRef}>
              {messages.map((message) => (
                <article className="message" key={message.id}>
                  <Avatar user={message} />
                  <div>
                    <div className="message-meta">
                      <span className="message-name" style={{ color: message.nameColor, fontFamily: fontStack(message.font) }}>{message.displayName}</span>
                      <span className="message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="message-content">{message.content}</div>
                    {message.attachmentUrl && <img className="attachment" src={message.attachmentUrl} alt="upload" />}
                  </div>
                </article>
              ))}
              {!messages.length && <div className="empty">No messages yet.</div>}
            </div>

            <form className="composer-wrap" onSubmit={sendMessage}>
              {statusText && <div className={`status-bar ${error ? 'error-state' : ''}`}>{statusText}</div>}
              <div className="composer">
                <input className="input composer-input" name="content" maxLength={1800} placeholder={`Message #${selectedChannel?.name || 'channel'}`} autoComplete="off" />
                <label className="file-label" title="Upload image"><Icon name="paperclip" /><input name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name || '')} /></label>
                <button className="send-btn" type="submit" title="Send"><Icon name="send" /></button>
              </div>
              <a className="arkflame-credit" href="https://arkflame.com" target="_blank" rel="noreferrer">Made with love by ArkFlame Studios</a>
            </form>
          </>
        )}
      </section>

      <aside className="people" aria-label="Members">
        <div className="panel-scroll">
          <div className="card identity-card">
            <h3>Identity</h3>
            <div className="member self-card">
              <Avatar user={data.user} />
              <div>
                <div className="member-name" style={{ color: data.user.nameColor, fontFamily: fontStack(data.user.font) }}>{data.user.displayName}</div>
                <div className="member-role"><span className="presence-dot online" /> @{data.user.username}</div>
              </div>
            </div>
            <div className="mini-grid"><button className="secondary" onClick={() => openModal('profile')}>Edit</button><button className="danger" onClick={logout}>Exit</button></div>
          </div>
          <div className="card members-card">
            <h3>Active</h3>
            {activeMembers.map((member) => <MemberRow key={member.id} member={member} />)}
            {!activeMembers.length && <div className="empty compact">No active members.</div>}
          </div>
          <div className="card members-card">
            <h3>Inactive</h3>
            {inactiveMembers.map((member) => <MemberRow key={member.id} member={member} inactive />)}
            {!inactiveMembers.length && <div className="empty compact">No inactive members.</div>}
          </div>
          <div className="card">
            <h3>Public embed</h3>
            <div className="copy-box">{selectedServer ? `${appUrl}/embed/server/${selectedServer.id}` : 'No server'}</div>
          </div>
        </div>
      </aside>

      {modal === 'server' && <Modal title="Create server" close={() => setModal(null)}><ServerForm submit={(body) => simplePost('/api/servers', body, () => setModal(null))} /></Modal>}
      {modal === 'channel' && <Modal title="Create channel" close={() => setModal(null)}><ChannelForm submit={(body) => selectedServer && simplePost(`/api/servers/${selectedServer.id}/channels`, body, () => setModal(null))} /></Modal>}
      {modal === 'invite' && <Modal title="Server invite" close={() => setModal(null)}><InvitePanel server={selectedServer} appUrl={appUrl} create={() => selectedServer && simplePost(`/api/servers/${selectedServer.id}/invites`, { customCode: '' })} /></Modal>}
      {modal === 'join' && <Modal title="Join server" close={() => setModal(null)}><JoinServerForm post={simplePost} close={() => setModal(null)} /></Modal>}
      {modal === 'profile' && <Modal title="Profile & privacy" close={() => setModal(null)}><ProfileForm user={data.user} refresh={load} close={() => setModal(null)} /></Modal>}
      {modal === 'webhook' && <Modal title="Webhooks" close={() => setModal(null)}><WebhookPanel channel={selectedChannel} server={selectedServer} appUrl={appUrl} create={(name) => selectedServer && selectedChannel && simplePost('/api/webhooks', { serverId: selectedServer.id, channelId: selectedChannel.id, name })} /></Modal>}
      {modal === 'friends' && <Modal title="Friends" close={() => setModal(null)}><FriendsPanel friends={data.friends} appUrl={appUrl} post={simplePost} /></Modal>}
    </main>
  );
}

function HomeStage({ user, officialServer, openServer, openModal, appUrl }: { user: User; officialServer?: Server; openServer: (server: Server) => void; openModal: (modal: Modal) => void; appUrl: string }) {
  return (
    <div className="home-stage">
      <section className="welcome-card">
        <div className="welcome-mark"><img src="/assets/brand/distopia-icon-transparent.webp" alt="" /></div>
        <div>
          <p className="eyebrow">Distopia</p>
          <h1>Minimal community OS.</h1>
          <p>Welcome, <strong style={{ color: user.nameColor, fontFamily: fontStack(user.font) }}>{user.displayName}</strong>. Start with one action. No dashboard noise.</p>
        </div>
      </section>
      <section className="quick-grid">
        <button className="quick-card" onClick={() => openModal('friends')}>
          <Icon name="user-plus" />
          <span>Invite friends</span>
          <small>Generate an add link.</small>
        </button>
        <button className="quick-card" onClick={() => openModal('server')}>
          <Icon name="server-plus" />
          <span>Create server</span>
          <small>Launch a new space.</small>
        </button>
        <button className="quick-card" onClick={() => openModal('join')}>
          <Icon name="login" />
          <span>Join server</span>
          <small>Use invite code.</small>
        </button>
      </section>
      {officialServer && (
        <section className="official-card">
          <div className="official-copy">
            <ServerIcon server={officialServer} />
            <div>
              <h2>{officialServer.name}</h2>
              <p>{officialServer.description}</p>
            </div>
          </div>
          <div className="official-actions">
            <div className="copy-box">{appUrl}/join/{officialServer.vanityCode}</div>
            <button className="primary" onClick={() => openServer(officialServer)}>Open official</button>
          </div>
        </section>
      )}
    </div>
  );
}

function ActionMenu({ open, canUseServer }: { open: (modal: Modal) => void; canUseServer: boolean }) {
  return (
    <div className="context-menu">
      <button onClick={() => open('channel')} disabled={!canUseServer}><Icon name="hash" /> Channel</button>
      <button onClick={() => open('invite')} disabled={!canUseServer}><Icon name="login" /> Invite</button>
      <button onClick={() => open('webhook')} disabled={!canUseServer}><Icon name="webhook" /> Webhook</button>
      <button onClick={() => open('friends')}><Icon name="user-plus" /> Friends</button>
      <button onClick={() => open('join')}><Icon name="door" /> Join</button>
    </div>
  );
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="secondary icon-close" onClick={close}>×</button></div>{children}</div></div>;
}

function ServerForm({ submit }: { submit: (body: Record<string, unknown>) => void }) {
  return <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit(Object.fromEntries(f.entries())); }}><label className="field"><span>Name</span><input className="input" name="name" minLength={2} maxLength={40} required /></label><label className="field"><span>Description</span><textarea className="textarea" name="description" maxLength={180} /></label><label className="field"><span>Theme</span><select className="select" name="theme"><option value="obsidian">Obsidian</option><option value="neon">Neon</option><option value="ember">Ember</option><option value="forest">Forest</option><option value="mono">Mono</option><option value="aurora">Aurora</option></select></label><button className="primary">Create</button></form>;
}

function ChannelForm({ submit }: { submit: (body: Record<string, unknown>) => void }) {
  return <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit(Object.fromEntries(f.entries())); }}><label className="field"><span>Name</span><input className="input" name="name" minLength={2} maxLength={32} required placeholder="announcements" /></label><button className="primary">Create channel</button></form>;
}

function InvitePanel({ server, appUrl, create }: { server?: Server; appUrl: string; create: () => Promise<unknown> | unknown }) {
  const [link, setLink] = useState(server?.vanityCode ? `${appUrl}/join/${server.vanityCode}` : '');
  return <div className="card embedded"><h3>Share link</h3><div className="copy-box">{link || 'Create an invite.'}</div><br /><button className="primary" onClick={async () => { const data = await create() as { invite?: { code?: string } } | null; if (data?.invite?.code) setLink(`${appUrl}/join/${data.invite.code}`); }}>Generate invite</button></div>;
}

function JoinServerForm({ post, close }: { post: (url: string, body: Record<string, unknown>, after?: () => void) => Promise<unknown>; close: () => void }) {
  const [code, setCode] = useState('distopia');
  return <form onSubmit={(e) => { e.preventDefault(); void post('/api/servers/join-by-code', { code }, close); }}><label className="field"><span>Invite code</span><input className="input" value={code} onChange={(e) => setCode(e.target.value)} minLength={2} maxLength={64} required /></label><button className="primary">Join</button></form>;
}

function WebhookPanel({ channel, server, appUrl, create }: { channel?: Channel; server?: Server; appUrl: string; create: (name: string) => Promise<unknown> | unknown }) {
  const [name, setName] = useState('Deploy Bot');
  const [url, setUrl] = useState('');
  return <div><p className="server-desc">Incoming POST creates a message in #{channel?.name}. Payload: JSON with content.</p><label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label><button className="primary" disabled={!server || !channel} onClick={async () => { const hook = await create(name) as { webhook?: { token?: string } } | null; if (hook?.webhook?.token) setUrl(`${appUrl}/api/webhooks/${hook.webhook.token}`); }}>Create webhook</button>{url && <><br /><br /><div className="copy-box">{url}</div></>}</div>;
}

function FriendsPanel({ friends, appUrl, post }: { friends: Friend[]; appUrl: string; post: (url: string, body: Record<string, unknown>) => Promise<unknown> }) {
  const [link, setLink] = useState('');
  return <div className="panel-scroll modal-scroll"><div className="card embedded"><h3>Friend invite</h3><button className="primary" onClick={async () => { const data = await post('/api/friend-invites', {}) as { invite?: { code?: string } } | null; if (data?.invite?.code) setLink(`${appUrl}/api/friend-invites/${data.invite.code}/use`); }}>Generate add link</button>{link && <><br /><br /><div className="copy-box">POST {link}</div></>}</div><div className="card embedded"><h3>Friends</h3>{friends.map((friend) => <div className="member" key={friend.id}><Avatar user={friend} /><div><div className="member-name" style={{ color: friend.nameColor, fontFamily: fontStack(friend.font) }}>{friend.displayName}</div><div className="member-role">{friend.status} · {friend.direction}</div></div>{friend.status === 'pending' && friend.direction === 'incoming' && <button className="secondary" onClick={() => post('/api/friends/accept', { friendId: friend.id })}>Accept</button>}</div>)}{!friends.length && <div className="empty compact">No friends yet.</div>}</div></div>;
}

function ProfileForm({ user, refresh, close }: { user: User; refresh: () => Promise<void>; close: () => void }) {
  const [error, setError] = useState('');
  const premadeAvatars = useMemo(() => Array.from({ length: 8 }, (_, index) => `/assets/premade-avatars/distopia-avatar-${index + 1}.webp`), []);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatarUrl.startsWith('/assets/premade-avatars/') ? user.avatarUrl : '');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    form.set('avatarPreset', selectedAvatar);
    const jsonBody = Object.fromEntries(form.entries());
    const response = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jsonBody) });
    const json = await response.json();
    if (!json.ok) { setError(json.error); return; }
    const image = form.get('avatar') as File | null;
    if (image && image.size > 0) {
      const avatar = new FormData();
      avatar.set('avatar', image);
      const upload = await fetch('/api/me/avatar', { method: 'POST', body: avatar });
      const uploadJson = await upload.json();
      if (!uploadJson.ok) { setError(uploadJson.error); return; }
    }
    await refresh();
    close();
  }

  return <form onSubmit={save}>
    <label className="field"><span>Display name</span><input className="input" name="displayName" defaultValue={user.displayName} minLength={2} maxLength={32} /></label>
    <label className="field"><span>Bio</span><textarea className="textarea" name="bio" defaultValue={user.bio} maxLength={180} /></label>
    <div className="mini-grid"><label className="field"><span>Name color</span><input className="input" name="nameColor" defaultValue={user.nameColor} /></label><label className="field"><span>Font</span><select className="select" name="font" defaultValue={user.font}><option>Inter</option><option>JetBrains Mono</option><option>Georgia</option><option>Trebuchet MS</option></select></label></div>
    <label className="field"><span>Theme</span><select className="select" name="theme" defaultValue={user.theme}><option value="obsidian">Obsidian</option><option value="neon">Neon</option><option value="ember">Ember</option><option value="forest">Forest</option><option value="mono">Mono</option><option value="aurora">Aurora</option></select></label>
    <div className="field"><span>Premade avatar</span><div className="avatar-picker">{premadeAvatars.map((avatar) => <button className={`avatar-choice ${selectedAvatar === avatar ? 'active' : ''}`} key={avatar} type="button" onClick={() => setSelectedAvatar(avatar)}><img src={avatar} alt="" /></button>)}</div></div>
    <input type="hidden" name="avatarPreset" value={selectedAvatar} />
    <label className="field"><span>Custom avatar</span><input className="input" name="avatar" type="file" accept="image/png,image/jpeg,image/gif,image/webp" /></label>
    <label className="toggle-row"><span>Allow friend requests</span><input type="checkbox" name="allowFriendRequests" defaultChecked={user.allowFriendRequests} /></label>
    <label className="toggle-row"><span>Allow server invites</span><input type="checkbox" name="allowServerInvites" defaultChecked={user.allowServerInvites} /></label>
    <p className="error">{error}</p><button className="primary">Save profile</button>
  </form>;
}

function MemberRow({ member, inactive = false }: { member: Member; inactive?: boolean }) {
  return <div className={`member ${inactive ? 'inactive-member' : ''}`}><Avatar user={member} /><div><div className="member-name" style={{ color: member.nameColor, fontFamily: fontStack(member.font) }}>{member.nickname || member.displayName}</div><div className="member-role"><span className={`presence-dot ${inactive ? 'offline' : 'online'}`} /> {member.role}</div></div></div>;
}

function Avatar({ user, small = false }: { user: { id: string; avatarUrl: string; displayName: string }; small?: boolean }) {
  return <div className={`avatar ${small ? 'avatar-small' : ''}`}><img src={user.avatarUrl || defaultAvatarUrl(user.id)} alt="" /></div>;
}

function ServerIcon({ server }: { server: Server }) {
  if (server.iconUrl) return <img src={server.iconUrl} alt="" />;
  return <span>{server.name.slice(0, 1).toUpperCase()}</span>;
}

function Icon({ name }: { name: string }) {
  return <img className="icon" src={`/assets/icons/${name}.svg`} alt="" aria-hidden="true" />;
}

function defaultAvatarUrl(seed: string): string {
  const value = hash(seed);
  return `/assets/premade-avatars/distopia-avatar-${(value % 8) + 1}.webp`;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shouldExposeRate(rate?: Rate): boolean {
  return Boolean(rate && rate.remaining <= 2);
}

function formatRate(rate: Rate): string {
  if (rate.remaining <= 0) return `${rate.bucket} cooldown · ${Math.ceil(rate.retryAfterMs / 1000)}s`;
  return `${rate.bucket}: ${rate.remaining}/${rate.limit} left`;
}

function fontStack(font: string): string {
  if (font === 'JetBrains Mono') return '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  if (font === 'Georgia') return 'Georgia, serif';
  if (font === 'Trebuchet MS') return '"Trebuchet MS", sans-serif';
  return 'Inter, ui-sans-serif, system-ui, sans-serif';
}
