<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps({
  campaigns: {
    type: Array,
    required: true,
  },
  currentCampaignId: {
    type: Number,
    required: true,
  },
})

const listRef = ref(null)
const isScrollable = ref(false)
let resizeObserver = null

// Function to calculate if the list is currently scrollable
const checkScrollable = () => {
  if (listRef.value) {
    isScrollable.value = listRef.value.scrollHeight > listRef.value.clientHeight
  }
}

onMounted(() => {
  if (listRef.value) {
    // Setup observer to re-calculate when element size changes
    resizeObserver = new ResizeObserver(() => {
      checkScrollable()
    })
    resizeObserver.observe(listRef.value)
  }

  // Initial check when DOM is ready
  nextTick(checkScrollable)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Re-check when the campaigns array updates (items added/removed)
watch(
  () => props.campaigns,
  () => {
    nextTick(checkScrollable)
  },
  { deep: true },
)
</script>

<template>
  <aside
    class="w-16 flex flex-col min-h-screen items-center py-4 space-y-4 relative custom-gradient flex-shrink-0"
  >
    <!-- Scroll hint at top if scrollable -->
    <div
      v-if="isScrollable"
      class="scroll-hint top-2 z-10 animate-pulse"
    ></div>

    <!-- Campaign list wrapper (Added ref="listRef" here) -->
    <div
      ref="listRef"
      class="campaign-list flex-1 flex flex-col items-center space-y-4 max-h-[calc(10*2.5rem+2rem)] w-full overflow-y-auto"
    >
      <RouterLink
        v-for="userCampaign in campaigns"
        :key="userCampaign.id"
        :to="{ name: 'CampaignView', params: { id: userCampaign.id } }"
        class="campaign-selector group"
        :class="{
          'campaign-selector--active': Number(currentCampaignId) === Number(userCampaign.id),
        }"
        :style="
          userCampaign.imageUrl
            ? {
                backgroundImage: `url(${userCampaign.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        "
      >
        <span
          class="campaign-tooltip"
        >
          {{ userCampaign.name }}
        </span>
      </RouterLink>
    </div>

    <!-- Scroll hint at bottom if scrollable -->
    <div
      class="h-2 rounded-md flex items-center justify-center text-white font-medium relative group w-full"
    >
      <div
        v-if="isScrollable"
        class="scroll-hint bottom-2 animate-pulse"
      ></div>
    </div>

    <!-- Navigation action button -->
    <RouterLink
      to="/campaigns"
      class="campaign-nav-button group"
    >
      <span class="text-xl">+</span>
      <span
        class="campaign-nav-tooltip"
      >
        to campaign overview
      </span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.custom-gradient {
  background: linear-gradient(
    to bottom,
    var(--color-primary-100) 0%,
    var(--color-primary-600) 50%,
    var(--color-primary-100) 100%
  );
}

.campaign-list {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.campaign-list::-webkit-scrollbar {
  display: none;
}

/* Animation for the scroll hint */
@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
