import React from 'react'
import globalHook from 'use-global-hook'
import web3state from './web3state'

import { signUp as MaciSignUp, publish as MaciPublish } from 'libs/MACI'
import { Keypair, PrivKey } from 'maci-domainobjs'
import { TallyResult } from '../../types/tally'
import { ImageObj } from '../../types/api-responses'

let images: Array<ImageObj>

const initialState = {
  ...web3state.initialState,
  loading: true,
  images: [],
  canvas: {},
  boxes: [],
  cart: [],
  committedVotes: (() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('committedVotes') as string) || []
      } catch (err) {
        return []
      }
    }
    return []
  })(),
  balance: (() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('voiceCredits') as string) || 120
    }
  })(),
  selected: null,
  voteRootValue: 1,
  voteSquare: 1,
  bribeMode: false,
  signedUp: (() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('userStateIndex')) || false
    }
  })(),
  initialKeyChangePerformed: (() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('initialKeyChangePerformed')) || false
    }
  })(),
  userStateIndex: (() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('userStateIndex') as string) || null
    }
  })(),
  keyPair: (() => {
    if (typeof window !== 'undefined') {
      const macisk = localStorage.getItem('macisk')
      if (macisk == null) {
        const keyPair = new Keypair()
        localStorage.setItem('macisk', keyPair.privKey.serialize())
        console.log('MACI key generated', keyPair.pubKey.serialize())
        return keyPair
      } else {
        const keyPair = new Keypair(PrivKey.deserialize(macisk))
        console.log('MACI key loaded', keyPair.pubKey.serialize())
        return keyPair
      }
    }
  })(),
}

const actions = {
  ...web3state.actions,
  signUp: async (store: any, data: string) => {
    const { chainId } = await store.state.ethersProvider.getNetwork()
    if (chainId === 1) return alert(`Sorry, we are not on mainnet yet. Try other networks.`)
    store.setState({ loading: true })
    const { maci, keyPair } = store.state
    try {
      const { userStateIndex, voiceCredits } = await MaciSignUp(maci, keyPair, data);
      localStorage.setItem('userStateIndex', String(userStateIndex))
      localStorage.setItem('voiceCredits', String(voiceCredits))
      store.setState({ signedUp: true, balance: voiceCredits, userStateIndex })
    } catch (err) {
      console.log(err)
    }
    store.setState({ loading: false })
  },
  changeKey: async ({ state, ...store }: any) => {
    store.setState({ loading: true })
    const keyPair = new Keypair()
    try {
      await MaciPublish(
        state.ethersProvider.getSigner(),
        state.maci,
        state.keyPair,
        BigInt(state.userStateIndex),
        BigInt(0),
        BigInt(0),
        BigInt(1)
      )
      store.setState({ keyPair: keyPair })
      localStorage.setItem('macisk', keyPair.privKey.serialize())
      localStorage.setItem('initialKeyChangePerformed', String(true))
      store.setState({ initialKeyChangePerformed: true })
    } catch (err) {
      console.error('Error while performing initial key-change', err)
    } finally {
      store.setState({ loading: false })
    }
  },
  selectImage: (store: any, value: number) => {
    store.setState({ selected: value })
  },
  incVote: (store: any) => {
    const voteRootValue = store.state.voteRootValue + 1
    const voteSquare = Math.pow(voteRootValue, 2)
    if (store.state.balance - voteSquare < 0) return
    store.setState({ voteRootValue, voteSquare })
  },
  decVote: (store: any) => {
    if (store.state.voteRootValue <= 1) return
    const voteRootValue = store.state.voteRootValue - 1
    const voteSquare = Math.pow(voteRootValue, 2)
    store.setState({ voteRootValue, voteSquare })
  },
  addToCart: (store: any) => {
    let { cart, selected, voteRootValue, voteSquare } = store.state
    cart.push({ type: 'vote', imageId: selected, voteRootValue, voteSquare })
    store.setState({
      cart: cart,
      selected: null,
      balance: store.state.balance - store.state.voteSquare,
      voteRootValue: 1,
      voteSquare: 1,
    })
  },
  addChangeKeyToCart: async ({ state, ...store }: any) => {
    const keyPair = new Keypair()
    let { cart } = state
    cart.push({ type: 'keychange', keyPair, voteOptionIndex: 0, voteWeight: 0 })
    store.setState({ cart })
  },
  removeFromCart: (store: any, value: number) => {
    let { cart } = store.state
    const [{ voteSquare }] = cart.splice(value, 1)
    store.setState({ cart, balance: store.state.balance + (voteSquare || 0) })
  },
  vote: async ({ state, ...store }: any) => {
    if (state.loading) return
    const { chainId } = await state.ethersProvider.getNetwork()
    if (chainId === 1) return alert(`Sorry, we are not on mainnet yet. Try other networks.`)
    store.setState({ loading: true })
    const { maci, userStateIndex, cart, committedVotes } = state
    const _cart = cart.slice().reverse()
    for (const [index, item] of _cart.reverse().entries()) {
      item.nonce = _cart.length - index
      const { type, imageId: voteOptionIndex, voteRootValue: voteWeight, nonce } = item
      const keyPair = state.bribeMode ? new Keypair() : item.keyPair || state.keyPair
      try {
        const tx = await MaciPublish(
          state.ethersProvider.getSigner(),
          maci,
          keyPair,
          BigInt(userStateIndex),
          BigInt(voteOptionIndex || 0),
          BigInt(voteWeight || 0),
          BigInt(nonce)
        )
        item.tx = tx
        committedVotes.push(item)
        if (type === 'keychange') {
          localStorage.setItem('macisk', item.keyPair.privKey.serialize())
          store.setState({ keyPair: item.keyPair })
        }
      } catch (err) {
        console.error('MACI Command failed', err)
      }
    }
    /*
      There are several ways to cast an invalid vote:

      Use an invalid signature
      Use more voice credits than available
      Use an incorrect nonce
      Use an invalid state index
      Vote for a vote option that does not exist
    */
    committedVotes.forEach((item: any) => cart.splice(cart.indexOf(item), 1))
    localStorage.setItem(
      'committedVotes',
      JSON.stringify(
        committedVotes,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value) // return everything else unchanged
      )
    )
    localStorage.setItem('voiceCredits', state.balance)
    store.setState({ loading: false, committedVotes, cart })
  },

  toggleBribeMode: (store: any, value?: boolean) => {
    if (typeof value === 'undefined') {
      store.setState({ bribeMode: !store.state.bribeMode })
    } else {
      store.setState({ bribeMode: value })
    }
  },
  setLoading: (store: any, value: boolean) => {
    store.setState({ loading: value })
  },
  setTallyResult: (store: any, tallyResult: TallyResult) => {
    store.setState({ tallyResult })
  },
  fetchImages: async (store: any) => {
    const res = await fetch('/api/image')
    images = (await res.json()) as Array<ImageObj>
    store.setState({ images })
  },
  fetchConfig: async (store: any) => {
    const res = await fetch('/api/qdh-general-config')
    const config = await res.json()
    if (config.maciAddress) store.setState({ maciAddress: config.maciAddress })
    if (config.maciAddressKovan) store.setState({ maciAddressKovan: config.maciAddressKovan })
    if (config.tally && config.tally.url) {
      const filename = config.tally.url.split('/assets/')[1]
      const res = await fetch(`/api/tally/${filename}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const tallyResult = (await res.json()) as TallyResult
      store.actions.setTallyResult(tallyResult)
    }
  },
}

export default globalHook(React, initialState, actions)
