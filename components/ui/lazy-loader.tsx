"use client"

import { useState, useEffect, useRef, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface LazyLoaderProps {
  children: ReactNode
  fallback?: ReactNode
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  className?: string
}

/**
 * Lazy loader component that loads content when it enters the viewport
 */
export function LazyLoader({
  children,
  fallback = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  className = ''
}: LazyLoaderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            setHasTriggered(true)
            observer.unobserve(element)
          }
        } else if (!triggerOnce && !hasTriggered) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  return (
    <div ref={elementRef} className={className}>
      {isVisible || hasTriggered ? children : fallback}
    </div>
  )
}

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

/**
 * Lazy loading image component with placeholder
 */
export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(img)
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(img)

    return () => {
      observer.unobserve(img)
    }
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : placeholder}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  )
}

interface LazyListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  itemHeight?: number
  containerHeight?: number
  overscan?: number
  className?: string
}

/**
 * Virtual scrolling list for large datasets
 */
export function LazyList<T>({
  items,
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  className = ''
}: LazyListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan)

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  )
}

interface LazyTabsProps {
  tabs: Array<{
    id: string
    label: string
    content: () => ReactNode
  }>
  defaultTab?: string
  className?: string
}

/**
 * Lazy loading tabs that only render content when activated
 */
export function LazyTabs({ tabs, defaultTab, className = '' }: LazyTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(defaultTab ? [defaultTab] : [tabs[0]?.id])
  )

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setLoadedTabs(prev => new Set([...prev, tabId]))
  }

  return (
    <div className={className}>
      {/* Tab headers */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={activeTab === tab.id ? 'block' : 'hidden'}
          >
            {loadedTabs.has(tab.id) ? (
              tab.content()
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
