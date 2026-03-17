import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { ReactNode } from 'react';
import type { Variants } from 'framer-motion';
import { cn } from '../lib/cn';

interface SectionWrapperProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function SectionWrapper({
  id,
  title,
  subtitle,
  children,
  className,
}: SectionWrapperProps) {
  const reduced = useReducedMotion();

  const variants: Variants | undefined = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: 'easeOut' },
        },
      };

  return (
    <motion.section
      id={id}
      initial={reduced ? undefined : 'hidden'}
      whileInView={reduced ? undefined : 'visible'}
      viewport={{ once: true, margin: '-50px' }}
      variants={variants}
      className={cn('relative scroll-mt-20 py-16 md:py-24', className)}
    >
      <div className="mb-10">
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-2 text-base text-white/50">
            {subtitle}
          </p>
        )}

        <div className="mt-4 h-px w-16 bg-gradient-to-r from-accent to-transparent" />
      </div>

      {children}
    </motion.section>
  );
}