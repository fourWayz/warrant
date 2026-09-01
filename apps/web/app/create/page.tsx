import { CreateWarrantFlow } from '@/components/create-warrant-flow'
import { Badge } from '@/components/ui/badge'

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <Badge variant="accent">0G Galileo testnet — real transactions</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Create a warrant</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          This submits two real transactions on 0G Galileo: minting a demonstration Agentic ID token to your wallet,
          then creating a warrant anchored to it. It is bound to this project&apos;s own reference WarrantModule for
          inspection — actually spending against it requires control of that module&apos;s Safe, which this demo does
          not grant. Requires testnet A0GI in your connected wallet.
        </p>
      </div>
      <CreateWarrantFlow />
    </div>
  )
}
