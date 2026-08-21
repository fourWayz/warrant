// Event topic0 hashes and function selectors this library decodes.
// Every value here was computed with `cast sig-event` / `cast sig` against
// the exact signatures in the deployed contracts (see contracts/src and
// the M0 record of 0G's real ABIs), then independently confirmed against
// real transaction logs and a real eth_call on 0G Galileo before being
// hardcoded — see docs/m4-reconciliation.md for the verification record.
// None of these were assumed from documentation.

const TOPICS = {
  // WarrantModule.TransferExecuted(address indexed executor, uint256 indexed warrantId, address indexed provider, string serviceName, uint256 amount)
  TRANSFER_EXECUTED: '0x0425e19fb2c0206dac5e56431bff70d1977603f5a3b7691fff6465870874d8c9',
  // WarrantRegistry.SpendRecorded(uint256 indexed warrantId, address indexed provider, string serviceName, uint256 amount, uint256 newSpentAmount, address spender)
  SPEND_RECORDED: '0x8557e706a2604920705dfa51684a9d80ad704c72a87ebe42076d0846c3c30281',
  // InferenceServing.BalanceUpdated(address indexed user, address indexed provider, uint256 amount, uint256 pendingRefund)
  // Confirmed firing on the funding path (M3 Track A). Whether it also
  // fires on settlement has not been independently observed — see
  // docs/m4-reconciliation.md "Open ambiguity" section. Not relied on for
  // settlement correlation for that reason.
  BALANCE_UPDATED: '0x526824944047da5b81071fb6349412005c5da81380b336103fbe5dd34556c776',
  // InferenceServing.TEESettlementResult(address indexed user, uint8 status, uint256 unsettledAmount)
  TEE_SETTLEMENT_RESULT: '0x1f69e5b87fd0ce34b3760ba6e5d8aa95a36e316c3ba44e1e65a9d0eb9e96d0bf',
  // InferenceServing.ProviderTEESignerAcknowledged(address indexed provider, address indexed teeSignerAddress, bool acknowledged)
  PROVIDER_TEE_SIGNER_ACKNOWLEDGED: '0x4909107c46469d21135443e891c6ecae55b5baa31b338d50f391935308b08f89',
}

const SELECTORS = {
  // InferenceServing.settleFeesWithTEE((address,address,uint256,bytes32,uint256,bytes)[])
  SETTLE_FEES_WITH_TEE: '0x8be74119',
  // WarrantModule.safe() — auto-generated public getter for the immutable `safe` field
  SAFE_GETTER: '0x186f0354',
}

module.exports = { TOPICS, SELECTORS }
