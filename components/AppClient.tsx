'use client';

import { CSSProperties, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { id: string; username: string; displayName: string; avatarUrl: string; bio: string; theme: string; nameColor: string; font: string; verified: boolean; allowFriendRequests: boolean; allowServerInvites: boolean; };
type Server = { id: string; name: string; description: string; iconUrl: string; publicJoin: number; vanityCode: string; theme: string; role: string; };
type Channel = { id: string; serverId: string; name: string; description: string; type: string; position: number; };
type Member = { id: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; role: string; nickname: string; online?: boolean | number; };
type Message = { id: string; channelId: string; content: string; attachmentUrl: string; attachmentName: string; attachmentMime: string; attachmentSize: number; createdAt: string; editedAt: string; editHistoryCount: number; userId: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; localStatus?: 'sending' | 'failed'; localError?: string; };
type Friend = { id: string; status: string; otherId: string; username: string; displayName: string; avatarUrl: string; nameColor: string; font: string; direction: string; };
type Rate = { bucket: string; limit: number; remaining: number; resetAt: number; retryAfterMs: number; };
type Bootstrap = { user: User; servers: Server[]; channels: Channel[]; members: Member[]; messages: Message[]; friends: Friend[]; webhooks: unknown[]; invites: unknown[]; appUrl: string; };
type EditHistory = { id: string; previousContent: string; newContent: string; createdAt: string; userId: string; username: string; displayName: string; };
type AttachmentDraft = { file: File; previewUrl: string; name: string; mime: string; size: number; kind: 'image' | 'zip' };

type Modal = 'server' | 'serverSettings' | 'channel' | 'channelSettings' | 'invite' | 'profile' | 'webhook' | 'friends' | 'join' | null;
type View = 'home' | 'server';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
const ATTACHMENT_ACCEPT = `${IMAGE_ACCEPT},application/zip,.zip`;
const FONT_OPTIONS = [
  'Inter',
  'JetBrains Mono',
  'Neon Pulse',
  'Cyber Grid',
  'Arcade',
  'Terminal',
  'Elegant Serif',
  'Street Bold',
  'Rounded Soft',
  'Georgia',
  'Trebuchet MS',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Brush Script MT',
  'Times New Roman'
];

export default function AppClient() {
  const router = useRouter();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState('');
  const [rate, setRate] = useState<Rate | null>(null);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<{ message: Message; entries: EditHistory[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const selectedServer = useMemo(() => data?.servers.find((s) => s.id === selectedServerId) || data?.servers[0], [data, selectedServerId]);
  const officialServer = useMemo(() => data?.servers.find((s) => s.vanityCode === 'distopia') || data?.servers[0], [data]);
  const channels = useMemo(() => data?.channels.filter((c) => c.serverId === selectedServer?.id) || [], [data, selectedServer]);
  const selectedChannel = useMemo(() => channels.find((c) => c.id === selectedChannelId) || channels[0], [channels, selectedChannelId]);
  const theme = data?.user.theme || 'obsidian';

  const load = useCallback(async () => {
    const response = await fetch('/api/bootstrap', { cache: 'no-store' });
    const json = await response.json();
    if (!json.ok) {
      router.push('/');
      return;
    }
    const boot = normalizeBootstrap(json.data as Bootstrap);
    setData((previous) => {
      if (!previous) return boot;
      const local = previous.messages.filter((message) => message.localStatus);
      return { ...boot, messages: mergeMessages(boot.messages, local) };
    });
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
    const remote = normalizeMessages(json.data.messages as Message[]);
    setData((previous) => previous ? { ...previous, messages: mergeMessages(remote, previous.messages.filter((message) => message.localStatus && message.channelId === selectedChannel.id)) } : previous);
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
    if (!selectedChannel || !data) return;
    setError('');
    const formElement = event.currentTarget;
    const contentInput = formElement.elements.namedItem('content') as HTMLInputElement;
    const fileInput = formElement.elements.namedItem('attachment') as HTMLInputElement;
    const content = contentInput.value.trim();
    const draft = attachment;
    if (!content) {
      setError(draft ? 'Write a message before attaching files' : 'Message required');
      return;
    }

    const tempId = `local-${Date.now()}`;
    const previewUrl = draft?.previewUrl || '';
    const optimistic: Message = {
      id: tempId,
      channelId: selectedChannel.id,
      content,
      attachmentUrl: previewUrl,
      attachmentName: draft?.name || '',
      attachmentMime: draft?.mime || '',
      attachmentSize: draft?.size || 0,
      createdAt: new Date().toISOString(),
      editedAt: '',
      editHistoryCount: 0,
      userId: data.user.id,
      username: data.user.username,
      displayName: data.user.displayName,
      avatarUrl: data.user.avatarUrl,
      nameColor: data.user.nameColor,
      font: data.user.font,
      localStatus: 'sending'
    };
    setData((previous) => previous ? { ...previous, messages: [...previous.messages, optimistic] } : previous);
    contentInput.value = '';
    fileInput.value = '';
    setAttachment(null);

    const request = new FormData();
    request.set('content', content);
    if (draft) request.set('attachment', draft.file);
    const response = await fetch(`/api/channels/${selectedChannel.id}/messages`, { method: 'POST', body: request });
    const json = await response.json();
    setRate(shouldExposeRate(json.rate) ? json.rate : null);
    if (!json.ok) {
      setData((previous) => previous ? { ...previous, messages: previous.messages.map((message) => message.id === tempId ? { ...message, localStatus: 'failed', localError: json.error || 'Message failed' } : message) } : previous);
      setError(json.error || 'Message failed');
      return;
    }
    const remote = normalizeMessage(json.data.message as Message);
    setData((previous) => previous ? { ...previous, messages: previous.messages.map((message) => message.id === tempId ? remote : message) } : previous);
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

  async function simplePatch(url: string, body: Record<string, unknown>, after?: () => void) {
    setError('');
    const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Save failed');
      return null;
    }
    await load();
    after?.();
    return json.data;
  }

  async function createServer(form: FormData) {
    const name = String(form.get('name') || '');
    const description = String(form.get('description') || '');
    const created = await simplePost('/api/servers', { name, description });
    const serverId = (created as { serverId?: string } | null)?.serverId;
    const icon = form.get('icon') as File | null;
    if (serverId && icon && icon.size > 0 && !(await uploadServerIcon(serverId, icon))) return;
    if (serverId) {
      setSelectedServerId(serverId);
      setView('server');
    }
    setModal(null);
    await load();
  }

  async function saveServerSettings(form: FormData) {
    if (!selectedServer) return;
    const saved = await simplePatch(`/api/servers/${selectedServer.id}`, {
      name: String(form.get('name') || selectedServer.name),
      description: String(form.get('description') || ''),
      publicJoin: form.get('publicJoin') === 'on',
      vanityCode: String(form.get('vanityCode') || selectedServer.vanityCode)
    });
    if (!saved) return;
    const icon = form.get('icon') as File | null;
    if (icon && icon.size > 0 && !(await uploadServerIcon(selectedServer.id, icon))) return;
    setModal(null);
    await load();
  }

  async function uploadServerIcon(serverId: string, file: File): Promise<boolean> {
    try {
      const compressed = await compressImageFile(file, 512, 0.82);
      const body = new FormData();
      body.set('icon', compressed);
      const response = await fetch(`/api/servers/${serverId}/icon`, { method: 'POST', body });
      const json = await response.json();
      if (!json.ok) {
        setError(json.error || 'Server icon upload failed');
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server icon upload failed');
      return false;
    }
  }

  async function deleteAttachment(messageId: string) {
    const response = await fetch(`/api/messages/${messageId}/attachment`, { method: 'DELETE' });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Attachment delete failed');
      return;
    }
    setData((previous) => previous ? { ...previous, messages: previous.messages.map((message) => message.id === messageId ? { ...message, attachmentUrl: '', attachmentName: '', attachmentMime: '', attachmentSize: 0 } : message) } : previous);
  }

  async function editMessage(messageId: string, content: string): Promise<boolean> {
    setError('');
    const response = await fetch(`/api/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Message edit failed');
      return false;
    }
    const remote = normalizeMessage(json.data.message as Message);
    setData((previous) => previous ? { ...previous, messages: previous.messages.map((message) => message.id === messageId ? remote : message) } : previous);
    return true;
  }

  async function deleteMessage(messageId: string): Promise<void> {
    setError('');
    const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Message delete failed');
      return;
    }
    setData((previous) => previous ? { ...previous, messages: previous.messages.filter((message) => message.id !== messageId) } : previous);
  }

  async function showEditHistory(message: Message): Promise<void> {
    setError('');
    const response = await fetch(`/api/messages/${message.id}/history`, { cache: 'no-store' });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Edit history failed');
      return;
    }
    setHistoryMessage({ message, entries: json.data.entries as EditHistory[] });
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

  async function selectAttachment(file: File | undefined) {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setError('');
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Attachment exceeds 8 MB limit');
      return;
    }
    const zip = isZipFile(file);
    if (!zip && !file.type.startsWith('image/')) {
      setError('Only image and .zip attachments are allowed');
      return;
    }
    try {
      const ready = zip ? file : await compressImageFile(file, 1600, 0.82);
      const previewUrl = ready.type.startsWith('image/') ? URL.createObjectURL(ready) : '';
      setAttachment({ file: ready, previewUrl, name: ready.name, mime: ready.type || (zip ? 'application/zip' : 'application/octet-stream'), size: ready.size, kind: zip ? 'zip' : 'image' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attachment prepare failed');
    }
  }

  if (!data) return <main className="shell-bg empty">Loading Distopia...</main>;

  const messages = data.messages.filter((m) => m.channelId === selectedChannel?.id);
  const members = data.members;
  const activeMembers = members.filter((member) => Boolean(member.online));
  const inactiveMembers = members.filter((member) => !Boolean(member.online));
  const appUrl = data.appUrl;
  const statusText = error || (rate ? formatRate(rate) : '');

  return (
    <main className={`app-shell theme-${theme} ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <aside className="rail" aria-label="Server rail">
        <button className={`server-dot ${view === 'home' ? 'active' : ''}`} title="Home" onClick={() => setView('home')}>
          <img src="/assets/brand/distopia-app-icon.webp" alt="" />
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
            <div className="chat-sub">{view === 'home' ? 'Invite friends, create server, or join server.' : selectedChannel?.description || ''}</div>
          </div>
          <div className="head-actions">
            <button className="mini-icon" title="Profile" onClick={() => openModal('profile')}><Avatar user={data.user} small /></button>
            <button className="mini-icon hide-mobile" title={rightCollapsed ? 'Open members' : 'Collapse members'} onClick={() => setRightCollapsed((collapsed) => !collapsed)}>
              <Icon name={rightCollapsed ? 'chevron-left' : 'chevron-right'} />
            </button>
          </div>
        </header>

        {view === 'home' ? (
          <HomeStage user={data.user} officialServer={officialServer} openServer={openServer} openModal={openModal} appUrl={appUrl} />
        ) : (
          <>
            <div className="messages" ref={scrollRef}>
              {messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  currentUserId={data.user.id}
                  canDelete={selectedServer?.role === 'owner'}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onHistory={showEditHistory}
                />
              ))}
              {!messages.length && <div className="empty">No messages yet.</div>}
            </div>

            <form className="composer-wrap" onSubmit={sendMessage}>
              {statusText && <div className={`status-bar ${error ? 'error-state' : ''}`}>{statusText}</div>}
              {attachment && <AttachmentChip attachment={attachment} remove={() => { if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl); setAttachment(null); }} />}
              <div className="composer">
                <input className="input composer-input" name="content" maxLength={1800} placeholder={`Message #${selectedChannel?.name || 'channel'}`} autoComplete="off" />
                <label className="file-label" title="Upload image or ZIP"><Icon name="paperclip" /><input name="attachment" type="file" accept={ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.currentTarget.files?.[0])} /></label>
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
                <div className="member-name" style={nameStyle(data.user.font, data.user.nameColor)}>{data.user.displayName}</div>
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

      {modal === 'server' && <Modal title="Create server" close={() => setModal(null)}><ServerForm submit={createServer} /></Modal>}
      {modal === 'serverSettings' && selectedServer && <Modal title="Server settings" close={() => setModal(null)}><ServerSettingsForm server={selectedServer} submit={saveServerSettings} /></Modal>}
      {modal === 'channel' && <Modal title="Create channel" close={() => setModal(null)}><ChannelForm submit={(body) => selectedServer && simplePost(`/api/servers/${selectedServer.id}/channels`, body, () => setModal(null))} /></Modal>}
      {modal === 'channelSettings' && selectedChannel && <Modal title="Channel settings" close={() => setModal(null)}><ChannelSettingsForm channel={selectedChannel} submit={(body) => simplePatch(`/api/channels/${selectedChannel.id}`, body, () => setModal(null))} /></Modal>}
      {modal === 'invite' && <Modal title="Server invite" close={() => setModal(null)}><InvitePanel server={selectedServer} appUrl={appUrl} create={() => selectedServer && simplePost(`/api/servers/${selectedServer.id}/invites`, { customCode: '' })} /></Modal>}
      {modal === 'join' && <Modal title="Join server" close={() => setModal(null)}><JoinServerForm post={simplePost} close={() => setModal(null)} /></Modal>}
      {modal === 'profile' && <Modal title="Profile & privacy" close={() => setModal(null)}><ProfileForm user={data.user} refresh={load} close={() => setModal(null)} /></Modal>}
      {modal === 'webhook' && <Modal title="Webhooks" close={() => setModal(null)}><WebhookPanel channel={selectedChannel} server={selectedServer} appUrl={appUrl} create={(name) => selectedServer && selectedChannel && simplePost('/api/webhooks', { serverId: selectedServer.id, channelId: selectedChannel.id, name })} /></Modal>}
      {modal === 'friends' && <Modal title="Friends" close={() => setModal(null)}><FriendsPanel friends={data.friends} appUrl={appUrl} post={simplePost} /></Modal>}
      {historyMessage && <Modal title="Edit history" close={() => setHistoryMessage(null)}><EditHistoryPanel message={historyMessage.message} entries={historyMessage.entries} /></Modal>}
    </main>
  );
}

function MessageRow({ message, currentUserId, canDelete, onEdit, onDelete, onHistory }: { message: Message; currentUserId: string; canDelete: boolean; onEdit: (messageId: string, content: string) => Promise<boolean>; onDelete: (messageId: string) => Promise<void>; onHistory: (message: Message) => Promise<void> }) {
  const failed = message.localStatus === 'failed';
  const sending = message.localStatus === 'sending';
  const canEdit = !message.localStatus && message.userId === currentUserId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || content === message.content) {
      setEditing(false);
      setDraft(message.content);
      return;
    }
    setBusy(true);
    const saved = await onEdit(message.id, content);
    setBusy(false);
    if (saved) setEditing(false);
  }

  return <article className={`message ${sending ? 'message-sending' : ''} ${failed ? 'message-failed' : ''}`}>
    <Avatar user={message} />
    <div className="message-main">
      <div className="message-meta">
        <span className="message-name" style={nameStyle(message.font, message.nameColor)}>{message.displayName}</span>
        <span className="message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {sending && <span className="pending-pill">sending</span>}
        {failed && <span className="failed-pill">blocked</span>}
      </div>
      {editing ? (
        <form className="message-edit-form" onSubmit={saveEdit}>
          <input className="input message-edit-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1800} autoFocus />
          <button className="secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(message.content); }}>Cancel</button>
          <button className="primary" disabled={busy}>Save</button>
        </form>
      ) : (
        <div className="message-content">
          {message.content}
          {message.editedAt && <button className="edited-tag" type="button" onClick={() => void onHistory(message)}>(edited)</button>}
        </div>
      )}
      {message.localError && <div className="message-error">{message.localError}</div>}
      {message.attachmentUrl && <MessageAttachment message={message} />}
      {!message.localStatus && <div className="message-actions">
        {canEdit && !editing && <button type="button" onClick={() => setEditing(true)}>Edit</button>}
        {message.editedAt && <button type="button" onClick={() => void onHistory(message)}>History</button>}
        {canDelete && <button type="button" className="danger-action" onClick={() => void onDelete(message.id)}>Delete</button>}
      </div>}
    </div>
  </article>;
}

function MessageAttachment({ message }: { message: Message }) {
  const image = message.attachmentMime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(message.attachmentUrl);
  return <div className="attachment-box">
    {image ? <img className="attachment" src={message.attachmentUrl} alt={message.attachmentName || 'upload'} /> : <a className="zip-attachment" href={message.attachmentUrl} target="_blank" rel="noreferrer">ZIP · {message.attachmentName || 'archive.zip'} · {formatFileSize(message.attachmentSize)}</a>}
  </div>;
}

function AttachmentChip({ attachment, remove }: { attachment: AttachmentDraft; remove: () => void }) {
  return <div className="attachment-chip">
    <span>{attachment.kind === 'zip' ? 'ZIP' : 'IMG'} · {attachment.name} · {formatFileSize(attachment.size)}</span>
    <button type="button" onClick={remove} title="Remove attachment">×</button>
  </div>;
}

function HomeStage({ user, officialServer, openServer, openModal, appUrl }: { user: User; officialServer?: Server; openServer: (server: Server) => void; openModal: (modal: Modal) => void; appUrl: string }) {
  return (
    <div className="home-stage">
      <section className="welcome-card">
        <div className="welcome-mark"><img src="/assets/brand/distopia-app-icon.webp" alt="" /></div>
        <div>
          <p className="eyebrow">Distopia</p>
          <h1>Minimal community OS.</h1>
          <p>Welcome, <strong style={nameStyle(user.font, user.nameColor)}>{user.displayName}</strong>. Start with one action. No dashboard noise.</p>
        </div>
      </section>
      <section className="quick-grid">
        <button className="quick-card" onClick={() => openModal('friends')}><Icon name="user-plus" /><span>Invite friends</span><small>Generate an add link.</small></button>
        <button className="quick-card" onClick={() => openModal('server')}><Icon name="server-plus" /><span>Create server</span><small>Launch a new space.</small></button>
        <button className="quick-card" onClick={() => openModal('join')}><Icon name="login" /><span>Join server</span><small>Use invite code.</small></button>
      </section>
      {officialServer && (
        <section className="official-card">
          <div className="official-copy">
            <div className="official-icon"><ServerIcon server={officialServer} /></div>
            <div><h2>{officialServer.name}</h2><p>{officialServer.description}</p></div>
          </div>
          <div className="official-actions"><div className="copy-box">{appUrl}/join/{officialServer.vanityCode}</div><button className="primary" onClick={() => openServer(officialServer)}>Open official</button></div>
        </section>
      )}
    </div>
  );
}

function ActionMenu({ open, canUseServer }: { open: (modal: Modal) => void; canUseServer: boolean }) {
  return <div className="context-menu">
    <button onClick={() => open('serverSettings')} disabled={!canUseServer}><Icon name="settings" /> Server</button>
    <button onClick={() => open('channel')} disabled={!canUseServer}><Icon name="hash" /> New channel</button>
    <button onClick={() => open('channelSettings')} disabled={!canUseServer}><Icon name="settings" /> Channel</button>
    <button onClick={() => open('invite')} disabled={!canUseServer}><Icon name="login" /> Invite</button>
    <button onClick={() => open('webhook')} disabled={!canUseServer}><Icon name="webhook" /> Webhook</button>
    <button onClick={() => open('friends')}><Icon name="user-plus" /> Friends</button>
    <button onClick={() => open('join')}><Icon name="door" /> Join</button>
  </div>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="secondary icon-close" onClick={close}>×</button></div>{children}</div></div>;
}

function ServerForm({ submit }: { submit: (form: FormData) => void | Promise<void> }) {
  return <form onSubmit={(e) => { e.preventDefault(); void submit(new FormData(e.currentTarget)); }}>
    <label className="field"><span>Name</span><input className="input" name="name" minLength={2} maxLength={40} required /></label>
    <label className="field"><span>Description</span><textarea className="textarea" name="description" maxLength={180} /></label>
    <label className="field"><span>Server icon</span><input className="input" name="icon" type="file" accept={IMAGE_ACCEPT} /></label>
    <button className="primary">Create</button>
  </form>;
}

function ServerSettingsForm({ server, submit }: { server: Server; submit: (form: FormData) => void | Promise<void> }) {
  return <form onSubmit={(e) => { e.preventDefault(); void submit(new FormData(e.currentTarget)); }}>
    <label className="field"><span>Name</span><input className="input" name="name" defaultValue={server.name} minLength={2} maxLength={40} required /></label>
    <label className="field"><span>Description</span><textarea className="textarea" name="description" defaultValue={server.description} maxLength={180} /></label>
    <label className="field"><span>Vanity invite</span><input className="input" name="vanityCode" defaultValue={server.vanityCode} minLength={2} maxLength={64} /></label>
    <label className="field"><span>Replace icon</span><input className="input" name="icon" type="file" accept={IMAGE_ACCEPT} /></label>
    <label className="toggle-row"><span>Allow public joins</span><input type="checkbox" name="publicJoin" defaultChecked={Boolean(server.publicJoin)} /></label>
    <button className="primary">Save server</button>
  </form>;
}

function ChannelForm({ submit }: { submit: (body: Record<string, unknown>) => void }) {
  return <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit(Object.fromEntries(f.entries())); }}>
    <label className="field"><span>Name</span><input className="input" name="name" minLength={2} maxLength={32} required placeholder="announcements" /></label>
    <label className="field"><span>Description</span><input className="input" name="description" maxLength={140} placeholder="Optional channel context" /></label>
    <button className="primary">Create channel</button>
  </form>;
}

