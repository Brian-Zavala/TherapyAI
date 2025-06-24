/**
 * Centralized Icon Exports for Tree Shaking
 * Use these imports instead of importing from icon libraries directly
 * This ensures optimal bundle size by only including used icons
 */

// Lucide React Icons - Tree-shakeable exports
export { default as BellIcon } from 'lucide-react/dist/esm/icons/bell';
export { default as UserIcon } from 'lucide-react/dist/esm/icons/user';
export { default as SettingsIcon } from 'lucide-react/dist/esm/icons/settings';
export { default as HomeIcon } from 'lucide-react/dist/esm/icons/home';
export { default as CalendarIcon } from 'lucide-react/dist/esm/icons/calendar';
export { default as ClockIcon } from 'lucide-react/dist/esm/icons/clock';
export { default as HeartIcon } from 'lucide-react/dist/esm/icons/heart';
export { default as MessageSquareIcon } from 'lucide-react/dist/esm/icons/message-square';
export { default as PhoneIcon } from 'lucide-react/dist/esm/icons/phone';
export { default as VideoIcon } from 'lucide-react/dist/esm/icons/video';
export { default as ChevronDownIcon } from 'lucide-react/dist/esm/icons/chevron-down';
export { default as ChevronUpIcon } from 'lucide-react/dist/esm/icons/chevron-up';
export { default as ChevronLeftIcon } from 'lucide-react/dist/esm/icons/chevron-left';
export { default as ChevronRightIcon } from 'lucide-react/dist/esm/icons/chevron-right';
export { default as CheckIcon } from 'lucide-react/dist/esm/icons/check';
export { default as XIcon } from 'lucide-react/dist/esm/icons/x';
export { default as AlertCircleIcon } from 'lucide-react/dist/esm/icons/alert-circle';
export { default as InfoIcon } from 'lucide-react/dist/esm/icons/info';
export { default as TrashIcon } from 'lucide-react/dist/esm/icons/trash-2';
export { default as EditIcon } from 'lucide-react/dist/esm/icons/edit';
export { default as PlusIcon } from 'lucide-react/dist/esm/icons/plus';
export { default as MinusIcon } from 'lucide-react/dist/esm/icons/minus';
export { default as SearchIcon } from 'lucide-react/dist/esm/icons/search';
export { default as LoaderIcon } from 'lucide-react/dist/esm/icons/loader';
export { default as FilterIcon } from 'lucide-react/dist/esm/icons/filter';
export { default as DownloadIcon } from 'lucide-react/dist/esm/icons/download';
export { default as UploadIcon } from 'lucide-react/dist/esm/icons/upload';
export { default as EyeIcon } from 'lucide-react/dist/esm/icons/eye';
export { default as EyeOffIcon } from 'lucide-react/dist/esm/icons/eye-off';
export { default as MailIcon } from 'lucide-react/dist/esm/icons/mail';
export { default as LogOutIcon } from 'lucide-react/dist/esm/icons/log-out';
export { default as LogInIcon } from 'lucide-react/dist/esm/icons/log-in';
export { default as MenuIcon } from 'lucide-react/dist/esm/icons/menu';
export { default as RefreshCwIcon } from 'lucide-react/dist/esm/icons/refresh-cw';
export { default as ArrowRightIcon } from 'lucide-react/dist/esm/icons/arrow-right';
export { default as ArrowLeftIcon } from 'lucide-react/dist/esm/icons/arrow-left';
export { default as CheckCircleIcon } from 'lucide-react/dist/esm/icons/check-circle';
export { default as MicIcon } from 'lucide-react/dist/esm/icons/mic';
export { default as MicOffIcon } from 'lucide-react/dist/esm/icons/mic-off';
export { default as PauseIcon } from 'lucide-react/dist/esm/icons/pause';
export { default as PlayIcon } from 'lucide-react/dist/esm/icons/play';

// Export type for Icon props
export type IconProps = {
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

// Example usage:
// import { BellIcon, UserIcon } from '@/lib/icons';
// <BellIcon className="w-5 h-5" />