<script lang="ts">
import { onMounted } from 'vue'

export default {
  name: `DataLoader`,

  setup() {
    const getBlockData = async (index: number) => {
      const res = await fetch('https://node2.zkopru.network/', {
        method: 'post',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: Math.floor(Math.random() * 100000000),
          jsonrpc: '2.0',
          method: 'l2_getBlockByNumber',
          params: [`0x${index.toString(16)}`, false],
        }),
      })
      const data = await res.json()
      // console.log(JSON.stringify(data))

      return JSON.stringify(data.result)
    }

    onMounted(async () => {
      console.log(`dataLoaderSetup mounted`)

      const reqData = []
      for (const blockIndex of [3440, 3441, 3442]) {
        reqData.push(getBlockData(blockIndex))
      }
      const data = await Promise.all(reqData)
      console.log(`DataLoaded: ${data.length}`)
    })
  },
}
</script>