function ChannelSettingsForm({ channel, submit }: { channel: Channel; submit: (body: Record<string, unknown>) => void }) {
  return <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); submit(Object.fromEntries(f.entries())); }}>
    <label className="field"><span>Name</span><input className="input" name="name" minLength={2} maxLength={32} required defaultValue={channel.name} /></label>
    <label className="field"><span>Description below top bar</span><input className="input" name="description" maxLength={140} defaultValue={channel.description} placeholder="Empty by default" /></label>
    <button className="primary">Save channel</button>
  </form>;
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
  return <div className="panel-scroll modal-scroll"><div className="card embedded"><h3>Friend invite</h3><button className="primary" onClick={async () => { const data = await post('/api/friend-invites', {}) as { invite?: { code?: string } } | null; if (data?.invite?.code) setLink(`${appUrl}/api/friend-invites/${data.invite.code}/use`); }}>Generate add link</button>{link && <><br /><br /><div className="copy-box">POST {link}</div></>}</div><div className="card embedded"><h3>Friends</h3>{friends.map((friend) => <div className="member" key={friend.id}><Avatar user={friend} /><div><div className="member-name" style={nameStyle(friend.font, friend.nameColor)}>{friend.displayName}</div><div className="member-role">{friend.status} · {friend.direction}</div></div>{friend.status === 'pending' && friend.direction === 'incoming' && <button className="secondary" onClick={() => post('/api/friends/accept', { friendId: friend.id })}>Accept</button>}</div>)}{!friends.length && <div className="empty compact">No friends yet.</div>}</div></div>;
}

