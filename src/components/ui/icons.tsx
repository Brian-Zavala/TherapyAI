import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

function getIconProps({ size = 20, ...props }: IconProps): React.SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export const CalendarIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

export const ClockIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

export const VideoIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
)

export const PlusIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
)

export const HeartIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
)

export const SparklesIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <path d="M12 3l1.912 5.813 6.088.387-4.236 4.41L17.056 19l-5.056-3.465L6.944 19l1.292-5.39L4 9.2l6.088-.387z"></path>
  </svg>
)

export const TrophyIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
)

export const TargetIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
)

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
)

export const ArrowDownIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
)

export const TrendingUpIcon: React.FC<IconProps> = (props) => (
  <svg {...getIconProps(props)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
)
