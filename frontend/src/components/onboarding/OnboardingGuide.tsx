import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Circle,
  FolderKanban,
  Users,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import type { DataCompleteness } from '@/hooks/useDataCompleteness'

interface OnboardingGuideProps {
  completeness: DataCompleteness
  onClose?: () => void
  onComplete?: () => void
}

/**
 * Onboarding guide component for first-time users
 * Shows step-by-step setup process with progress tracking
 *
 * @example
 * ```tsx
 * <OnboardingGuide
 *   completeness={completeness}
 *   onClose={() => setShowOnboarding(false)}
 *   onComplete={() => toast.success('設定完成！')}
 * />
 * ```
 */
export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  completeness,
  onClose,
  onComplete
}) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Check localStorage for onboarding completion
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    const hasSeenOnboarding = localStorage.getItem('onboarding_seen')

    // Show onboarding if not completed and overall < 80%
    if (!hasCompletedOnboarding && !hasSeenOnboarding && completeness.overall < 80) {
      setOpen(true)
    }
  }, [completeness.overall])

  // Define onboarding steps
  const steps = [
    {
      key: 'company',
      title: '公司基本資料',
      description: '建立您的公司基本資訊，這是開始使用系統的第一步',
      icon: Building2,
      route: '/database/company',
      completed: completeness.company.completed,
      required: true,
      priority: 1
    },
    {
      key: 'team',
      title: '團隊成員',
      description: '新增至少一位團隊成員，提升標書的專業性',
      icon: Users,
      route: '/database/team',
      completed: completeness.teamMembers.completed,
      required: true,
      priority: 2
    },
    {
      key: 'projects',
      title: '專案實績',
      description: '記錄公司的專案經驗，增強標書的說服力',
      icon: FolderKanban,
      route: '/database/projects',
      completed: completeness.projects.completed,
      required: true,
      priority: 3
    },
    {
      key: 'awards',
      title: '獲獎紀錄',
      description: '展示公司榮譽與成就（選填）',
      icon: Award,
      route: '/database/awards',
      completed: completeness.awards.completed,
      required: false,
      priority: 4
    }
  ]

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem('onboarding_seen', 'true')
    onClose?.()
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_seen', 'true')
    setOpen(false)
    onClose?.()
  }

  const handleStartSetup = (route: string) => {
    localStorage.setItem('onboarding_in_progress', 'true')
    setOpen(false)
    navigate(route)
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.removeItem('onboarding_in_progress')
    setOpen(false)
    onComplete?.()
  }

  const completedSteps = steps.filter(step => step.completed).length
  const requiredSteps = steps.filter(step => step.required).length
  const requiredCompletedSteps = steps.filter(step => step.required && step.completed).length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">歡迎使用智能標案產生器</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            完成以下設定，讓 AI 為您生成更專業的標書內容
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">整體完成度</span>
            <span className="text-muted-foreground">
              {completedSteps} / {steps.length} 完成
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            必填項目: {requiredCompletedSteps} / {requiredSteps} 完成
          </p>
        </div>

        {/* Setup Steps */}
        <div className="space-y-3">
          {steps.map((step) => {
            const StepIcon = step.icon
            return (
              <Card
                key={step.key}
                className={`transition-all ${
                  step.completed ? 'border-green-200 bg-green-50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        step.completed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {step.title}
                          {!step.required && (
                            <span className="text-xs font-normal text-muted-foreground">
                              (選填)
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                {!step.completed && (
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      variant={step.required ? 'default' : 'outline'}
                      onClick={() => handleStartSetup(step.route)}
                      className="w-full sm:w-auto"
                    >
                      {step.required ? '立即設定' : '選擇設定'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {completeness.overall >= 75 ? (
              <span className="text-green-600 font-medium">
                設定已完成 {completeness.overall}%，可以開始使用核心功能
              </span>
            ) : (
              <span>
                建議完成至少 75% 以獲得最佳體驗
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              稍後設定
            </Button>
            {completeness.overall >= 75 && (
              <Button onClick={handleComplete}>
                完成引導
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OnboardingGuide
