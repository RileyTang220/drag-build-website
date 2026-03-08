// Logger utility for application logging
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${prefix} ${message}`
  }

  info(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('info', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args)
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }
}

const logger = new Logger()

export default logger