function EditHistoryPanel({ message, entries }: { message: Message; entries: EditHistory[] }) {
  return <div className="edit-history">
    <div className="copy-box">Current: {message.content}</div>
    {!entries.length && <div className="empty compact">No edit history.</div>}
    {entries.map((entry) => <div className="history-entry" key={entry.id}>
      <div className="message-meta"><span className="message-name">{entry.displayName}</span><span className="message-time">{new Date(entry.createdAt).toLocaleString()}</span></div>
      <div className="history-label">Before</div>
      <div className="history-content">{entry.previousContent}</div>
      <div className="history-label">After</div>
      <div className="history-content">{entry.newContent}</div>
    </div>)}
  </div>;
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
      try {
        avatar.set('avatar', await compressImageFile(image, 512, 0.82));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Avatar compression failed');
        return;
      }
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
    <div className="mini-grid"><label className="field"><span>Name color</span><input className="input" name="nameColor" defaultValue={user.nameColor} /></label><label className="field"><span>Font</span><select className="select font-select" name="font" defaultValue={user.font}>{FONT_OPTIONS.map((font) => <option key={font} value={font} style={nameStyle(font, user.nameColor)}>{font}</option>)}</select></label></div>
    <label className="field"><span>User-wide theme</span><select className="select" name="theme" defaultValue={user.theme}><option value="obsidian">Obsidian</option><option value="neon">Neon</option><option value="ember">Ember</option><option value="forest">Forest</option><option value="mono">Mono</option><option value="aurora">Aurora</option></select></label>
    <div className="field"><span>Premade avatar</span><div className="avatar-picker">{premadeAvatars.map((avatar) => <button className={`avatar-choice ${selectedAvatar === avatar ? 'active' : ''}`} key={avatar} type="button" onClick={() => setSelectedAvatar(avatar)}><img src={avatar} alt="" /></button>)}</div></div>
    <input type="hidden" name="avatarPreset" value={selectedAvatar} />
    <label className="field"><span>Custom avatar</span><input className="input" name="avatar" type="file" accept={IMAGE_ACCEPT} /></label>
    <label className="toggle-row"><span>Allow friend requests</span><input type="checkbox" name="allowFriendRequests" defaultChecked={user.allowFriendRequests} /></label>
    <label className="toggle-row"><span>Allow server invites</span><input type="checkbox" name="allowServerInvites" defaultChecked={user.allowServerInvites} /></label>
    <p className="error">{error}</p><button className="primary">Save profile</button>
  </form>;
}

