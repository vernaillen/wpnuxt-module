import { getRelativeImagePath } from '../util/images'
import type { Post, Page } from '#graphql-operations'

const _useFeaturedImage = (contentNode: Post | Page): string | undefined => {
  const sourceUrl = contentNode?.featuredImage?.node?.sourceUrl
  if (sourceUrl) return getRelativeImagePath(sourceUrl)
  else return undefined
}

export const useFeaturedImage = _useFeaturedImage
