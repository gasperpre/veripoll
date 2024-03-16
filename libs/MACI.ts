import { Contract } from 'ethers'
import { Command, Keypair, PubKey } from 'maci-domainobjs'
import { genRandomSalt } from 'maci-crypto'
import { MACI_COORDINATOR_PUBKEY } from './constants'

export async function calcVotingDeadline(maci: Contract): Promise<number> {
  try {
    const tx = await maci.calcVotingDeadline()
    return parseInt(tx)
  } catch (err) {
    console.error(`Couldn't connect to MACI`, err)
    return 0
  }
}

export async function signUp(
  maci: Contract,
  keypair: Keypair,
  data: string
): Promise<{ userStateIndex: number; voiceCredits: number }> {
  try {
    const tx = await maci.signUp(
      keypair.pubKey.asContractParam(),
      data,
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    )
    
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      alert("The transaction failed");
    }

    if (!receipt?.logs) {
      throw Error("Unable to retrieve the transaction receipt");
    }
    // get state index from the event
    const [log] = receipt.logs;
    const { args } = maci.interface.parseLog(log as unknown as { topics: string[]; data: string }) || { args: [] };
    const userStateIndex = parseInt(args[0]);
    const voiceCredits = parseInt(args[3]);
    return { userStateIndex, voiceCredits }
  } catch (err: any) {
    alert(err?.data?.message || err?.message)
    throw err
  }
}

export async function publish(
  maci: Contract,
  keypair: Keypair,
  stateIndex: BigInt,
  voteOptionIndex: BigInt,
  voteWeight: BigInt,
  nonce: BigInt
): Promise<any> {
  // READ https://github.com/appliedzkp/maci/blob/master/contracts/ts/__tests__/PublishMessage.test.ts#L83
  const coordinatorPubKey = PubKey.unserialize(MACI_COORDINATOR_PUBKEY)
  const command = new Command(stateIndex, keypair.pubKey, voteOptionIndex, voteWeight, nonce, genRandomSalt())
  const signature = command.sign(keypair.privKey)
  const sharedKey = Keypair.genEcdhSharedKey(keypair.privKey, coordinatorPubKey)
  const message = command.encrypt(signature, sharedKey)
  try {
    const tx = await maci.publishMessage(message.asContractParam(), keypair.pubKey.asContractParam())
    const receipt = await tx.wait()
    return receipt
  } catch (err: any) {
    alert(err?.data?.message || err?.message)
    throw new Error(err)
  }
}

export async function changeKey(maci: Contract, keypair: Keypair, stateIndex: BigInt, nonce: BigInt): Promise<any> {
  const receipt = await publish(maci, keypair, stateIndex, BigInt(0), BigInt(0), nonce)
  return receipt
}
