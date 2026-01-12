import { env } from '@/configs/env'

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
}

const colors = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[35m',   // Magenta
  success: '\x1b[32m', // Green
  reset: '\x1b[0m',
}

function formatLog(entry: LogEntry): string {
  const color = colors[entry.level]
  const levelStr = entry.level.toUpperCase().padEnd(7)
  
  let output = `${color}[${levelStr}]${colors.reset} ${entry.timestamp} - ${entry.message}`
  
  if (entry.data) {
    output += `\n${JSON.stringify(entry.data, null, 2)}`
  }
  
  return output
}

function createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  }
}

export const logger = {
  info(message: string, data?: any) {
    const entry = createLogEntry('info', message, data)
    console.log(formatLog(entry))
  },
  
  warn(message: string, data?: any) {
    const entry = createLogEntry('warn', message, data)
    console.warn(formatLog(entry))
  },
  
  error(message: string, data?: any) {
    const entry = createLogEntry('error', message, data)
    console.error(formatLog(entry))
  },
  
  debug(message: string, data?: any) {
    if (env.NODE_ENV === 'development') {
      const entry = createLogEntry('debug', message, data)
      console.log(formatLog(entry))
    }
  },
  
  success(message: string, data?: any) {
    const entry = createLogEntry('success', message, data)
    console.log(formatLog(entry))
  },
}