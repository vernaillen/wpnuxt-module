import { type LogLevel, createConsola } from 'consola'
import { ref } from 'vue'
import type { WPNuxtConfig } from './types'

const loggerRef = ref()

export const initLogger = (logLevel: LogLevel | undefined) => {
  loggerRef.value = createConsola({
    level: logLevel ? logLevel : 3,
    formatOptions: {
      colors: true,
      compact: true,
      date: true,
      fancy: true
    }
  }).withTag('wpnuxt')
  return loggerRef.value
}

export const getLogger = () => {
  if (loggerRef.value) {
    return loggerRef.value
  }
}

/**
 * Validate the module options.
 */
export function validateConfig(options: Partial<WPNuxtConfig>) {
  if (!options.wordpressUrl || options.wordpressUrl.length === 0) {
    throw new Error('WPNuxt error: WordPress url is missing')
  } else if (options.wordpressUrl.substring(options.wordpressUrl.length - 1) === '/') {
    throw new Error('WPNuxt error: WordPress url should not have a trailing slash: ' + options.wordpressUrl)
  }
  if (options.frontendUrl && options.frontendUrl.substring(options.frontendUrl.length - 1) === '/') {
    throw new Error('WPNuxt error: frontend url should not have a trailing slash: ' + options.frontendUrl)
  }
}
