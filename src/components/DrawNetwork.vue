<script setup lang="ts">
import { ref, computed, toRefs, onMounted, defineProps } from 'vue'
import * as vNG from 'v-network-graph'
import vgraph from '../generateGraph'

const props = defineProps(['proposals', 'index'])

const { proposals, index } = toRefs(props)
const { latestProposal, oldestProposal, childBlockHashes } = index!.value
const proposalData = Object.assign({}, proposals!.value)

const graphData = ref({
  nodes: vgraph.getNodes(proposalData, latestProposal),
  edges: vgraph.getEdges(proposalData, latestProposal),
  layouts: vgraph.getLayouts(proposalData, {
    latestProposal,
    oldestProposal,
    childBlockHashes,
  }),
})

// ref="graph"
const graph = ref<vNG.VNetworkGraphInstance>()
const tooltip = ref<HTMLDivElement>()

const targetNodeId = ref('')

const tooltipPos = computed(() => {
  if (!graph.value || !tooltip.value) return { x: 0, y: 0 }
  if (!targetNodeId.value) return { x: 0, y: 0 }
  const nodePos = graphData.value.layouts.nodes[targetNodeId.value]
  // translate coordinates: SVG -> DOM
  const domPoint = graph.value.translateFromSvgToDomCoordinates(nodePos)
  // calculates top-left position of the tooltip.
  return {
    left: domPoint.x + 'px',
    top: domPoint.y - 2 + 'px',
  }
})

const tooltipOpacity = ref(0) // 0 or 1

const eventHandlers: vNG.EventHandlers = {
  "view:load": () => {
    if (!graph.value || latestProposal.proposalHashes.length == 0) return
    // Pan the target node position to the center.
    const sizes = graph.value.getSizes()
    const latestBlockHash = latestProposal.proposalHashes[0]
    graph.value.panTo({
      x: sizes.width / 2 - graphData.value.layouts.nodes[latestBlockHash].x,
      y: sizes.height / 2 - graphData.value.layouts.nodes[latestBlockHash].y,
    })
  },
  'node:pointerover': ({ node }) => {
    targetNodeId.value = node
    tooltipOpacity.value = 1 // show
  },
  'node:pointerout': (_) => {
    tooltipOpacity.value = 0 // hide
  },
  'node:click': (event) => {
    const { nodes } = graphData.value
    window.open(`https://goerli.etherscan.io/tx/${nodes[event.node].proposeTx}`)
  },
}

</script>

<template>
  <v-network-graph
    ref="graph"
    :nodes="graphData.nodes"
    :edges="graphData.edges"
    :layouts="graphData.layouts"
    :configs="vgraph.configs"
    :event-handlers="eventHandlers"
  />
  <div
    ref="tooltip"
    class="tooltip"
    :style="{ ...tooltipPos, opacity: tooltipOpacity }"
  >
    <div>proposedAt: {{ graphData.nodes[targetNodeId]?.proposedAt ?? '' }}</div>
    <div>hash: {{ graphData.nodes[targetNodeId]?.hash ?? '' }}</div>
    <div>
      parentHash: {{ graphData.nodes[targetNodeId]?.parentBlockHash ?? '' }}
    </div>
    <div>finalized: {{ graphData.nodes[targetNodeId]?.finalized ?? '' }}</div>
  </div>
</template>

<style lang="css" scoped>
.tooltip {
  top: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  padding: 10px;
  text-align: left;
  font-size: 12px;
  background-color: #fff0bd;
  border: 1px solid #ffb950;
  box-shadow: 2px 2px 2px #aaa;
  transition: opacity 0.2s linear;
}
</style>
