<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Building2,
  Briefcase,
  CalendarClock,
  BellRing,
  BadgeCheck,
  MapPin,
  ArrowUpRight,
  Sparkles
} from 'lucide-vue-next'
import {
  getCampusCompanies,
  getCampusCompanyDetail,
  getMyCampusFollows,
  getCampusJobs,
  getCampusOverview,
  getCampusTimeline,
  saveCampusFollow,
  type CampusCompanyCard,
  type CampusCompanyDetail,
  type CampusFollowItem,
  type CampusJobCard,
  type CampusOverview,
  type CampusTimelineItem
} from '@/api/campus'
import { useAuthStore } from '@/stores/auth'

type CampusSection = 'all' | 'overview' | 'companies' | 'jobs' | 'timeline' | 'tracking'

const props = withDefaults(defineProps<{
  activeSection?: CampusSection
}>(), {
  activeSection: 'all'
})

const activeSection = computed(() => props.activeSection || 'all')
const authStore = useAuthStore()

const showSection = (section: Exclude<CampusSection, 'all'>) => {
  return activeSection.value === 'all' || activeSection.value === section
}

const loading = ref(false)
const pageMessage = ref('')
const overview = ref<CampusOverview | null>(null)
const companies = ref<CampusCompanyCard[]>([])
const jobs = ref<CampusJobCard[]>([])
const timeline = ref<CampusTimelineItem[]>([])
const follows = ref<CampusFollowItem[]>([])
const companyKeyword = ref('')
const jobKeyword = ref('')
const followNoteDrafts = ref<Record<string, string>>({})
const selectedCompanyId = ref('')
const selectedCompanyDetail = ref<CampusCompanyDetail | null>(null)
const selectedCompanyLoading = ref(false)
const followLoadingJobId = ref('')

const stats = computed(() => {
  const current = overview.value
  return [
    { label: '企业数量', value: String(current?.companyCount ?? 0), tone: 'text-sky-300' },
    { label: '开放批次', value: String(current?.activeCampaignCount ?? 0), tone: 'text-emerald-300' },
    { label: '7天内将截止', value: String(current?.upcomingDeadlineCount ?? 0), tone: 'text-amber-300' },
    { label: '已关注岗位', value: String(current?.followedJobCount ?? 0), tone: 'text-fuchsia-300' }
  ]
})

const featuredCompanies = computed(() => overview.value?.featuredCompanies ?? [])
const hotJobs = computed(() => overview.value?.hotJobs ?? [])

const followStatusOptions = [
  { value: 'BOOKMARKED', label: '已收藏' },
  { value: 'PREPARING', label: '准备投递' },
  { value: 'APPLIED', label: '已投递' },
  { value: 'WRITTEN_TEST', label: '笔试中' },
  { value: 'INTERVIEWING', label: '面试中' },
  { value: 'OFFER', label: '已拿 Offer' },
  { value: 'ENDED', label: '已结束' }
]

async function loadOverview() {
  const res = await getCampusOverview()
  if (res.code === 200) {
    overview.value = res.data
    return true
  }
  pageMessage.value = res.message
  return false
}

async function loadCompanies(keyword?: string) {
  const res = await getCampusCompanies(keyword)
  if (res.code === 200) {
    companies.value = res.data
    if (!selectedCompanyId.value && res.data.length > 0) {
      selectedCompanyId.value = res.data[0].id
    } else if (selectedCompanyId.value && !res.data.some(item => item.id === selectedCompanyId.value)) {
      selectedCompanyId.value = res.data[0]?.id || ''
    }
    return true
  }
  pageMessage.value = res.message
  return false
}

async function loadJobs(keyword?: string) {
  const res = await getCampusJobs(keyword)
  if (res.code === 200) {
    jobs.value = res.data
    return true
  }
  pageMessage.value = res.message
  return false
}

async function loadTimeline() {
  const res = await getCampusTimeline()
  if (res.code === 200) {
    timeline.value = res.data
    return true
  }
  pageMessage.value = res.message
  return false
}

async function loadFollows() {
  if (!authStore.token) {
    follows.value = []
    followNoteDrafts.value = {}
    return true
  }

  const res = await getMyCampusFollows()
  if (res.code === 200) {
    follows.value = res.data
    followNoteDrafts.value = Object.fromEntries(res.data.map(item => [item.jobId, item.note || '']))
    return true
  }
  pageMessage.value = res.message
  return false
}