function MemberRow({ member, inactive = false }: { member: Member; inactive?: boolean }) {
  return <div className={`member ${inactive ? 'inactive-member' : ''}`}><Avatar user={member} /><div><div className="member-name" style={nameStyle(member.font, member.nameColor)}>{member.nickname || member.displayName}</div><div className="member-role"><span className={`presence-dot ${inactive ? 'offline' : 'online'}`} /> {member.role}</div></div></div>;
}

function Avatar({ user, small = false }: { user: { id: string; avatarUrl: string; displayName: string }; small?: boolean }) {
  return <div className={`avatar ${small ? 'avatar-small' : ''}`}><img src={user.avatarUrl || defaultAvatarUrl(user.id)} alt="" /></div>;
}

function ServerIcon({ server }: { server: Server }) {
  if (server.iconUrl) return <img src={server.iconUrl} alt="" />;
  if (server.vanityCode === 'distopia') return <img src="/assets/brand/distopia-app-icon.webp" alt="" />;
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

function nameStyle(font: string, color: string): CSSProperties {
  const style: CSSProperties = { color, fontFamily: fontStack(font) };
  if (font === 'Neon Pulse') style.textShadow = `0 0 7px ${color}, 0 0 14px rgba(88,213,255,.55)`;
  if (font === 'Cyber Grid') { style.letterSpacing = '.055em'; style.textTransform = 'uppercase'; }
  if (font === 'Arcade') { style.letterSpacing = '.075em'; style.textTransform = 'uppercase'; }
  if (font === 'Street Bold') style.textTransform = 'uppercase';
  return style;
}

function fontStack(font: string): string {
  if (font === 'JetBrains Mono') return '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  if (font === 'Neon Pulse') return '"Trebuchet MS", "Arial Black", system-ui, sans-serif';
  if (font === 'Cyber Grid') return '"Courier New", ui-monospace, monospace';
  if (font === 'Arcade') return 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
  if (font === 'Terminal') return '"Courier New", ui-monospace, monospace';
  if (font === 'Elegant Serif') return 'Georgia, "Times New Roman", serif';
  if (font === 'Street Bold') return 'Impact, Charcoal, sans-serif';
  if (font === 'Rounded Soft') return '"Trebuchet MS", Verdana, sans-serif';
  if (font === 'Georgia') return 'Georgia, serif';
  if (font === 'Trebuchet MS') return '"Trebuchet MS", sans-serif';
  if (font === 'Verdana') return 'Verdana, Geneva, sans-serif';
  if (font === 'Courier New') return '"Courier New", monospace';
  if (font === 'Impact') return 'Impact, Haettenschweiler, sans-serif';
  if (font === 'Comic Sans MS') return '"Comic Sans MS", "Comic Sans", cursive';
  if (font === 'Brush Script MT') return '"Brush Script MT", cursive';
  if (font === 'Times New Roman') return '"Times New Roman", Times, serif';
  return 'Inter, ui-sans-serif, system-ui, sans-serif';
}

function normalizeBootstrap(data: Bootstrap): Bootstrap {
  return { ...data, channels: data.channels.map(normalizeChannel), messages: normalizeMessages(data.messages) };
}

function normalizeChannel(channel: Channel): Channel {
  return { ...channel, description: channel.description || '' };
}

function normalizeMessages(messages: Message[]): Message[] {
  return messages.map(normalizeMessage);
}

function normalizeMessage(message: Message): Message {
  return { ...message, attachmentName: message.attachmentName || '', attachmentMime: message.attachmentMime || '', attachmentSize: Number(message.attachmentSize || 0), editedAt: message.editedAt || '', editHistoryCount: Number(message.editHistoryCount || 0) };
}

function mergeMessages(remote: Message[], local: Message[]): Message[] {
  const remoteIds = new Set(remote.map((message) => message.id));
  return [...remote, ...local.filter((message) => !remoteIds.has(message.id))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

async function compressImageFile(file: File, maxDimension: number, quality: number): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Image exceeds 8 MB limit');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  bitmap.close();
  if (!blob || blob.size <= 0 || blob.size > file.size) return file;
  return new File([blob], replaceExtension(file.name, '.webp'), { type: 'image/webp', lastModified: Date.now() });
}

function replaceExtension(name: string, ext: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._ -]/g, '').trim() || 'upload';
  return clean.replace(/\.[^.]+$/, '') + ext;
}

function formatFileSize(size: number): string {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
