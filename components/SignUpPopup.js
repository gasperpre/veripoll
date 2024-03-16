import { useState, useEffect } from 'react'
import useGlobalState from 'hooks/useGlobalState'
import Modal from 'components/Modal'
import Button from 'components/Button'
import { IDKitWidget } from '@worldcoin/idkit'
import { ethers } from 'ethers'

export default function SignUpPopup() {
  const [{ loading, signedUp, address }, { signUp }] = useGlobalState()
  const [modalOpen, setModalOpen] = useState(signedUp === false)

  useEffect(() => {
    if (signedUp === false) {
      setModalOpen(true)
    }
  }, [signedUp])

  const onIDKitSuccess = res => {
    const { merkle_root, nullifier_hash, proof } = res
    const data = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'uint256', 'bytes'],
      [address, merkle_root, nullifier_hash, proof]
    )
    signUp(data)
  }

  if (signedUp === false) {
    return (
      <Modal
        isOpen={modalOpen}
        onOpenStateChange={state => setModalOpen(state)}
        title={`Let's sign you up!`}
        trigger={<span className='px-6 text-yellow-400 border-yellow-400 button'>Let's sign you up!</span>}>
        <p className='mt-5 text-sm leading-5 text-gray-900'>
          Signing up will allow you to <b>vote</b> and <b>nominate images</b>.
        </p>
        <Modal.Actions>
          <span className='flex w-full mt-3 sm:mt-0 sm:w-auto'>
            <Button onClick={setModalOpen.bind(false, this)}>Later</Button>
          </span>

          <IDKitWidget
            app_id={process.env.NEXT_PUBLIC_WORLD_ID} // must be an app set to on-chain in Developer Portal
            action='signup'
            signal={address}
            onSuccess={onIDKitSuccess}
            // use default verification_level (orb-only), as device credentials are not supported on-chain
          >
            {({ open }) => (
              <span className='flex self-end w-full mt-3 sm:mt-0 sm:w-auto'>
                <button
                  type='button'
                  onClick={open}
                  className='inline-flex justify-center w-full px-4 py-2 text-base font-medium leading-6 text-white transition duration-150 ease-in-out bg-green-600 border border-green-600 rounded-md shadow-sm hover:text-green-200 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue sm:text-sm sm:leading-5'>
                  {loading ? 'Loading…' : 'Sign up'}
                </button>
              </span>
            )}
          </IDKitWidget>
          {/* <span className='flex self-end w-full mt-3 sm:mt-0 sm:w-auto'>
            <button
              type='button'
              onClick={signUp}
              className='inline-flex justify-center w-full px-4 py-2 text-base font-medium leading-6 text-white transition duration-150 ease-in-out bg-green-600 border border-green-600 rounded-md shadow-sm hover:text-green-200 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue sm:text-sm sm:leading-5'>
              {loading ? 'Loading…' : 'Sign up'}
            </button>
          </span> */}
        </Modal.Actions>
      </Modal>
    )
  } else {
    return null
  }
}