async function loadCompanyDetail(companyId: string) {
  if (!companyId) {
    selectedCompanyDetail.value = null
    return
  }

  selectedCompanyLoading.value = true
  try {
    const res = await getCampusCompanyDetail(companyId)
    if (res.code === 200) {
      selectedCompanyDetail.value = res.data
    } else {
      pageMessage.value = res.message
    }
  } finally {
    selectedCompanyLoading.value = false
  }
}

async function initializeData() {
  loading.value = true
  pageMessage.value = ''
  try {
    await Promise.all([
      loadOverview(),
      loadCompanies(),
      loadJobs(),
      loadTimeline(),
      loadFollows()
    ])
  } finally {
    loading.value = false
  }
}

async function searchCompanies() {
  pageMessage.value = ''
  await loadCompanies(companyKeyword.value.trim() || undefined)
}

async function searchJobs() {
  pageMessage.value = ''
  await loadJobs(jobKeyword.value.trim() || undefined)
}

async function updateFollow(jobId: string, status: string) {
  if (!authStore.token) {
    pageMessage.value = '登录后才能记录投递进度'
    return
  }

  followLoadingJobId.value = jobId
  pageMessage.value = ''
  try {
    const res = await saveCampusFollow({
      jobId,
      status,
      note: followNoteDrafts.value[jobId]?.trim() || undefined
    })
    if (res.code === 200) {
      await Promise.all([loadFollows(), loadOverview()])
    } else {
      pageMessage.value = res.message
    }
  } finally {
    followLoadingJobId.value = ''
  }
}

function formatDeadline(value?: string | null) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value?: string | null) {
  if (!value) return '待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatFollowStatus(status?: string | null) {
  const matched = followStatusOptions.find(item => item.value === status)
  return matched?.label || '已收藏'
}

function getFollowStatus(jobId: string) {
  return follows.value.find(item => item.jobId === jobId)?.status || 'BOOKMARKED'
}

watch(selectedCompanyId, async (next) => {
  await loadCompanyDetail(next)
}, { immediate: true })

onMounted(initializeData)
</script>

