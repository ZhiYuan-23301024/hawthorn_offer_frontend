import { apiGet, type ApiResponse } from './http'

export interface CampusCompanyCard {
  id: string
  name: string
  logo?: string | null
  industry?: string | null
  summary?: string | null
  officialUrl?: string | null
  status?: string | null
  latestDeadline?: string | null
}

export interface CampusJobCard {
  id: string
  campaignId?: string
  companyId?: string
  title: string
  category?: string | null
  city?: string | null
  degreeRequirement?: string | null
  description?: string | null
  applyUrl?: string | null
  status?: string | null
  deadline?: string | null
  companyName?: string | null
  campaignTitle?: string | null
}

export interface CampusOverview {
  companyCount: number
  activeCampaignCount: number
  upcomingDeadlineCount: number
  followedJobCount: number
  featuredCompanies: CampusCompanyCard[]
  hotJobs: CampusJobCard[]
}

export interface CampusCompanyDetail {
  company: CampusCompanyCard
  campaigns: Array<{
    id: string
    title: string
    targetYear?: number | null
    startAt?: string | null
    endAt?: string | null
    status?: string | null
  }>
  jobs: CampusJobCard[]
}

export function getCampusOverview() {
  return apiGet<ApiResponse<CampusOverview>>('/api/campus/overview')
}

export function getCampusCompanies(keyword?: string, status?: string) {
  const params = new URLSearchParams()
  if (keyword) params.append('keyword', keyword)
  if (status) params.append('status', status)
  const query = params.toString()
  return apiGet<ApiResponse<CampusCompanyCard[]>>(`/api/campus/companies${query ? `?${query}` : ''}`)
}

export function getCampusCompanyDetail(id: string) {
  return apiGet<ApiResponse<CampusCompanyDetail>>(`/api/campus/companies/${id}`)
}

export function getCampusJobs(keyword?: string, city?: string, category?: string) {
  const params = new URLSearchParams()
  if (keyword) params.append('keyword', keyword)
  if (city) params.append('city', city)
  if (category) params.append('category', category)
  const query = params.toString()
  return apiGet<ApiResponse<CampusJobCard[]>>(`/api/campus/jobs${query ? `?${query}` : ''}`)
}
