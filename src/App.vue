<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DrawNetwork from './components/DrawNetwork'

const latestBlockNumber = ref(0)
const coordinatorData = ref<any>()

const getBlockData = async (index?: number) => {
  const res = await fetch('https://node2.zkopru.network/', {
    method: 'post',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: Math.floor(Math.random() * 100000000),
      jsonrpc: '2.0',
      method: 'l2_getBlockByIndex',
      params: [index ? `0x${index.toString(16)}` : `latest`, false],
    }),
  })
  const resData = await res.json()
  return resData.result
}

const parseData = (blockData: any) => {
  const proposals: any = {}
  const childBlockHashes: any = {}

  let oldestProposal: any = {}
  let lowestBlockNumber = Infinity
  for (const data of blockData) {
    // proposal dict data
    const proposalNum = parseInt(data.proposalNum, 16)
    const canonicalNum = parseInt(data.canonicalNum, 16)
    try {
      const proposedAt = parseInt(data.proposedAt, 16)
      const finalized = data.finalized ? true : false
      proposals[data.hash] = { ...data, proposalNum, canonicalNum, proposedAt, finalized }
    } catch (error) {
      console.warn(`parseData:pasing error: ${error}`)
    }

    const parentBlockHash = data.header.parentBlock.toString()
    if (!childBlockHashes[parentBlockHash]) {
      childBlockHashes[parentBlockHash] = [data.hash]
    } else if (
      childBlockHashes[parentBlockHash] &&
      !childBlockHashes[parentBlockHash].includes(data.hash)
    ) {
      childBlockHashes[parentBlockHash].push(data.hash)
    }

    // update oldestProposal
    if (proposalNum == lowestBlockNumber)
      oldestProposal.proposalHashes.push(data.hash)
    if (proposalNum < lowestBlockNumber) {
      oldestProposal = {
        proposalNum,
        proposalHashes: [data.hash],
      }
      lowestBlockNumber = proposalNum
    }
  }

  return { proposals, oldestProposal, childBlockHashes }
}

onMounted(async () => {
  const latestBlock = await getBlockData()
  const latestProposalNum = parseInt(latestBlock.proposalNum, 16)
  const startBlockNumber = latestProposalNum - 100

  const requestData = []
  for (let i = startBlockNumber -1 ; i < latestProposalNum + 1; i++) {
    requestData.push(getBlockData(i))
  }

  const unparsedData = await Promise.all(requestData)
  const parsedData = parseData(unparsedData)

  // update latest block number at last
  latestBlockNumber.value = latestProposalNum
  const blockData = {
    proposals: parsedData.proposals,
    index: {
      latestProposal: {
        proposalNum: latestProposalNum,
        proposalHashes: [latestBlock.hash],
      },
      oldestProposal: parsedData.oldestProposal,
      childBlockHashes: parsedData.childBlockHashes
    },
  }
  coordinatorData.value = blockData
  return coordinatorData
})
</script>

<template>
  <div class="header-container">
    <div class="header-text">
      Zkopru Block Status
      <div class="header-text inner">
        <p>Current Block Count: {{ latestBlockNumber }}</p>
        <p>Showing Latest 100 blocks of zkopru L2 on goerli testnet</p>
        <p
          style="
             {
              font-size: '12px';
            }
          "
        >
          Click node you can show transaction details on etherscan
        </p>
      </div>
    </div>
  </div>
  <DrawNetwork v-if="coordinatorData" v-bind="coordinatorData" />
</template>

<style lang="css" scoped>
.header-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
}
</style>
