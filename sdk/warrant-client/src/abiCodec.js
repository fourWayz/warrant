// Minimal, hand-written ABI decoding for the exact shapes this library
// needs. Deliberately not a general-purpose ABI decoder — every function
// here decodes one known, fixed layout, so there is no ambiguity about
// what "should" be there. Zero dependencies by design: the reconciliation
// core must never require trusting a third-party decoding library any more
// than it trusts the RPC node itself.

/** Strips a leading "0x" if present. */
function strip0x(hex) {
  return hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
}

/** Reads the 32-byte word at `wordIndex` (0-based) from a hex string with no 0x prefix. */
function readWord(dataHex, wordIndex) {
  const start = wordIndex * 64
  return dataHex.slice(start, start + 64)
}

function wordToAddress(word) {
  return '0x' + word.slice(24).toLowerCase()
}

function wordToBigInt(word) {
  return BigInt('0x' + (word === '' ? '0' : word))
}

function wordToBool(word) {
  return wordToBigInt(word) !== 0n
}

function wordToBytes32(word) {
  return '0x' + word
}

/**
 * Decodes a `string` or `bytes` value stored at a byte offset (relative to
 * the start of `dataHex`) per standard ABI dynamic-type encoding: a length
 * word followed by the raw bytes, right-padded to a multiple of 32.
 */
function decodeDynamicBytesAt(dataHex, byteOffset) {
  const wordIndex = byteOffset / 32
  const lengthWord = readWord(dataHex, wordIndex)
  const length = Number(wordToBigInt(lengthWord))
  const dataStart = (wordIndex + 1) * 64
  const hex = dataHex.slice(dataStart, dataStart + length * 2)
  return '0x' + hex
}

function decodeDynamicStringAt(dataHex, byteOffset) {
  const bytesHex = decodeDynamicBytesAt(dataHex, byteOffset)
  return Buffer.from(strip0x(bytesHex), 'hex').toString('utf8')
}

/**
 * Decodes the calldata for
 * `settleFeesWithTEE((address,address,uint256,bytes32,uint256,bytes)[])`
 * into an array of { user, provider, totalFee, requestsHash, nonce, signature }.
 *
 * This is the one non-trivial decode in this library: an array of a struct
 * that itself contains a dynamic field (`bytes signature`), so each element
 * is dynamically encoded. Verified against `cast calldata` output for this
 * exact function signature during development — see
 * test/abiCodec.test.js for the fixture this was checked against.
 */
function decodeSettleFeesWithTEECalldata(calldataHex) {
  const hex = strip0x(calldataHex)
  const selector = hex.slice(0, 8)
  const data = hex.slice(8) // everything after the 4-byte selector

  const arrayOffsetBytes = Number(wordToBigInt(readWord(data, 0)))
  const arrayLenWordIndex = arrayOffsetBytes / 32
  const length = Number(wordToBigInt(readWord(data, arrayLenWordIndex)))

  const elements = []
  const headStart = (arrayLenWordIndex + 1) * 64 // hex chars, right after the length word
  const elementsBase = arrayOffsetBytes + 32 // bytes; element offsets are relative to here

  for (let i = 0; i < length; i++) {
    const elementOffsetBytes = Number(wordToBigInt(data.slice(headStart + i * 64, headStart + i * 64 + 64)))
    const elementStartBytes = elementsBase + elementOffsetBytes
    const elementStartHex = elementStartBytes * 2

    const user = wordToAddress(data.slice(elementStartHex + 0 * 64, elementStartHex + 1 * 64))
    const provider = wordToAddress(data.slice(elementStartHex + 1 * 64, elementStartHex + 2 * 64))
    const totalFee = wordToBigInt(data.slice(elementStartHex + 2 * 64, elementStartHex + 3 * 64))
    const requestsHash = wordToBytes32(data.slice(elementStartHex + 3 * 64, elementStartHex + 4 * 64))
    const nonce = wordToBigInt(data.slice(elementStartHex + 4 * 64, elementStartHex + 5 * 64))
    const signatureOffsetBytes = Number(wordToBigInt(data.slice(elementStartHex + 5 * 64, elementStartHex + 6 * 64)))
    const signature = decodeDynamicBytesAt(data, elementStartBytes + signatureOffsetBytes)

    elements.push({ user, provider, totalFee, requestsHash, nonce, signature })
  }

  return { selector: '0x' + selector, settlements: elements }
}

module.exports = {
  strip0x,
  readWord,
  wordToAddress,
  wordToBigInt,
  wordToBool,
  wordToBytes32,
  decodeDynamicBytesAt,
  decodeDynamicStringAt,
  decodeSettleFeesWithTEECalldata,
}
