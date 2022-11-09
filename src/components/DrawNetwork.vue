<script lang="ts">
import { ref, computed, toRefs } from 'vue'
import * as vNG from 'v-network-graph'
import vgraph from '../generateGraph'

// non-setup style
export default {
  props: ['proposals', 'index'],

  setup(props: any) {
    // console.log(`proposals: ${Object.keys(props)}`)
    const { proposals, index } = toRefs(props)
    const { latestProposal, oldestProposal, childBlockHashes } = index.value

    const proposalData = Object.assign({}, proposals.value)
    const nodes = vgraph.getNodes(proposalData, latestProposal)
    const edges = vgraph.getEdges(proposalData, latestProposal)
    const layouts = vgraph.getLayouts(proposalData, {
      latestProposal,
      oldestProposal,
      childBlockHashes
    })

    // ref="graph"
    const graph = ref<vNG.Instance>()
    // ref="tooltip"
    const tooltip = ref<HTMLDivElement>()

    const NODE_RADIUS = 16
    const targetNodeId = ref('')

    const tooltipPos = computed(() => {
      if (!graph.value || !tooltip.value) return { x: 0, y: 0 }
      if (!targetNodeId.value) return { x: 0, y: 0 }

      const nodePos = layouts.nodes[targetNodeId.value]
      // translate coordinates: SVG -> DOM
      const domPoint = graph.value.translateFromSvgToDomCoordinates(nodePos)
      // calculates top-left position of the tooltip.
      return {
        left: domPoint.x - tooltip.value.offsetWidth / 2 + 'px',
        top: domPoint.y - NODE_RADIUS - tooltip.value.offsetHeight - 10 + 'px',
      }
    })
    const tooltipOpacity = ref(0) // 0 or 1

    const eventHandlers: vNG.EventHandlers = {
      'node:pointerover': ({ node }) => {
        targetNodeId.value = node
        tooltipOpacity.value = 1 // show
      },
      'node:pointerout': (_) => {
        tooltipOpacity.value = 0 // hide
      },
      'node:click': (event) => {
        window.open(
          `https://goerli.etherscan.io/tx/${nodes[event.node].proposeTx}`
        )
      },
    }
    return {
      data: {
        nodes,
        edges,
        layouts,
        configs: vgraph.configs,
      },
      targetNodeId,
      tooltipPos,
      tooltipOpacity,
      eventHandlers,
    }
  },
}
</script>

<template>
  <v-network-graph
    ref="graph"
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
    :event-handlers="eventHandlers"
  />
  <div
    ref="tooltip"
    class="tooltip"
    :style="{ ...tooltipPos, opacity: tooltipOpacity }"
  >
    <div>proposedAt: {{ data.nodes[targetNodeId]?.proposedAt ?? '' }}</div>
    <div>hash: {{ data.nodes[targetNodeId]?.hash ?? '' }}</div>
    <div>parentHash: {{ data.nodes[targetNodeId]?.parentBlockHash ?? '' }}</div>
    <div>finalized: {{ data.nodes[targetNodeId]?.finalized ?? '' }}</div>
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
