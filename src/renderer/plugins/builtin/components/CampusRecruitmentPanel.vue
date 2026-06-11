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
  getCampusJobs,
  getCampusOverview,
  type CampusCompanyCard,
  type CampusCompanyDetail,
  type CampusJobCard,
  type CampusOverview
} from '@/api/campus'

type CampusSection = 'all' | 'overview' | 'companies' | 'jobs' | 'timeline' | 'tracking'

const props = withDefaults(defineProps<{
  activeSection?: CampusSection
}>(), {
  activeSection: 'all'
})

const activeSection = computed(() => props.activeSection || 'all')

const showSection = (section: Exclude<CampusSection, 'all'>) => {
  return activeSection.value === 'all' || activeSection.value === section
}

const loading = ref(false)
const pageMessage = ref('')
const overview = ref<CampusOverview | null>(null)
const companies = ref<CampusCompanyCard[]>([])
const jobs = ref<CampusJobCard[]>([])
const companyKeyword = ref('')
const jobKeyword = ref('')
const selectedCompanyId = ref('')
const selectedCompanyDetail = ref<CampusCompanyDetail | null>(null)
const selectedCompanyLoading = ref(false)

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

const timelineTips = [
  { date: '下一步', title: '补流程节点接口', note: '建议后端后续新增 milestones 表，把网申、笔试、面试、截止串成真实时间线。' },
  { date: '当前状态', title: '时间线仍是占位区', note: '这块暂时还没有接真实接口，我先把结构位留好了。' }
]

const trackingTips = [
  { company: '建议', role: '关注记录', status: '待实现', note: '下一步可以补 user_campus_follows 表，把“已投递 / 笔试中 / 面试中”做成用户自己的进度。' }
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
      loadJobs()
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

function formatDeadline(value?: string | null) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`
}

watch(selectedCompanyId, async (next) => {
  await loadCompanyDetail(next)
}, { immediate: true })

onMounted(initializeData)
</script>

<template>
  <div class="h-full overflow-auto p-4 text-sm text-vscode-text">
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
              现在这版已经接上后端接口，优先展示企业、岗位和总览数据，方便你先验证专区的信息密度是否合理。
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
          </div>
        </div>
      </section>

      <section v-if="showSection('timeline')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <CalendarClock class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">流程时间线</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in timelineTips"
            :key="`${item.date}-${item.title}`"
            class="grid gap-2 rounded-xl border border-vscode-border bg-vscode-active/35 p-4 md:grid-cols-[88px_minmax(0,1fr)]"
          >
            <div class="text-sm font-medium text-sky-300">{{ item.date }}</div>
            <div>
              <p class="font-medium text-vscode-text">{{ item.title }}</p>
              <p class="mt-1 text-sm text-vscode-text-secondary">{{ item.note }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('tracking')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <BadgeCheck class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">我的关注</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in trackingTips"
            :key="`${item.company}-${item.role}`"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-medium text-vscode-text">{{ item.company }} · {{ item.role }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">{{ item.note }}</p>
              </div>
              <span class="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
