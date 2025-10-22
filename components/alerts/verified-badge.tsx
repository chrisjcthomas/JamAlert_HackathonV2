"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface VerificationReport {
  timestamp: number
  description: string
  userId: string
}

export interface VerifiedBadgeProps {
  verified: boolean
  verificationCount: number
  verificationReports?: VerificationReport[]
  className?: string
}

/**
 * VerifiedBadge Component
 * 
 * Displays community verification status for alerts with color-coded severity:
 * - 5+ reports: Critical (red)
 * - 3-4 reports: High (orange)
 * - 1-2 reports: Medium (yellow)
 * - 0 reports: Unverified (gray)
 * 
 * Shows tooltip with report details on hover
 */
export function VerifiedBadge({
  verified,
  verificationCount,
  verificationReports = [],
  className,
}: VerifiedBadgeProps) {
  // Determine badge color based on verification count
  const getBadgeVariant = () => {
    if (!verified || verificationCount === 0) {
      return "secondary" // Gray
    }
    if (verificationCount >= 5) {
      return "destructive" // Red (critical)
    }
    if (verificationCount >= 3) {
      return "default" // Orange (high) - we'll use custom class
    }
    return "default" // Yellow (medium) - we'll use custom class
  }

  const getBadgeColor = () => {
    if (!verified || verificationCount === 0) {
      return "bg-gray-300 text-gray-700 hover:bg-gray-400"
    }
    if (verificationCount >= 5) {
      return "bg-red-500 text-white hover:bg-red-600"
    }
    if (verificationCount >= 3) {
      return "bg-orange-500 text-white hover:bg-orange-600"
    }
    return "bg-yellow-500 text-gray-900 hover:bg-yellow-600"
  }

  const getBadgeText = () => {
    if (!verified || verificationCount === 0) {
      return "Unverified"
    }
    return `Verified by ${verificationCount} report${verificationCount > 1 ? 's' : ''}`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const TooltipContentComponent = () => {
    if (!verified || verificationCount === 0) {
      return (
        <div className="text-sm">
          <p className="font-semibold mb-1">No Community Reports</p>
          <p className="text-muted-foreground">
            This alert has not been verified by community members yet.
          </p>
        </div>
      )
    }

    return (
      <div className="text-sm max-w-xs">
        <p className="font-semibold mb-2">
          Community Verified ({verificationCount} report{verificationCount > 1 ? 's' : ''})
        </p>
        {verificationReports.length > 0 ? (
          <div className="space-y-2">
            {verificationReports.slice(0, 5).map((report, index) => (
              <div key={index} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {formatTimestamp(report.timestamp)} • User: {report.userId}
                </p>
                <p className="text-sm">{report.description}</p>
              </div>
            ))}
            {verificationReports.length > 5 && (
              <p className="text-xs text-muted-foreground italic">
                +{verificationReports.length - 5} more report{verificationReports.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {verificationCount} community member{verificationCount > 1 ? 's have' : ' has'} verified this alert.
          </p>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getBadgeVariant()}
            className={cn(
              "flex items-center gap-1.5 cursor-help transition-colors",
              getBadgeColor(),
              className
            )}
          >
            {verified && verificationCount > 0 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="text-xs font-medium">{getBadgeText()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <TooltipContentComponent />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact version of VerifiedBadge for use in lists or tight spaces
 */
export function VerifiedBadgeCompact({
  verified,
  verificationCount,
  verificationReports = [],
  className,
}: VerifiedBadgeProps) {
  const getBadgeColor = () => {
    if (!verified || verificationCount === 0) {
      return "bg-gray-300 text-gray-700"
    }
    if (verificationCount >= 5) {
      return "bg-red-500 text-white"
    }
    if (verificationCount >= 3) {
      return "bg-orange-500 text-white"
    }
    return "bg-yellow-500 text-gray-900"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full w-6 h-6 cursor-help transition-colors",
              getBadgeColor(),
              className
            )}
          >
            {verified && verificationCount > 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="text-sm">
            <p className="font-semibold mb-1">
              {verified && verificationCount > 0
                ? `Verified by ${verificationCount} report${verificationCount > 1 ? 's' : ''}`
                : "Unverified"}
            </p>
            {verificationReports.length > 0 && (
              <div className="space-y-1 mt-2">
                {verificationReports.slice(0, 3).map((report, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    • {report.description}
                  </p>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

