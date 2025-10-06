import { useCallback, useEffect, useState } from 'react'
import { awardsApi, companyApi, projectsApi, teamApi } from '@/services/api'

/**
 * Data completeness interface
 * Tracks completion status for each required data category
 */
export interface DataCompleteness {
  /** Overall completion percentage (0-100) */
  overall: number
  /** Company basic data completion status */
  company: {
    completed: boolean
    percentage: number
    missingFields: string[]
  }
  /** Team members completion status (requires at least 1 member) */
  teamMembers: {
    completed: boolean
    count: number
  }
  /** Projects completion status (requires at least 1 project) */
  projects: {
    completed: boolean
    count: number
  }
  /** Awards completion status (optional, bonus 25%) */
  awards: {
    completed: boolean
    count: number
  }
  /** List of incomplete categories for display */
  incompleteItems: {
    key: string
    label: string
    route: string
    priority: number
  }[]
}

/**
 * Hook to calculate and track data completeness across the application
 * Used for onboarding and dashboard progress indicators
 *
 * @returns {object} Completeness data and refresh function
 *
 * @example
 * ```tsx
 * const { completeness, loading, refresh } = useDataCompleteness()
 *
 * if (completeness.overall < 80) {
 *   return <OnboardingGuide completeness={completeness} />
 * }
 * ```
 */
export const useDataCompleteness = () => {
  const [completeness, setCompleteness] = useState<DataCompleteness>({
    overall: 0,
    company: {
      completed: false,
      percentage: 0,
      missingFields: []
    },
    teamMembers: {
      completed: false,
      count: 0
    },
    projects: {
      completed: false,
      count: 0
    },
    awards: {
      completed: false,
      count: 0
    },
    incompleteItems: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Calculate company data completeness based on required fields
   */
  const calculateCompanyCompleteness = useCallback((company: any) => {
    if (!company) {
      return {
        completed: false,
        percentage: 0,
        missingFields: [
          'company_name',
          'tax_id',
          'address',
          'phone',
          'email',
          'industry',
          'established_date'
        ]
      }
    }

    const requiredFields = [
      'company_name',
      'tax_id',
      'address',
      'phone',
      'email',
      'industry',
      'established_date'
    ]

    const missingFields = requiredFields.filter(field =>
      !company[field] || company[field].toString().trim() === ''
    )

    const filledFields = requiredFields.length - missingFields.length
    const percentage = Math.round((filledFields / requiredFields.length) * 100)

    return {
      completed: percentage === 100,
      percentage,
      missingFields
    }
  }, [])

  /**
   * Load and calculate data completeness from all sources
   */
  const loadCompleteness = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [companyData, teamData, projectsData, awardsData] = await Promise.allSettled([
        companyApi.getBasicData(),
        teamApi.getMembers({ limit: 100 }),
        projectsApi.getProjects({ limit: 100 }),
        awardsApi.getAwards({ limit: 100 })
      ])

      // Process company data
      const company = companyData.status === 'fulfilled'
        ? calculateCompanyCompleteness(companyData.value)
        : { completed: false, percentage: 0, missingFields: [] }

      // Process team members
      const teamCount = teamData.status === 'fulfilled' && Array.isArray(teamData.value)
        ? teamData.value.length
        : 0
      const teamCompleted = teamCount > 0

      // Process projects
      const projectsCount = projectsData.status === 'fulfilled' && Array.isArray(projectsData.value)
        ? projectsData.value.length
        : 0
      const projectsCompleted = projectsCount > 0

      // Process awards (optional)
      const awardsCount = awardsData.status === 'fulfilled' && Array.isArray(awardsData.value)
        ? awardsData.value.length
        : 0
      const awardsCompleted = awardsCount > 0

      // Calculate overall percentage
      // Company: 25%, Team: 25%, Projects: 25%, Awards: 25%
      const companyScore = company.completed ? 25 : (company.percentage * 0.25)
      const teamScore = teamCompleted ? 25 : 0
      const projectsScore = projectsCompleted ? 25 : 0
      const awardsScore = awardsCompleted ? 25 : 0
      const overall = Math.round(companyScore + teamScore + projectsScore + awardsScore)

      // Build incomplete items list
      const incompleteItems = []

      if (!company.completed) {
        incompleteItems.push({
          key: 'company',
          label: '公司基本資料',
          route: '/database/company',
          priority: 1
        })
      }

      if (!teamCompleted) {
        incompleteItems.push({
          key: 'team',
          label: '團隊成員',
          route: '/database/team',
          priority: 2
        })
      }

      if (!projectsCompleted) {
        incompleteItems.push({
          key: 'projects',
          label: '專案實績',
          route: '/database/projects',
          priority: 3
        })
      }

      if (!awardsCompleted) {
        incompleteItems.push({
          key: 'awards',
          label: '獲獎紀錄',
          route: '/database/awards',
          priority: 4
        })
      }

      setCompleteness({
        overall,
        company,
        teamMembers: {
          completed: teamCompleted,
          count: teamCount
        },
        projects: {
          completed: projectsCompleted,
          count: projectsCount
        },
        awards: {
          completed: awardsCompleted,
          count: awardsCount
        },
        incompleteItems
      })

    } catch (err) {
      console.error('Failed to load data completeness:', err)
      setError('無法載入資料完整度')
    } finally {
      setLoading(false)
    }
  }, [calculateCompanyCompleteness])

  useEffect(() => {
    loadCompleteness()
  }, [loadCompleteness])

  return {
    completeness,
    loading,
    error,
    refresh: loadCompleteness
  }
}

export default useDataCompleteness
