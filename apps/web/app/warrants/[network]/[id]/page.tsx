import { notFound } from 'next/navigation'
import { WarrantDetail } from '@/components/warrant-detail'
import type { NetworkKey } from '@/lib/networks'

const VALID_NETWORKS: NetworkKey[] = ['mainnet', 'testnet']

export default function WarrantDetailPage({ params }: { params: { network: string; id: string } }) {
  if (!VALID_NETWORKS.includes(params.network as NetworkKey)) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <WarrantDetail networkKey={params.network as NetworkKey} id={params.id} />
    </div>
  )
}
