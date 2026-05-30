# Distopia Requirements Paper

## Product definition

Distopia is a self-contained web community platform inspired by modern realtime chat tools. It is not a Discord client and does not depend on Discord. The product category is server-based community chat with direct social graph features, privacy controls, moderation, uploads, and webhooks.

## Non-negotiable distinction from Discord

The app must avoid literal copying of Discord trade dress, logos, names, brand assets, and private behavior. Distopia may implement the general concepts of servers, channels, messages, friends, profiles, invites, and rich customization because those are generic community-platform patterns. The visual system must remain distinct: different logo, different token names, different palette, different copy, different icon language, different product terminology where practical.

## UX model

Distopia uses a four-zone app shell:

1. Space rail: compact vertical list of joined servers/spaces.
2. Room rail: channels, server actions, invites, and privacy controls.
3. Chat canvas: message history, moderation/rate status, composer, upload control.
4. People/identity rail: current user, friends, online-style member list, profile controls.

The app favors dense UI, small margins, compact controls, collapsible panels, icon-first buttons, and visible system feedback for rate limits/cooldowns.

## Core entities

User:
- username
- display name
- password hash
- avatar URL
- bio
- custom name color
- custom font
- selected theme
- verified flag placeholder
- allow friend requests
- allow server invites

Server:
- name
- description
- owner
- icon URL
- public join toggle
- vanity code
- theme

Channel:
- server
- name
- type
- position

Message:
- channel
- author
- text content
- optional attachment URL
- timestamp
- moderation state through rejection events

Friend edge:
- requester
- addressee
- status pending, accepted, or blocked

Invite:
- server invite with custom code, usage count, expiry placeholder
- friend invite with code

Webhook:
- tokenized incoming POST endpoint
- target server/channel
- display name
- enabled flag

## GET/POST paths

Public pages:
- GET `/`
- GET `/app`
- GET `/join/[code]`
- GET `/embed/server/[id]`

Auth:
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`

Identity:
- GET `/api/me`
- PATCH `/api/me`
- POST `/api/me/avatar`

Bootstrap:
- GET `/api/bootstrap`

Servers:
- GET `/api/servers`
- POST `/api/servers`
- PATCH `/api/servers/[serverId]`
- POST `/api/servers/[serverId]/join`
- POST `/api/servers/[serverId]/invites`
- GET `/api/servers/[serverId]/invites`

Channels/messages:
- GET `/api/servers/[serverId]/channels`
- POST `/api/servers/[serverId]/channels`
- GET `/api/channels/[channelId]/messages`
- POST `/api/channels/[channelId]/messages`

Friends:
- GET `/api/friends`
- POST `/api/friends/request`
- POST `/api/friends/accept`
- POST `/api/friend-invites`
- POST `/api/friend-invites/[code]/use`

Webhooks:
- GET `/api/webhooks`
- POST `/api/webhooks`
- POST `/api/webhooks/[token]`

Runtime status:
- GET `/api/limits`

## Moderation

First version blocks obvious low-value abuse:
- per-IP and per-user rate limits
- message burst limits
- repeated-message spam detection
- upload size limit
- image MIME allowlist
- content length limit
- blocked phrase list
- webhook rate limits

Rejected actions return structured JSON with cooldown and reason so the UI can show the exact wait state.

## Anti-DDoS boundary

Application-level rate limits reduce abuse cost but do not replace infrastructure-level DDoS protection. Public deployment must run behind a reverse proxy, CDN/WAF, TLS, request body limits, and process supervision.

## MVP exclusions

Not implemented in this first artifact:
- WebSocket realtime transport
- voice/video
- email verification
- password reset
- OAuth
- end-to-end encryption
- mobile native app
- push notifications
- federation
- full admin audit panel

These are future implementation points, not hidden incomplete UI promises.
