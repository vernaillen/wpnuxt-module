<script setup lang="ts">
import { useHead } from '#imports'
import { useGeneralSettings, usePosts } from '#wpnuxt'

const { data: posts } = await usePosts()
const { data: settings } = await useGeneralSettings()
const { data: latestPost } = await usePosts({ limit: 1 })

useHead({
  title: settings.value?.title
})
</script>

<template>
  <div>
    <ULandingSection
      id="posts"
      :title="settings.title"
      :headline="settings.description"
      description="WordPress posts are shown below as cards. WordPress pages are listed above in the header."
    >
      <UPageGrid>
        <ULandingCard
          v-for="post, index in posts"
          :key="index"
          :title="post.title"
          :description="post.date?.split('T')[0]"
          :to="post.uri"
        >
          <img
            v-if="post?.featuredImage?.node?.sourceUrl"
            :src="post.featuredImage.node.sourceUrl"
            class="w-full rounded-md"
          >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="post.excerpt" />
        </ULandingCard>
      </UPageGrid>
    </ULandingSection>
    <ULandingSection
      id="posts"
      title="Latest Post"
    >
      <ULandingCard
        :title="latestPost[0]?.title"
        :description="latestPost[0]?.date?.split('T')[0]"
        :to="latestPost[0]?.uri"
      >
        <img
          v-if="latestPost[0]?.featuredImage?.node?.sourceUrl"
          :src="latestPost[0]?.featuredImage.node.sourceUrl"
          class="w-full rounded-md"
        >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="latestPost[0]?.excerpt" />
      </ULandingCard>
    </ULandingSection>
  </div>
</template>
