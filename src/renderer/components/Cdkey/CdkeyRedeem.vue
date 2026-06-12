<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download , Bean } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import * as postApi from '@/api/post'

const authStore = useAuthStore()
const isAdmin = computed(() => !!authStore.user?.chsiReviewer)

const code = ref('')
const balance = ref(0)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const purchaseOptions = [
  { amount: 10,  url: 'https://pay.ldxp.cn/item/m2c9kk' },
  { amount: 50,  url: 'https://pay.ldxp.cn/item/hbtvr7' },
  { amount: 100, url: 'https://pay.ldxp.cn/item/svzd3e' },
  { amount: 300, url: 'https://pay.ldxp.cn/item/wtrnn0' },
  { amount: 500, url: 'https://pay.ldxp.cn/item/x6ueof' },
  { amount: 1000, url: 'https://pay.ldxp.cn/item/9vz3pi' },
  { amount: 5000, url: 'https://pay.ldxp.cn/item/35wcu4' },
]

function openPurchase(url: string) { window.open(url, '_blank') }

async function handleRedeem() {
  if (!code.value.trim()) { message.value = '请输入 CDKEY'; messageType.value = 'error'; return }
  try {
    const resp = await postApi.redeemCdkey(code.value.trim().toUpperCase())
    if (resp.code === 200) { const data = resp.data!; message.value = `兑换成功！获得 🫘 ${data.amount} 百斩豆`; messageType.value = 'success'; balance.value = data.balance; code.value = '' }
    else { message.value = resp.message || '兑换失败'; messageType.value = 'error' }
  } catch { message.value = '兑换失败，请稍后再试'; messageType.value = 'error' }
}

const amounts = [10, 50, 100, 300, 500, 1000, 5000]
const adminAmount = ref(100); const adminCount = ref(10)
const adminCodes = ref<string[]>([]); const adminMessage = ref('')
const adminMessageType = ref<'success' | 'error'>('success')

async function handleGenerate() {
  adminMessage.value = ''
  try {
    const resp = await postApi.generateCdkeys({ amount: adminAmount.value, count: adminCount.value })
    if (resp.code === 200) { adminCodes.value = resp.data!.codes; adminMessage.value = `成功生成 ${adminCount.value} 个 CDKEY（面值 ${adminAmount.value} 百斩豆）`; adminMessageType.value = 'success' }
    else { adminMessage.value = resp.message || '生成失败'; adminMessageType.value = 'error' }
  } catch { adminMessage.value = '生成失败，请稍后再试'; adminMessageType.value = 'error' }
}

function handleDownload() { const text = adminCodes.value.join('\n'); const blob = new Blob([text], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cdkeys_${adminAmount.value}x${adminCount.value}.txt`; a.click(); URL.revokeObjectURL(url) }
</script>

<template>
  <div class="h-full overflow-y-auto p-6" style="background-color: var(--color-bg); color: var(--color-text-primary);">
    <h2 class="text-lg font-semibold mb-6" style="font-family: var(--font-display);">CDKEY 兑换</h2>

    <div class="mb-6">
      <h3 class="text-sm mb-3" style="color: var(--color-text-secondary);">购买百斩豆</h3>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="opt in purchaseOptions" :key="opt.amount"
          class="flex flex-col items-center justify-center rounded-lg py-2.5 px-2 transition-colors cursor-pointer border"
          style="background-color: var(--color-surface); border-color: var(--color-border);"
          @click="openPurchase(opt.url)"
          @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }"
          @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.borderColor = 'var(--color-border)'; (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface)' }"
        >
          <span class="font-semibold text-sm" style="color: var(--color-warning);">{{ opt.amount  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
          <span class="text-xs mt-0.5" style="color: var(--color-text-tertiary);">去购买</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <div class="flex-1" style="height: 1px; background-color: var(--color-divider);"></div>
      <span class="text-xs" style="color: var(--color-text-tertiary);">已有 CDKey？在此兑换</span>
      <div class="flex-1" style="height: 1px; background-color: var(--color-divider);"></div>
    </div>

    <div class="mb-4">
      <label class="text-sm mb-2 block" style="color: var(--color-text-secondary);">格式：HAWTHORN-XXXX-XXXX</label>
      <input v-model="code" placeholder="HAWTHORN-XXXX-XXXX" class="w-full input-base py-3 uppercase text-sm" style="text-transform: uppercase;" @keydown.enter="handleRedeem" />
    </div>

    <div v-if="message" class="mb-4 text-sm" :style="{ color: messageType === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }">{{ message }}</div>

    <button class="w-full text-white rounded-md py-2.5 text-sm font-medium transition-colors mb-6 btn-primary" @click="handleRedeem">兑换</button>

    <div class="text-sm" style="color: var(--color-text-secondary);">当前余额：<span class="font-semibold" style="color: var(--color-text-primary);">{{ balance  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆</span></div>

    <!-- Admin section -->
    <template v-if="isAdmin">
      <div class="flex items-center gap-3 my-6">
        <div class="flex-1" style="height: 1px; background-color: var(--color-divider);"></div>
        <span class="text-xs" style="color: var(--color-text-tertiary);">管理</span>
        <div class="flex-1" style="height: 1px; background-color: var(--color-divider);"></div>
      </div>

      <h3 class="text-sm mb-3" style="color: var(--color-text-secondary);">批量生成 CDKEY</h3>
      <div class="flex items-center gap-4 mb-4">
        <div><label class="text-xs block mb-1" style="color: var(--color-text-secondary);">面值</label>
          <select v-model="adminAmount" class="input-base text-sm py-2"><option v-for="a in amounts" :key="a" :value="a">{{ a }} 百斩豆</option></select></div>
        <div><label class="text-xs block mb-1" style="color: var(--color-text-secondary);">数量</label>
          <input v-model.number="adminCount" type="number" min="1" max="1000" class="w-24 input-base text-sm py-2" /></div>
      </div>

      <button class="text-white rounded-md py-2 px-6 text-sm font-medium transition-colors mb-4 btn-primary" @click="handleGenerate">生成 CDKEY</button>

      <div v-if="adminMessage" class="mb-4 text-sm" :style="{ color: adminMessageType === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }">{{ adminMessage }}</div>

      <div v-if="adminCodes.length > 0" class="flex flex-col mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm" style="color: var(--color-text-secondary);">生成结果 ({{ adminCodes.length }} 个)</span>
          <button class="inline-flex items-center gap-1 text-sm transition-colors" style="color: var(--color-primary);" @click="handleDownload"><Download class="w-3.5 h-3.5" /> 下载 TXT</button>
        </div>
        <div class="overflow-y-auto max-h-48 border rounded-md p-3 font-mono text-xs whitespace-pre-wrap" style="background-color: var(--color-surface); border-color: var(--color-border); color: var(--color-text-secondary);">{{ adminCodes.join('\n') }}</div>
      </div>
    </template>
  </div>
</template>
