import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const BOUNDARIES = [
  {
    title: 'Warrant controls authorization, not native settlement',
    detail:
      'Warrant decides whether a transfer toward a provider is allowed. Once funds land in InferenceServing, native settleFeesWithTEE runs entirely outside Warrant’s reach — provider-triggered, unmodified.',
  },
  {
    title: 'Safe-based Compute inference authentication is currently incompatible',
    detail:
      '0G Compute’s session flow recovers an ECDSA signer from a raw signature; a Safe has no private key to produce one. Confirmed by reading the provider and SDK source directly — not a bug in Warrant, an ecosystem integration boundary.',
  },
  {
    title: 'No real mainnet funding transaction has been executed',
    detail:
      'Mainnet’s own MIN_ACCOUNT_BALANCE (3 A0GI) and MIN_TRANSFER_AMOUNT (1 A0GI) exceed the funded deployment wallet’s balance. The funding path is proven live on testnet instead — see the Galileo evidence above.',
  },
  {
    title: 'MockAgenticId is a test fixture, not a production Agentic ID',
    detail:
      'It anchors a warrant to a token owner for demonstration. It is not an ERC-7857 / Agentic ID integration — that remains explicitly out of scope for this submission.',
  },
]

export function BoundariesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Boundaries</CardTitle>
        <p className="text-xs text-ink-faint">Stated plainly, not apologized for — these are the protocol’s actual edges.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {BOUNDARIES.map((b) => (
          <div key={b.title} className="flex gap-3">
            <Info size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <div>
              <div className="text-sm font-medium text-ink">{b.title}</div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{b.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