<template>
  <div class="h-full overflow-auto py-4 text-sm text-vscode-text">
    <div class="mx-auto max-w-6xl space-y-4">
      <section class="rounded-2xl border border-vscode-border bg-vscode-active/50 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full border border-vscode-border px-3 py-1 text-xs text-vscode-text-secondary">
              <Sparkles class="h-3.5 w-3.5" />
              企业校招工作台
            </div>
            <h2 class="text-xl font-semibold text-vscode-text">校招专区</h2>
            <p class="max-w-2xl text-vscode-text-secondary">
              聚合近期企业校招批次、岗位和关键节点，也支持记录你自己的投递进度，尽量把信息浏览和跟进放在一个地方。
            </p>
          </div>
          <button
            class="rounded-xl border border-vscode-border px-3 py-2 text-xs text-vscode-text-secondary hover:bg-vscode-active"
            @click="initializeData"
          >
            刷新数据
          </button>
        </div>
      </section>

      <div v-if="pageMessage" class="rounded-xl border border-vscode-border bg-vscode-active px-3 py-2 text-vscode-warning">
        {{ pageMessage }}
      </div>

      <div v-if="loading" class="rounded-xl border border-vscode-border bg-vscode-panel px-4 py-3 text-vscode-text-secondary">
        正在加载校招专区数据...
      </div>

      <section v-if="showSection('overview')" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="item in stats"
            :key="item.label"
            class="rounded-2xl border border-vscode-border bg-vscode-panel p-4"
          >
            <p class="text-xs uppercase tracking-wide text-vscode-text-secondary">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-semibold" :class="item.tone">{{ item.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
            <div class="mb-3 flex items-center gap-2">
              <Building2 class="h-4 w-4 text-vscode-icon" />
              <h3 class="font-medium text-vscode-text">重点企业</h3>
            </div>
            <div v-if="featuredCompanies.length === 0" class="text-sm text-vscode-text-secondary">暂无企业数据</div>
            <div v-else class="space-y-3">
              <div
                v-for="company in featuredCompanies"
                :key="company.id"
                class="rounded-xl border border-vscode-border bg-vscode-active/40 p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="font-medium text-vscode-text">{{ company.name }}</p>
                    <p class="text-xs text-vscode-text-secondary">{{ company.industry || '未分类行业' }}</p>
                  </div>
                  <span class="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                    截止 {{ formatDeadline(company.latestDeadline) }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-vscode-text-secondary">{{ company.summary || '暂无企业介绍' }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
            <div class="mb-3 flex items-center gap-2">
              <BellRing class="h-4 w-4 text-vscode-icon" />
              <h3 class="font-medium text-vscode-text">热门岗位</h3>
            </div>
            <div v-if="hotJobs.length === 0" class="text-sm text-vscode-text-secondary">暂无岗位数据</div>
            <div v-else class="space-y-3">
              <div
                v-for="job in hotJobs"
                :key="job.id"
                class="rounded-xl border border-vscode-border bg-vscode-active/30 p-3 text-sm"
              >
                <p class="font-medium text-vscode-text">{{ job.title }}</p>
                <p class="mt-1 text-vscode-text-secondary">{{ job.companyName || '未知企业' }} · {{ job.city || '未填写城市' }}</p>
                <p class="mt-2 text-xs text-vscode-text-secondary">截止 {{ formatDeadline(job.deadline) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('companies')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Building2 class="h-4 w-4 text-vscode-icon" />
            <h3 class="font-medium text-vscode-text">企业列表</h3>
          </div>
          <div class="flex gap-2">
            <input
              v-model="companyKeyword"
              class="rounded-lg border border-vscode-border bg-vscode-active px-3 py-1.5 text-sm"
              placeholder="搜索企业名或行业"
              @keyup.enter="searchCompanies"
            />
            <button class="rounded-lg border border-vscode-border px-3 py-1.5 text-xs hover:bg-vscode-active" @click="searchCompanies">
              搜索
            </button>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div class="space-y-3">
            <div v-if="companies.length === 0" class="text-sm text-vscode-text-secondary">暂无企业数据</div>
            <button
              v-for="company in companies"
              :key="company.id"
              class="w-full rounded-xl border p-4 text-left transition"
              :class="company.id === selectedCompanyId ? 'border-sky-500 bg-sky-500/10' : 'border-vscode-border bg-vscode-active/35 hover:bg-vscode-active/60'"
              @click="selectedCompanyId = company.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-base font-medium text-vscode-text">{{ company.name }}</p>
                  <p class="mt-1 text-sm text-vscode-text-secondary">{{ company.industry || '未分类行业' }}</p>
                </div>
                <span class="rounded-full bg-vscode-bg px-2 py-1 text-xs text-vscode-text-secondary">
                  {{ company.status || 'OPEN' }}
                </span>
              </div>
              <p class="mt-3 text-sm text-vscode-text-secondary">{{ company.summary || '暂无企业介绍' }}</p>
            </button>
          </div>

          <div class="rounded-xl border border-vscode-border bg-vscode-active/20 p-4">
            <div v-if="selectedCompanyLoading" class="text-sm text-vscode-text-secondary">正在加载企业详情...</div>
            <template v-else-if="selectedCompanyDetail">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-lg font-semibold text-vscode-text">{{ selectedCompanyDetail.company.name }}</h4>
                  <p class="mt-1 text-sm text-vscode-text-secondary">{{ selectedCompanyDetail.company.industry || '未分类行业' }}</p>
                </div>
                <a
                  v-if="selectedCompanyDetail.company.officialUrl"
                  :href="selectedCompanyDetail.company.officialUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-1 rounded-lg border border-vscode-border px-2 py-1 text-xs text-vscode-text-secondary"
                >
                  官方入口
                  <ArrowUpRight class="h-3.5 w-3.5" />
                </a>
              </div>
              <p class="mt-3 text-sm text-vscode-text-secondary">
                {{ selectedCompanyDetail.company.summary || '暂无企业介绍' }}
              </p>

              <div class="mt-4 space-y-2">
                <p class="text-xs uppercase tracking-wide text-vscode-text-secondary">当前批次</p>
                <div v-if="selectedCompanyDetail.campaigns.length === 0" class="text-sm text-vscode-text-secondary">暂无批次信息</div>
                <div
                  v-for="campaign in selectedCompanyDetail.campaigns"
                  :key="campaign.id"
                  class="rounded-lg border border-vscode-border bg-vscode-panel px-3 py-2"
                >
                  <p class="font-medium text-vscode-text">{{ campaign.title }}</p>
                  <p class="mt-1 text-xs text-vscode-text-secondary">
                    {{ campaign.targetYear || '-' }} 届 · {{ campaign.status || 'OPEN' }}
                  </p>
                </div>
              </div>
            </template>
            <div v-else class="text-sm text-vscode-text-secondary">选择左侧企业后，在这里查看详情。</div>
          </div>
        </div>
      </section>

      <section v-if="showSection('jobs')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Briefcase class="h-4 w-4 text-vscode-icon" />
            <h3 class="font-medium text-vscode-text">岗位列表</h3>
          </div>
          <div class="flex gap-2">
            <input
              v-model="jobKeyword"
              class="rounded-lg border border-vscode-border bg-vscode-active px-3 py-1.5 text-sm"
              placeholder="搜索岗位或企业"
              @keyup.enter="searchJobs"
            />
            <button class="rounded-lg border border-vscode-border px-3 py-1.5 text-xs hover:bg-vscode-active" @click="searchJobs">
              搜索
            </button>
          </div>
        </div>

        <div v-if="jobs.length === 0" class="text-sm text-vscode-text-secondary">暂无岗位数据</div>
        <div v-else class="space-y-3">
          <div
            v-for="job in jobs"
            :key="job.id"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-base font-medium text-vscode-text">{{ job.title }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">
                  {{ job.companyName || '未知企业' }} · {{ job.campaignTitle || '未命名批次' }}
                </p>
              </div>
              <span class="rounded-full bg-rose-500/15 px-2 py-1 text-xs text-rose-300">
                截止 {{ formatDeadline(job.deadline) }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-vscode-text-secondary">
              <span class="inline-flex items-center gap-1 rounded-full border border-vscode-border px-2 py-1">
                <MapPin class="h-3.5 w-3.5" />
                {{ job.city || '未填写城市' }}
              </span>
              <span v-if="job.category" class="rounded-full bg-vscode-bg px-2 py-1">{{ job.category }}</span>
              <span v-if="job.degreeRequirement" class="rounded-full bg-vscode-bg px-2 py-1">{{ job.degreeRequirement }}</span>
            </div>
            <p class="mt-3 text-sm text-vscode-text-secondary">{{ job.description || '暂无岗位说明' }}</p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <select
                :value="getFollowStatus(job.id)"
                class="rounded-lg border border-vscode-border bg-vscode-bg px-2 py-1.5 text-xs text-vscode-text"
                @change="updateFollow(job.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="option in followStatusOptions" :key="option.value" :value="option.value" class="bg-vscode-bg text-vscode-text">
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model="followNoteDrafts[job.id]"
                class="min-w-[220px] rounded-lg border border-vscode-border bg-vscode-bg px-3 py-1.5 text-xs text-vscode-text"
                placeholder="补一句自己的备注"
              />
              <button
                class="rounded-lg border border-vscode-border bg-vscode-bg px-3 py-1.5 text-xs hover:bg-vscode-active"
                :disabled="followLoadingJobId === job.id"
                @click="updateFollow(job.id, getFollowStatus(job.id))"
              >
                {{ followLoadingJobId === job.id ? '保存中...' : '保存进度' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('timeline')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <CalendarClock class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">流程时间线</h3>
        </div>
        <div v-if="timeline.length === 0" class="text-sm text-vscode-text-secondary">暂无流程节点数据</div>
        <div v-else class="space-y-3">
          <div
            v-for="item in timeline"
            :key="item.id"
            class="grid gap-2 rounded-xl border border-vscode-border bg-vscode-active/35 p-4 md:grid-cols-[88px_minmax(0,1fr)]"
          >
            <div class="text-sm font-medium text-sky-300">{{ formatDateTime(item.happenAt) }}</div>
            <div>
              <p class="font-medium text-vscode-text">{{ item.companyName || '企业待定' }} · {{ item.title }}</p>
              <p class="mt-1 text-xs text-vscode-text-secondary">{{ item.campaignTitle || '未命名批次' }}</p>
              <p v-if="item.note" class="mt-1 text-sm text-vscode-text-secondary">{{ item.note }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('tracking')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <BadgeCheck class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">我的关注</h3>
        </div>
        <div v-if="!authStore.token" class="text-sm text-vscode-text-secondary">登录后可以在这里查看自己的关注岗位和投递进度。</div>
        <div v-else-if="follows.length === 0" class="text-sm text-vscode-text-secondary">你还没有记录关注岗位，可以先在岗位列表里保存进度。</div>
        <div v-else class="space-y-3">
          <div
            v-for="item in follows"
            :key="item.id"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-medium text-vscode-text">{{ item.companyName || '未知企业' }} · {{ item.jobTitle }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">
                  {{ item.city || '城市待定' }}<span v-if="item.category"> · {{ item.category }}</span><span v-if="item.deadline"> · 截止 {{ formatDeadline(item.deadline) }}</span>
                </p>
                <p v-if="item.note" class="mt-2 text-sm text-vscode-text-secondary">{{ item.note }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                  {{ formatFollowStatus(item.status) }}
                </span>
                <a
                  v-if="item.applyUrl"
                  :href="item.applyUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-1 rounded-lg border border-vscode-border px-2 py-1 text-xs text-vscode-text-secondary"
                >
                  投递入口
                  <ArrowUpRight class="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
