import { Check, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const INTEGRATED = [
  { name: '0G Chain', detail: 'WarrantRegistry + WarrantModule deployed on mainnet (16661) and Galileo (16602)' },
  { name: '0G Compute — LedgerManager', detail: 'The funding boundary Warrant enforces; transferFund is the one call it gates' },
  { name: '0G Compute — InferenceServing', detail: 'Provider funding target; source-level compatibility investigation; settlement reconciliation' },
]

const NOT_INTEGRATED = ['0G Storage', '0G DA', '0G Pay', 'Production Agentic ID / ERC-7857']

export function IntegrationPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>0G integration — depth over breadth</CardTitle>
        <p className="text-xs text-ink-faint">A real, audited, mainnet-verified boundary on two modules, not shallow coverage across five.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-allow">Integrated</div>
            <ul className="space-y-3">
              {INTEGRATED.map((i) => (
                <li key={i.name} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 shrink-0 text-allow" />
                  <div>
                    <div className="text-sm text-ink">{i.name}</div>
                    <div className="text-xs text-ink-faint">{i.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Not integrated</div>
            <ul className="space-y-2.5">
              {NOT_INTEGRATED.map((n) => (
                <li key={n} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <Minus size={15} className="shrink-0 text-ink-faint" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
