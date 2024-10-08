/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineNuxtModule, addComponentsDir, addServerHandler, createResolver, installModule, addTemplate, addTypeTemplate, addImports, type Resolver, addPlugin, hasNuxtModule } from '@nuxt/kit'
import consola from 'consola'
import { name, version } from '../package.json'
import type { WPNuxtConfig } from './types'
import { initLogger, mergeQueries, validateConfig } from './utils'
import { generateWPNuxtComposables } from './generate'
import type { WPNuxtContext } from './context'

const defaultConfigs: WPNuxtConfig = {
  wordpressUrl: '',
  frontendUrl: '',
  defaultMenuName: 'main',
  enableCache: true,
  staging: false,
  logLevel: 3,
  composablesPrefix: 'useWP',
  hasBlocksModule: false,
  hasAuthModule: false
}

export default defineNuxtModule<WPNuxtConfig>({
  meta: {
    name,
    version,
    configKey: 'wpNuxt',
    nuxt: '>=3.1.0'
  },
  // Default configuration options of the Nuxt module
  defaults: defaultConfigs,
  async setup(options: any, nuxt: any) {
    const startTime = new Date().getTime()
    consola.log('::: Starting WPNuxt setup ::: ')

    const publicWPNuxtConfig: WPNuxtConfig = {
      wordpressUrl: process.env.WPNUXT_WORDPRESS_URL || options.wordpressUrl!,
      frontendUrl: process.env.WPNUXT_FRONTEND_URL || options.frontendUrl!,
      defaultMenuName: process.env.WPNUXT_DEFAULT_MENU_NAME || options.defaultMenuName!,
      enableCache: process.env.WPNUXT_ENABLE_CACHE ? process.env.WPNUXT_ENABLE_CACHE === 'true' : options.enableCache!,
      staging: process.env.WPNUXT_STAGING === 'true' || options.staging!,
      downloadSchema: process.env.WPNUXT_DOWNLOAD_SCHEMA === 'true' || options.downloadSchema,
      logLevel: process.env.WPNUXT_LOG_LEVEL ? Number.parseInt(process.env.WPNUXT_LOG_LEVEL) : options.logLevel,
      composablesPrefix: process.env.WPNUXT_COMPOSABLES_PREFIX || options.composablesPrefix,
      hasBlocksModule: hasNuxtModule('@wpnuxt/blocks'),
      hasAuthModule: hasNuxtModule('@wpnuxt/auth')
    }
    nuxt.options.runtimeConfig.public.wpNuxt = publicWPNuxtConfig
    validateConfig(publicWPNuxtConfig)
    const logger = initLogger(publicWPNuxtConfig.logLevel)
    logger.info('config:', publicWPNuxtConfig)

    logger.info('Connecting GraphQL to', publicWPNuxtConfig.wordpressUrl)
    logger.info('frontendUrl:', publicWPNuxtConfig.frontendUrl)
    if (publicWPNuxtConfig.enableCache) logger.info('Cache enabled')
    logger.debug('Debug mode enabled, log level:', publicWPNuxtConfig.logLevel)
    if (publicWPNuxtConfig.staging) logger.info('Staging enabled')

    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolve('./runtime', path)
    const srcResolver: Resolver = createResolver(nuxt.options.srcDir)

    nuxt.options.alias['#wpnuxt'] = resolve(nuxt.options.buildDir, 'wpnuxt')
    nuxt.options.alias['#wpnuxt/*'] = resolve(nuxt.options.buildDir, 'wpnuxt', '*')
    nuxt.options.alias['#wpnuxt/types'] = resolve('./types')
    nuxt.options.nitro.alias = nuxt.options.nitro.alias || {}
    nuxt.options.nitro.alias['#wpnuxt/types'] = resolve('./types')

    nuxt.options.nitro.externals = nuxt.options.nitro.externals || {}
    nuxt.options.nitro.externals.inline = nuxt.options.nitro.externals.inline || []

    addPlugin({
      src: resolveRuntimeModule('plugins/vue-sanitize-directive')
    })

    addImports([
      { name: 'isStaging', as: 'isStaging', from: resolveRuntimeModule('./composables/isStaging') },
      { name: 'useWPContent', as: 'useWPContent', from: resolveRuntimeModule('./composables/useWPContent') },
      { name: 'parseDoc', as: 'parseDoc', from: resolveRuntimeModule('./composables/useParser') },
      { name: 'usePrevNextPost', as: 'usePrevNextPost', from: resolveRuntimeModule('./composables/usePrevNextPost') },

      { name: 'loginUser', as: 'loginUser', from: resolveRuntimeModule('./composables/user') },
      { name: 'logoutUser', as: 'logoutUser', from: resolveRuntimeModule('./composables/user') },
      { name: 'getCurrentUserId', as: 'getCurrentUserId', from: resolveRuntimeModule('./composables/user') },
      { name: 'getCurrentUserName', as: 'getCurrentUserName', from: resolveRuntimeModule('./composables/user') },

      { name: 'useTokens', as: 'useTokens', from: resolveRuntimeModule('./composables/useTokens') },
      { name: 'useWPUri', as: 'useWPUri', from: resolveRuntimeModule('./composables/useWPUri') },
      { name: 'useFeaturedImage', as: 'useFeaturedImage', from: resolveRuntimeModule('./composables/useFeaturedImage') }
    ])

    addComponentsDir({
      path: resolveRuntimeModule('./components'),
      pathPrefix: false,
      prefix: '',
      global: true
    })
    addServerHandler({
      route: '/api/wpContent',
      handler: resolveRuntimeModule('./server/api/wpContent.post')
    })
    addServerHandler({
      route: '/api/config',
      handler: resolveRuntimeModule('./server/api/config')
    })

    await installModule('@vueuse/nuxt', {})

    const mergedQueriesFolder = await mergeQueries(nuxt)

    await installModule('nuxt-graphql-middleware', {
      debug: publicWPNuxtConfig.logLevel ? publicWPNuxtConfig.logLevel > 3 : false,
      graphqlEndpoint: `${publicWPNuxtConfig.wordpressUrl}/graphql`,
      downloadSchema: publicWPNuxtConfig.downloadSchema,
      codegenConfig: {
        skipTypename: true,
        useTypeImports: true,
        // inlineFragmentTypes: 'combine',
        dedupeFragments: true,
        onlyOperationTypes: true,
        avoidOptionals: false,
        maybeValue: 'T | undefined',
        namingConvention: {
          enumValues: 'change-case-all#upperCaseFirst'
        }
      },
      codegenSchemaConfig: {
        urlSchemaOptions: {
          headers: {
            Authorization: 'server-token'
          }
        }
      },
      outputDocuments: true,
      autoImportPatterns: [mergedQueriesFolder],
      includeComposables: true,
      devtools: true
    })

    logger.trace('Start generating composables')

    const ctx: WPNuxtContext = await {
      fns: [],
      fnImports: [],
      composablesPrefix: publicWPNuxtConfig.composablesPrefix
    }
    await generateWPNuxtComposables(ctx, mergedQueriesFolder, srcResolver)

    addTemplate({
      write: true,
      filename: 'wpnuxt/index.mjs',
      getContents: () => ctx.generateImports?.() || ''
    })
    addTypeTemplate({
      write: true,
      filename: 'wpnuxt/index.d.ts',
      getContents: () => ctx.generateDeclarations?.() || ''
    })
    nuxt.hook('imports:extend', (autoimports: any) => {
      autoimports.push(...(ctx.fnImports || []))
    })

    nuxt.hook('nitro:init', async (nitro: any) => {
      // Remove content cache when nitro starts
      const keys = await nitro.storage.getKeys('cache:api:wpContent')
      keys.forEach(async (key: any) => {
        if (key.startsWith('cache:api:wpContent')) await nitro.storage.removeItem(key)
      })
    })

    const endTime = new Date().getTime()
    logger.success('::: Finished WPNuxt setup in ' + (endTime - startTime) + 'ms ::: ')
  }
})

declare module '@nuxt/schema' {

  interface RuntimeConfig {
    wpNuxt: {
      faustSecretKey: string
    }
  }

  interface PublicRuntimeConfig {
    wpNuxt: WPNuxtConfig
  }

  interface ConfigSchema {
    wpNuxt: {
      faustSecretKey: string
    }
    runtimeConfig: {
      public?: {
        wpNuxt: WPNuxtConfig
      }
    }
  }
}
export type { WPNuxtConfig, WPNuxtConfigQueries, WPNuxtQuery } from './types'
