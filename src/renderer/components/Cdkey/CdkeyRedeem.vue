<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download } from 'lucide-vue-next'
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

function openPurchase(url: string) {
  window.open(url, '_blank')
}

async function handleRedeem() {
  if (!code.value.trim()) {
    message.value = '请输入 CDKEY'
    messageType.value = 'error'
    return
  }
  try {
    const resp = await postApi.redeemCdkey(code.value.trim().toUpperCase())
    if (resp.code === 200) {
      const data = resp.data!
      message.value = `兑换成功！获得 🫘 ${data.amount} 百斩豆`
      messageType.value = 'success'
      balance.value = data.balance
      code.value = ''
    } else {
      message.value = resp.message || '兑换失败'
      messageType.value = 'error'
    }
  } catch {
    message.value = '兑换失败，请稍后再试'
    messageType.value = 'error'
  }
}

// ===== Admin: CDKey generation =====
const amounts = [10, 50, 100, 300, 500, 1000, 5000]
const adminAmount = ref(100)
const adminCount = ref(10)
const adminCodes = ref<string[]>([])
const adminMessage = ref('')
const adminMessageType = ref<'success' | 'error'>('success')

async function handleGenerate() {
  adminMessage.value = ''
  try {
    const resp = await postApi.generateCdkeys({ amount: adminAmount.value, count: adminCount.value })
    if (resp.code === 200) {
      adminCodes.value = resp.data!.codes
      adminMessage.value = `成功生成 ${adminCount.value} 个 CDKEY（面值 ${adminAmount.value} 百斩豆）`
      adminMessageType.value = 'success'
    } else {
      adminMessage.value = resp.message || '生成失败'
      adminMessageType.value = 'error'
    }
  } catch {
    adminMessage.value = '生成失败，请稍后再试'
    adminMessageType.value = 'error'
  }
}

function handleDownload() {
  const text = adminCodes.value.join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cdkeys_${adminAmount.value}x${adminCount.value}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="h-full flex flex-col text-[#ccc] overflow-y-auto">
    <h2 class="text-lg font-semibold mb-6">CDKEY 兑换</h2>

    <!-- Purchase section -->
    <div class="mb-6">
      <h3 class="text-sm text-[#888] mb-3">购买百斩豆</h3>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="opt in purchaseOptions"
          :key="opt.amount"
          class="flex flex-col items-center justify-center bg-[#2d2d2d] border border-[#444] rounded-lg py-2.5 px-2 hover:border-[#4a9eff] hover:bg-[#333] transition-colors cursor-pointer"
          @click="openPurchase(opt.url)"
        >
          <span class="text-[#f0c040] font-semibold text-sm">🫘 {{ opt.amount }}</span>
          <span class="text-[#666] text-[10px] mt-0.5">去购买</span>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-3 mb-4">
      <div class="flex-1 h-px bg-[#333]"></div>
      <span class="text-xs text-[#666]">已有 CDKey？在此兑换</span>
      <div class="flex-1 h-px bg-[#333]"></div>
    </div>

    <div class="mb-4">
      <label class="text-sm text-[#888] mb-2 block">格式：HAWTHORN-XXXX-XXXX</label>
      <input
        v-model="code"
        placeholder="HAWTHORN-XXXX-XXXX"
        class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-3 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666] uppercase"
        style="text-transform: uppercase"
        @keydown.enter="handleRedeem"
      />
    </div>

    <div v-if="message" class="mb-4 text-sm" :class="messageType === 'success' ? 'text-[#27ae60]' : 'text-[#e74c3c]'">
      {{ message }}
    </div>

    <button
      class="w-full bg-[#4a9eff] text-white rounded-md py-2.5 text-sm font-medium hover:bg-[#3a8eef] transition-colors mb-6"
      @click="handleRedeem"
    >兑换</button>

    <div class="text-sm text-[#888]">
      当前余额：<span class="text-[#ccc] font-semibold">🫘 {{ balance }} 百斩豆</span>
    </div>

    <!-- Admin: CDKey generation -->
    <template v-if="isAdmin">
      <div class="flex items-center gap-3 my-6">
        <div class="flex-1 h-px bg-[#333]"></div>
        <span class="text-xs text-[#666]">管理</span>
        <div class="flex-1 h-px bg-[#333]"></div>
      </div>

      <h3 class="text-sm text-[#888] mb-3">批量生成 CDKEY</h3>

      <div class="flex items-center gap-4 mb-4">
        <div>
          <label class="text-xs text-[#888] block mb-1">面值</label>
          <select v-model="adminAmount" class="bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]">
            <option v-for="a in amounts" :key="a" :value="a">{{ a }} 百斩豆</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-[#888] block mb-1">数量</label>
          <input
            v-model.number="adminCount"
            type="number"
            min="1"
            max="1000"
            class="w-24 bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]"
          />
        </div>
      </div>

      <button
        class="bg-[#4a9eff] text-white rounded-md py-2 px-6 text-sm font-medium hover:bg-[#3a8eef] transition-colors mb-4 self-start"
        @click="handleGenerate"
      >生成 CDKEY</button>

      <div v-if="adminMessage" class="mb-4 text-sm" :class="adminMessageType === 'success' ? 'text-[#27ae60]' : 'text-[#e74c3c]'">
        {{ adminMessage }}
      </div>

      <div v-if="adminCodes.length > 0" class="flex flex-col mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-[#888]">生成结果 ({{ adminCodes.length }} 个)</span>
          <button
            class="inline-flex items-center gap-1 text-sm text-[#4a9eff] hover:text-[#3a8eef]"
            @click="handleDownload"
          ><Download class="w-3.5 h-3.5" /> 下载 TXT</button>
        </div>
        <div class="overflow-y-auto max-h-48 bg-[#2d2d2d] border border-[#444] rounded-md p-3 font-mono text-xs text-[#aaa] whitespace-pre-wrap">
          {{ adminCodes.join('\n') }}
        </div>
      </div>
    </template>
  </div>
</template>
