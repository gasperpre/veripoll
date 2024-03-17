import { Contract, ethers } from 'ethers'
import { PCommand, Keypair, PubKey } from 'maci-domainobjs'
import { genRandomSalt } from 'maci-crypto'
import POLL_ABI from 'abi/Poll.abi.json'

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
  signer: any,
  maci: Contract,
  keypair: Keypair,
  stateIndex: bigint,
  voteOptionIndex: bigint,
  voteWeight: bigint,
  nonce: bigint
): Promise<any> {
  // READ https://github.com/appliedzkp/maci/blob/master/contracts/ts/__tests__/PublishMessage.test.ts#L83
  const command = new PCommand(stateIndex, keypair.pubKey, voteOptionIndex, voteWeight, nonce, BigInt(0), genRandomSalt())
  try {
    const pollAddress = await maci.getPoll(0);
    const poll = new ethers.Contract(pollAddress, POLL_ABI, signer)
    const coordinatorPubKeyResult = await poll.coordinatorPubKey();
    const coordinatorPubKey = new PubKey([
      BigInt(coordinatorPubKeyResult.x.toString()),
      BigInt(coordinatorPubKeyResult.y.toString()),
    ]);
    // sign the command with the user private key
    const signature = command.sign(keypair.privKey);
    // encrypt the command using a shared key between the user and the coordinator
    const message = command.encrypt(signature, Keypair.genEcdhSharedKey(keypair.privKey, coordinatorPubKey));
    const tx = await poll.publishMessage(message.asContractParam(), keypair.pubKey.asContractParam())
    const receipt = await tx.wait()
    return receipt
  } catch (err: any) {
    console.error(err);
    // alert(err?.data?.message || err?.message)
    throw new Error(err)
  }
}