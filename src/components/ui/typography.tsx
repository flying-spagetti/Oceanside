import * as React from "react"

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

export const Title: React.FC<TypographyProps> = ({ children, className }) => {
  return (
    <h1 className={`text-4xl font-bold ${className || ''}`}>
      {children}
    </h1>
  )
}

export const Paragraph: React.FC<TypographyProps> = ({ children, className }) => {
  return (
    <p className={`text-base ${className || ''}`}>
      {children}
    </p>
  )
}

export const Typography = {
  Title,
  Paragraph
} 