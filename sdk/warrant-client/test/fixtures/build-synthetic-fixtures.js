// Generates the synthetic (schema-faithful, not real) fixtures used for
// the AUTHORIZED_AND_SETTLED and AUTHORIZED_SETTLEMENT_UNCORRELATED test
// cases, since no real settlement transaction has occurred on testnet yet
// (see docs/m3-tracks.md / docs/compute-compatibility-finding.md for why).
// Run once with `node build-synthetic-fixtures.js` to regenerate the JSON
// files this directory ships; not part of the test run itself.
//
// The addresses used (Safe, WarrantModule, InferenceServing, both
// providers) are the real ones from M0-M3. Only the settlement
// transaction itself, and the ProviderTEESignerAcknowledged event, are
// synthetic — clearly labeled as such in each file's "_source" field.

const fs = require('fs')
const path = require('path')

const SAFE = '0x7F11f64A7d470D2B0a49cAc36837ffa49f8c63e9'
const INFERENCE_SERVING = '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E'
const ALLOWED_PROVIDER = '0x87a13337F0d4B2b08cce9189DBE9555690828ed4'
const OTHER_PROVIDER = '0xA02b95Aa6886b1116C4f334eDe00381511E31A09'
const TEE_SETTLEMENT_RESULT_TOPIC = '0x1f69e5b87fd0ce34b3760ba6e5d8aa95a36e316c3ba44e1e65a9d0eb9e96d0bf'
const PROVIDER_TEE_SIGNER_ACK_TOPIC = '0x4909107c46469d21135443e891c6ecae55b5baa31b338d50f391935308b08f89'

function padLeft(hex, len = 64) {
  return hex.replace(/^0x/, '').padStart(len, '0')
}
function addressTopic(addr) {
  return '0x' + padLeft(addr.toLowerCase())
}
function uintWord(n) {
  return padLeft(BigInt(n).toString(16))
}

// The exact settleFeesWithTEE((address,address,uint256,bytes32,uint256,bytes)[])
// calldata for two items — generated with `cast calldata` against the real
// function signature and verified by round-tripping through
// decodeSettleFeesWithTEECalldata (see src/abiCodec.js) before being
// hardcoded here.
const SETTLED_CALLDATA =
  '0x8be7411900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001400000000000000000000000007f11f64a7d470d2b0a49cac36837ffa49f8c63e900000000000000000000000087a13337f0d4b2b08cce9189dbe9555690828ed4000000000000000000000000000000000000000000000000002386f26fc100001111111111111111111111111111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000212340000000000000000000000000000000000000000000000000000000000000000000000000000000000007f11f64a7d470d2b0a49cac36837ffa49f8c63e9000000000000000000000000a02b95aa6886b1116c4f334ede00381511e31a0900000000000000000000000000000000000000000000000000470de4df8200002222222222222222222222222222222222222222222222222222222222222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000025678000000000000000000000000000000000000000000000000000000000000'

// --- AUTHORIZED_AND_SETTLED: 2-item batch, item 0 is our (safe, allowedProvider) ---
{
  const settlementTxHash = '0x' + 'be77' + '00'.repeat(30) + '0001'
  const receipt = {
    status: '0x1',
    blockNumber: '0x3200000',
    logs: [
      {
        address: INFERENCE_SERVING,
        topics: [TEE_SETTLEMENT_RESULT_TOPIC, addressTopic(SAFE)],
        data: '0x' + uintWord(0) + uintWord(0), // status=0, unsettledAmount=0 (fully settled)
        logIndex: '0x0',
        transactionHash: settlementTxHash,
        blockNumber: '0x3200000',
      },
      {
        address: INFERENCE_SERVING,
        topics: [TEE_SETTLEMENT_RESULT_TOPIC, addressTopic(SAFE)],
        data: '0x' + uintWord(0) + uintWord(0),
        logIndex: '0x1',
        transactionHash: settlementTxHash,
        blockNumber: '0x3200000',
      },
    ],
  }
  const tx = { hash: settlementTxHash, input: SETTLED_CALLDATA, blockNumber: '0x3200000' }
  const ackLog = {
    address: INFERENCE_SERVING,
    topics: [PROVIDER_TEE_SIGNER_ACK_TOPIC, addressTopic(ALLOWED_PROVIDER), addressTopic('0x9999999999999999999999999999999999999999')],
    data: '0x' + uintWord(1), // acknowledged = true
    logIndex: '0x0',
    blockNumber: '0x3100000',
    transactionHash: '0x' + 'ac0000000000000000000000000000000000000000000000000000000000',
  }

  fs.writeFileSync(
    path.join(__dirname, 'settled-synthetic.json'),
    JSON.stringify(
      {
        _source:
          'SYNTHETIC — no real settlement transaction exists on testnet yet (Track B stopped at a provider funding requirement before reaching settlement; see docs/m3-tracks.md). Addresses are real (Safe, InferenceServing, both providers from M0-M3); the settlement tx, receipt, and acknowledgment event are constructed, using the real settleFeesWithTEE calldata ABI shape verified via cast in M4.',
        settlementTxHash,
        receipt,
        tx,
        teeSignerAcknowledgedLog: ackLog,
        expectedTeeSignerAddress: '0x9999999999999999999999999999999999999999',
        expectedSettledAmount: '10000000000000000',
      },
      null,
      2
    )
  )
}

// --- AUTHORIZED_SETTLEMENT_UNCORRELATED: settlement for the safe exists, but only for a different provider ---
{
  // Single-item settleFeesWithTEE calldata for (safe, otherProvider) — also
  // generated with `cast calldata` and verified by round-tripping through
  // decodeSettleFeesWithTEECalldata before being hardcoded here.
  const UNCORRELATED_CALLDATA =
    '0x8be741190000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000007f11f64a7d470d2b0a49cac36837ffa49f8c63e9000000000000000000000000a02b95aa6886b1116c4f334ede00381511e31a0900000000000000000000000000000000000000000000000000470de4df8200002222222222222222222222222222222222222222222222222222222222222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000025678000000000000000000000000000000000000000000000000000000000000'

  const settlementTxHash = '0x' + 'be77' + '00'.repeat(30) + '0002'
  const receipt = {
    status: '0x1',
    blockNumber: '0x3200001',
    logs: [
      {
        address: INFERENCE_SERVING,
        topics: [TEE_SETTLEMENT_RESULT_TOPIC, addressTopic(SAFE)],
        data: '0x' + uintWord(0) + uintWord(0),
        logIndex: '0x0',
        transactionHash: settlementTxHash,
        blockNumber: '0x3200001',
      },
    ],
  }
  const tx = { hash: settlementTxHash, input: UNCORRELATED_CALLDATA, blockNumber: '0x3200001' }

  fs.writeFileSync(
    path.join(__dirname, 'uncorrelated-synthetic.json'),
    JSON.stringify(
      {
        _source:
          'SYNTHETIC — constructs the case where the Safe has a real-shaped settlement event, but it settles a different provider than the one being reconciled, so it must not be reported as a match for our provider.',
        settlementTxHash,
        receipt,
        tx,
      },
      null,
      2
    )
  )
}

console.log('Wrote settled-synthetic.json and uncorrelated-synthetic.json')
