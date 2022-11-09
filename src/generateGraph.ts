import { Nodes, Edges, Layouts, defineConfigs } from 'v-network-graph'

const getNodes = (proposals: any, latestProposal: any, limit?: number) => {
  const result: Nodes = {}

  const totalNodes = limit ?? 100

  for (const blockHash of Object.keys(proposals)) {
    const proposal = proposals[blockHash]
    try {
      if (proposal.proposalNum > latestProposal.proposalNum - totalNodes) {
        result[blockHash] = {
          name: proposal.proposalNum.toString(),
          proposedAt: proposal.proposedAt,
          proposeTx: proposal.proposalTx,
          hash: proposal.hash,
          parentBlockHash: proposal.header.parentBlock,
          finalized: proposal.finalized
        }
      }
    } catch(error) {
      console.error(`generateGraph:getNodes error: ${error}`)
    }
  }

  return result
}

const getEdges = (proposals: any, latestProposal: any, limit?: number) => {
  const result: Edges = {}

  const totalNodes = limit ?? 100

  for (const blockHash of Object.keys(proposals)) {
    const proposal = proposals[blockHash]
    if (proposal.proposalNum > latestProposal.proposalNum - totalNodes) {
      result[blockHash] = { source: proposal.header.parentBlock, target: blockHash }
    }
  }

  return result
}

const getLayouts = (proposals: any, boundraies:any, limit?: number) => {
  const { latestProposal, oldestProposal, childBlockHashes } = boundraies
  const result: Layouts = { nodes: {} }

  let nextHash: string[] = [...latestProposal.proposalHashes]

  // calculate block height from latest Proposal
  // iterate from top to bottom
  let fromLatestBlock = 0
  const blockHeight: { [parentHash: string]: number } = {}
  const totalNodes = limit ?? 100

  while (nextHash.length > 0) {
    const blockHash = nextHash.pop()
    if (blockHash) {
      try {
        const proposal = proposals[blockHash]
        const parentHash = proposal.header.parentBlock
        if (proposal && !blockHeight[parentHash] && proposal.proposalNum > latestProposal.proposalNum - totalNodes) {
          blockHeight[parentHash] = fromLatestBlock
          fromLatestBlock++
          nextHash.push(parentHash) // add next queue
        }
      } catch (error) {
        console.log(`All searched`)
        break
      }
    } else {
      break
    }
  }

  // find blocks, include uncles, and update all to result
  // iterate from bottom to top
  nextHash = [...oldestProposal.proposalHashes]

  const blocksByHeight: any = {}
  const totalHeight = Object.keys(blockHeight).length

  while (nextHash.length != 0) {
    const blockHash = nextHash.pop()

    if (blockHash && blockHeight[blockHash]) {
      const fromTop = blockHeight[blockHash]
      const childHashes = childBlockHashes[blockHash as keyof typeof childBlockHashes]
      blocksByHeight[totalHeight - fromTop] = childHashes
      nextHash = [...nextHash, ...childHashes]
    }
  }

  for (const parentBlockHash of Object.keys(childBlockHashes)) {
    const childBlocks = childBlockHashes[parentBlockHash as keyof typeof childBlockHashes]
    const fromTop = blockHeight[parentBlockHash]
    const height = totalHeight - fromTop
    childBlocks.forEach((blockHash: string, index: number) => {
      const proposal = proposals[blockHash]
      if (proposal.proposalNum > latestProposal.proposalNum - totalNodes)
        result.nodes[blockHash] = { x: 180 * (height - 1), y: 80 * index }
    })
  }

  return result
}

const configs = defineConfigs({
  node: {
    normal: {
      strokeWidth: node => node.finalized ? 3 : 0,
      strokeColor: node => node.finalized ? "#000000" : "#4466cc"
    },
    label: {
      visible: true,
      fontFamily: undefined,
      fontSize: 11,
      lineHeight: 1.1,
      color: '#000000',
      margin: 4,
      direction: 'south',
      text: 'name',
    },
  },
})

export default {
  getNodes,
  getEdges,
  getLayouts,
  configs,
}
