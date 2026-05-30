import { requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/http';
import { getOrCreateDirectConversation, listDirectConversations } from '@/lib/queries';
import { clampText } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ conversations: listDirectConversations(user.id) });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const peerId = clampText(body.peerId, 3, 120, 'peerId');
    const conversationId = getOrCreateDirectConversation(user.id, peerId);
    return ok({ conversationId, conversations: listDirectConversations(user.id) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Conversation failed');
  }
}
