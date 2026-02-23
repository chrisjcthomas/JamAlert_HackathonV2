"use client"

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { CloudRain, RotateCcw, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface ThresholdFormData {
  rainfallThreshold1h: number
  rainfallThreshold3h: number
  rainfallThreshold12h: number
  rainfallThreshold24h: number
}

const JAMAICA_DEFAULTS: ThresholdFormData = {
  rainfallThreshold1h: 50,
  rainfallThreshold3h: 75,
  rainfallThreshold12h: 150,
  rainfallThreshold24h: 200,
}

const MIN_THRESHOLD = 10
const MAX_THRESHOLD = 500

export function WeatherThresholdSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentThresholds, setCurrentThresholds] = useState<ThresholdFormData | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ThresholdFormData>({
    defaultValues: JAMAICA_DEFAULTS,
  })

  const watchedValues = watch()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchCurrentThresholds()
  }, [])

  const fetchCurrentThresholds = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/admin/weather/thresholds")
      
      if (!response.ok) {
        throw new Error("Failed to fetch thresholds")
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const thresholds: ThresholdFormData = {
          rainfallThreshold1h: data.data.rainfallThreshold1h,
          rainfallThreshold3h: data.data.rainfallThreshold3h,
          rainfallThreshold12h: data.data.rainfallThreshold12h,
          rainfallThreshold24h: data.data.rainfallThreshold24h,
        }
        setCurrentThresholds(thresholds)
        reset(thresholds)
      }
    } catch (error) {
      console.error("Error fetching thresholds:", error)
      toast.error("Failed to load current thresholds. Using defaults.")
      reset(JAMAICA_DEFAULTS)
    } finally {
      setLoading(false)
    }
  }

  const validateThresholds = (data: ThresholdFormData): string | null => {
    // Check minimum and maximum values
    const values = [
      data.rainfallThreshold1h,
      data.rainfallThreshold3h,
      data.rainfallThreshold12h,
      data.rainfallThreshold24h,
    ]

    for (const value of values) {
      if (value < MIN_THRESHOLD) {
        return `All thresholds must be at least ${MIN_THRESHOLD}mm`
      }
      if (value > MAX_THRESHOLD) {
        return `All thresholds must be at most ${MAX_THRESHOLD}mm`
      }
    }

    // Check logical progression: 1h < 3h < 12h < 24h
    if (data.rainfallThreshold1h >= data.rainfallThreshold3h) {
      return "1-hour threshold must be less than 3-hour threshold"
    }
    if (data.rainfallThreshold3h >= data.rainfallThreshold12h) {
      return "3-hour threshold must be less than 12-hour threshold"
    }
    if (data.rainfallThreshold12h >= data.rainfallThreshold24h) {
      return "12-hour threshold must be less than 24-hour threshold"
    }

    return null
  }

  const onSubmit = async (data: ThresholdFormData) => {
    // Validate thresholds
    const validationError = validateThresholds(data)
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch("http://localhost:8000/api/admin/weather/thresholds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save thresholds")
      }

      setCurrentThresholds(data)
      toast.success("Rainfall thresholds updated successfully!")
    } catch (error) {
      console.error("Error saving thresholds:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save thresholds")
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    reset(JAMAICA_DEFAULTS)
    toast.info("Thresholds reset to Jamaica defaults")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            Weather Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-8 w-8" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5" />
          Weather Alert Thresholds
        </CardTitle>
        <CardDescription>
          Configure rainfall accumulation thresholds for triggering weather alerts.
          Thresholds must follow logical progression: 1h &lt; 3h &lt; 12h &lt; 24h
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alert Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              These thresholds determine when rainfall alerts are triggered. Changes take effect immediately
              for all monitored locations.
            </AlertDescription>
          </Alert>

          {/* Threshold Inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 1-hour threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold1h">
                1-Hour Threshold (mm)
                <span className="text-muted-foreground text-sm ml-2">
                  Heavy rain warning
                </span>
              </Label>
              <Input
                id="threshold1h"
                type="number"
                min={MIN_THRESHOLD}
                max={MAX_THRESHOLD}
                step={5}
                {...register("rainfallThreshold1h", {
                  required: "1-hour threshold is required",
                  min: { value: MIN_THRESHOLD, message: `Minimum ${MIN_THRESHOLD}mm` },
                  max: { value: MAX_THRESHOLD, message: `Maximum ${MAX_THRESHOLD}mm` },
                  valueAsNumber: true,
                })}
                className={errors.rainfallThreshold1h ? "border-red-500" : ""}
              />
              {errors.rainfallThreshold1h && (
                <p className="text-sm text-red-500">{errors.rainfallThreshold1h.message}</p>
              )}
            </div>

            {/* 3-hour threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold3h">
                3-Hour Threshold (mm)
                <span className="text-muted-foreground text-sm ml-2">
                  Heavy rain warning
                </span>
              </Label>
              <Input
                id="threshold3h"
                type="number"
                min={MIN_THRESHOLD}
                max={MAX_THRESHOLD}
                step={5}
                {...register("rainfallThreshold3h", {
                  required: "3-hour threshold is required",
                  min: { value: MIN_THRESHOLD, message: `Minimum ${MIN_THRESHOLD}mm` },
                  max: { value: MAX_THRESHOLD, message: `Maximum ${MAX_THRESHOLD}mm` },
                  valueAsNumber: true,
                })}
                className={errors.rainfallThreshold3h ? "border-red-500" : ""}
              />
              {errors.rainfallThreshold3h && (
                <p className="text-sm text-red-500">{errors.rainfallThreshold3h.message}</p>
              )}
            </div>

            {/* 12-hour threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold12h">
                12-Hour Threshold (mm)
                <span className="text-muted-foreground text-sm ml-2">
                  Flood warning
                </span>
              </Label>
              <Input
                id="threshold12h"
                type="number"
                min={MIN_THRESHOLD}
                max={MAX_THRESHOLD}
                step={5}
                {...register("rainfallThreshold12h", {
                  required: "12-hour threshold is required",
                  min: { value: MIN_THRESHOLD, message: `Minimum ${MIN_THRESHOLD}mm` },
                  max: { value: MAX_THRESHOLD, message: `Maximum ${MAX_THRESHOLD}mm` },
                  valueAsNumber: true,
                })}
                className={errors.rainfallThreshold12h ? "border-red-500" : ""}
              />
              {errors.rainfallThreshold12h && (
                <p className="text-sm text-red-500">{errors.rainfallThreshold12h.message}</p>
              )}
            </div>

            {/* 24-hour threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold24h">
                24-Hour Threshold (mm)
                <span className="text-muted-foreground text-sm ml-2">
                  Flood warning
                </span>
              </Label>
              <Input
                id="threshold24h"
                type="number"
                min={MIN_THRESHOLD}
                max={MAX_THRESHOLD}
                step={5}
                {...register("rainfallThreshold24h", {
                  required: "24-hour threshold is required",
                  min: { value: MIN_THRESHOLD, message: `Minimum ${MIN_THRESHOLD}mm` },
                  max: { value: MAX_THRESHOLD, message: `Maximum ${MAX_THRESHOLD}mm` },
                  valueAsNumber: true,
                })}
                className={errors.rainfallThreshold24h ? "border-red-500" : ""}
              />
              {errors.rainfallThreshold24h && (
                <p className="text-sm text-red-500">{errors.rainfallThreshold24h.message}</p>
              )}
            </div>
          </div>

          {/* Current Values Display */}
          {currentThresholds && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Current Active Thresholds:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">1h:</span>{" "}
                  <span className="font-medium">{currentThresholds.rainfallThreshold1h}mm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">3h:</span>{" "}
                  <span className="font-medium">{currentThresholds.rainfallThreshold3h}mm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">12h:</span>{" "}
                  <span className="font-medium">{currentThresholds.rainfallThreshold12h}mm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">24h:</span>{" "}
                  <span className="font-medium">{currentThresholds.rainfallThreshold24h}mm</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToDefaults}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner className="h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Thresholds
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

