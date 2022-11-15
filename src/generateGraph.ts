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
  const blockSequence: { [canonicalNum: number]: [{ blockHash: string, proposedAt: number, finalized: boolean, uncleDegree: number }] } = {}
  for (const proposalHash of Object.keys(proposals)) {
    // calculate uncle degree using recursive way
    const calcUncleDegree = (proposalHash: any, degree: number): number => {
      if (proposals[proposalHash].isUncle) {
        const parentBlockHash = proposals[proposalHash].header.parentBlock
        return calcUncleDegree(parentBlockHash, degree + 1)
      }
      return degree
    }

    // adding data to block sequence
    const blockHeight = proposals[proposalHash].canonicalNum
    const existSequence = blockSequence[blockHeight]
    const proposalData = {
      blockHash: proposalHash,
      proposedAt: proposals[proposalHash].proposedAt,
      finalized: proposals[proposalHash].finalized,
      uncleDegree: calcUncleDegree(proposalHash, 0),
    }

    if (!existSequence) {
      blockSequence[blockHeight] = [proposalData]
    } else {
      blockSequence[blockHeight].push(proposalData)
    }

    const sortedSequence = blockSequence[blockHeight].sort(
      function(a, b) { return a['uncleDegree'] - b['uncleDegree'] }
    )

    blockSequence[blockHeight] = sortedSequence
  }

  // starting with oldest proposal's child hash
  let nextHash: string[] = []
  for (const childHash of oldestProposal.proposalHashes) {
    nextHash.push(childBlockHashes[childHash])
  }

  // for drawing blocks by height, set top as standard.
  const lastCanonicalNum = proposals[latestProposal.proposalHashes[0]].canonicalNum
  console.log(JSON.stringify(blockSequence))
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
          let index = 0
          let degree = 0 // uncle degree
          for (const sequence of blockSequence[proposal.canonicalNum]) {
            if (sequence.blockHash == blockHash) {
              degree = sequence['uncleDegree']
              break
            }
            if (index > degree) index += 1
          }
          result.nodes[blockHash] = { x: (180 * lastCanonicalNum) - 180 * (height - 1), y: (80 * degree) + (80 * index) }
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
  view: {
    autoPanAndZoomOnLoad: false
  },
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
