import { VerifyPanel } from '@/components/verify-panel'

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Verify Warrant authorization independently.</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Reads a real Warrant-authorized transfer and determines whether it was ever followed by a native 0G
          settlement — for the same (Safe, provider) pair. This runs the project&apos;s own read-only reconciliation
          library, live, against the RPC endpoint you point it at. It cannot move funds or alter policy.
        </p>
      </div>
      <VerifyPanel />
    </div>
  )
}
