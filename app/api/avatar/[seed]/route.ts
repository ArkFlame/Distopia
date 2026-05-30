import { premadeAvatarUrl } from '@/lib/avatar';

export async function GET(_request: Request, ctx: { params: Promise<{ seed: string }> }) {
  const { seed } = await ctx.params;
  return Response.redirect(new URL(premadeAvatarUrl(seed || 'distopia'), _request.url), 302);
}
