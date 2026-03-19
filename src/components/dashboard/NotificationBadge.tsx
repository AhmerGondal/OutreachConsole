import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold tabular-nums text-white"
      >
        {count > 99 ? '99+' : count}
      </motion.span>
    </AnimatePresence>
  );
}
