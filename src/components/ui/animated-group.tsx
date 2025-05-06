import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type Variants } from 'framer-motion'

interface AnimatedGroupProps extends Omit<HTMLMotionProps<"div">, "variants"> {
    variants?: {
        initial?: Record<string, any>
        animate?: Record<string, any>
        item?: Record<string, any>
    }
    children: React.ReactNode
}

export function AnimatedGroup({ children, variants, className, ...props }: AnimatedGroupProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={variants}
            className={cn('', className)}
            {...props}>
            {children}
        </motion.div>
    )
} 