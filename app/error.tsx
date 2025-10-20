'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-foreground">Something went wrong</CardTitle>
            <CardDescription className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error.message && (
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground font-mono">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => reset()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full border-border hover:border-primary"
              >
                <Shield className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
