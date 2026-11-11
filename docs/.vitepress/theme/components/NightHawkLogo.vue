<script setup lang="ts">
import logoUrl from '../NightHawk.png'

withDefaults(defineProps<{ size?: number }>(), { size: 56 })
</script>

<template>
  <img
    class="NightHawkLogo"
    :src="logoUrl"
    :width="size"
    :height="size"
    alt="NightHawk"
  />
</template>

<style scoped>
.NightHawkLogo {
  display: block;
  object-fit: contain;
}
</style>
