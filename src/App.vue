<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DrawNetwork from './components/DrawNetwork'

const coordinatorUrl = ref('https://node2.zkopru.network/')
const coordinatorData = ref<any>()
const latestBlockNumber = ref<number | null>()

const getBlockData = async (index?: number) => {
  const res = await fetch(coordinatorUrl.value, {
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
      proposals[data.hash] = {
        ...data,
        proposalNum,
        canonicalNum,
        proposedAt,
        finalized,
      }
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

const fetchData = async (url?: string) => {
  const latestBlock = await getBlockData()
  const latestProposalNum = parseInt(latestBlock.proposalNum, 16)
  const startBlockNumber = latestProposalNum - 100

  const requestData = []
  for (let i = startBlockNumber - 1; i < latestProposalNum + 1; i++) {
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
      childBlockHashes: parsedData.childBlockHashes,
    },
  }
  coordinatorData.value = blockData
  return coordinatorData
}

const fetchDataFromUrl = async () => {
  coordinatorData.value = null
  latestBlockNumber.value = null
  try {
    await fetchData()
  } catch (error) {
    latestBlockNumber.value = -1
    console.error(`Error while fetch data from ${coordinatorUrl}`)
  }
}

onMounted(async () => {
  await fetchData()
})
</script>

<template>
  <div class="header-container">
    <div class="header-text">
      <p>Zkopru Block Visualizer</p>
      <div class="header-text inner">
        <div class="node-pannel">
          <div style="padding-left: 10px; padding-right: 20px">
            <label for="search" class="hidden-visually"
              >Coordinator URL:
            </label>
            <input
              type="text"
              name="nodeUrl"
              id="nodeUrl"
              v-model="coordinatorUrl"
            />
            <button v-on:click="fetchDataFromUrl">Get Data</button>
          </div>
          <div style="padding-right: 10px">
            <p v-if="latestBlockNumber == null">Loading</p>
            <p v-else-if="latestBlockNumber == -1">Could not fetch data, Please check URL</p>
            <p v-else-if="latestBlockNumber >= 0">
              Current Block Count: {{ latestBlockNumber }}
            </p>
            <p v-else>Unknown</p>
          </div>
        </div>
        <p>Showing Latest 100 blocks of zkopru L2 on goerli testnet</p>
        <p
          style="
             {
              font-size: '12px';
            }
          "
        >
          Click node you can show transaction details on goerli etherscan
        </p>
      </div>
    </div>
  </div>
  <DrawNetwork v-if="coordinatorData" v-bind="coordinatorData" />
</template>

<style lang="css" scoped>
.header-container {
  padding: 12px;
  display: flex;
  flex-direction: row;
}
.header-text {
  font-size: 24px;
  color: #000;
  flex-direction: column;
}

.header-text.inner {
  font-size: 16px;
}

.node-pannel {
  border: 1px solid #000;
  vertical-align: center;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
</style>
