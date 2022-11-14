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
    } catch (error) {
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

const getLayouts = (proposals: any, boundraies: any, limit?: number) => {
  const { latestProposal, oldestProposal, childBlockHashes } = boundraies
  const result: Layouts = { nodes: {} }

  const totalNodes = limit ?? 100
  // Iterate proposals and make sequence map
  let blockSequence: { [canonicalNum: number]: [{ blockHash: string, proposedAt: number, finalized: boolean}] } = {}
  for (const proposalHash of Object.keys(proposals)) {
    // adding data to block sequence
    const blockHeight = proposals[proposalHash].canonicalNum
    const existSequence = blockSequence[blockHeight]
    const proposalData = {
      blockHash: proposalHash,
      proposedAt: proposals[proposalHash].proposedAt,
      finalized: proposals[proposalHash].finalized,
    }
    if (!existSequence) {
      blockSequence[blockHeight] = [proposalData]
    } else {
      blockSequence[blockHeight].push(proposalData)
    }

    let sortedSequence = blockSequence[blockHeight].sort(
      function(a, b) { return a['proposedAt'] - b['proposedAt'] }
    )

    blockSequence[blockHeight] = sortedSequence
  }

  // starting with oldest proposal's child hash
  let nextHash: string[] = []
  for (const childHash of oldestProposal.proposalHashes) {
    nextHash.push(childBlockHashes[childHash])
  }


  // for drawing blocks by height to set top.
  const lastCanonicalNum = proposals[latestProposal.proposalHashes[0]].canonicalNum

  while (nextHash.length > 0) {
    const targetBlockHash = nextHash.pop()

    if (targetBlockHash) {
      const proposal = proposals[targetBlockHash]
      const height = lastCanonicalNum - proposal.canonicalNum
      const childBlocks = childBlockHashes[targetBlockHash]
      if (!childBlocks) continue // if could not find child block, skip

      childBlocks.forEach((blockHash: string) => {
        const proposal = proposals[blockHash]
        if (proposal.proposalNum > latestProposal.proposalNum - totalNodes) {
          // find block position in blockSequence
          let index = 1
          for (const sequence of blockSequence[proposal.canonicalNum]) {
            if (sequence.blockHash == blockHash) break
            index += 1
          }
          result.nodes[blockHash] = { x: (180 * lastCanonicalNum) - 180 * (height - 1), y: 80 * index}
        }
      })
    } else {
      break
    }

    const childHashes = childBlockHashes[targetBlockHash as keyof typeof childBlockHashes]
    nextHash = [...nextHash, ...childHashes]
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
