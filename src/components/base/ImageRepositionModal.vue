<script setup>
/**
 * Image reposition ("crop") editor.
 *
 * Lets the user drag and zoom a freshly selected image inside a square frame to
 * decide which part of it should be visible. On confirm it renders the chosen
 * region onto a canvas and emits the result as a new `File`, ready to be
 * uploaded through the existing multipart endpoints.
 *
 * Used by both character and campaign image uploads.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { clampOffset, computeDisplaySize, computeCropRect } from '@/utils/imageReposition.js'

const props = defineProps({
  /** The originally selected file to reposition. */
  file: {
    type: File,
    required: true,
  },
  /** Edge length, in pixels, of the square output image. */
  outputSize: {
    type: Number,
    default: 512,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

// Square editing viewport, in CSS pixels.
const FRAME_SIZE = 288

const imageEl = ref(null)
const displayUrl = ref(null)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const offset = ref({ x: 0, y: 0 })
const zoom = ref(1)
const isDragging = ref(false)
const isProcessing = ref(false)
const dragStart = ref({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

const displaySize = computed(() =>
  computeDisplaySize(naturalWidth.value, naturalHeight.value, FRAME_SIZE, FRAME_SIZE, zoom.value),
)

const imageStyle = computed(() => ({
  width: `${displaySize.value.width}px`,
  height: `${displaySize.value.height}px`,
  transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
}))

function centerImage() {
  const size = displaySize.value
  offset.value = clampOffset(
    (FRAME_SIZE - size.width) / 2,
    (FRAME_SIZE - size.height) / 2,
    size.width,
    size.height,
    FRAME_SIZE,
    FRAME_SIZE,
  )
}

function onImageLoad() {
  naturalWidth.value = imageEl.value.naturalWidth
  naturalHeight.value = imageEl.value.naturalHeight
  zoom.value = 1
  centerImage()
}

function onZoomInput(event) {
  const nextZoom = Number(event.target.value)
  const currentSize = displaySize.value
  const nextSize = computeDisplaySize(
    naturalWidth.value,
    naturalHeight.value,
    FRAME_SIZE,
    FRAME_SIZE,
    nextZoom,
  )

  // Keep the point at the center of the frame fixed while zooming.
  const centerX = FRAME_SIZE / 2
  const centerY = FRAME_SIZE / 2
  const relativeX = currentSize.width ? (centerX - offset.value.x) / currentSize.width : 0.5
  const relativeY = currentSize.height ? (centerY - offset.value.y) / currentSize.height : 0.5

  zoom.value = nextZoom
  offset.value = clampOffset(
    centerX - relativeX * nextSize.width,
    centerY - relativeY * nextSize.height,
    nextSize.width,
    nextSize.height,
    FRAME_SIZE,
    FRAME_SIZE,
  )
}

function onPointerDown(event) {
  isDragging.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
    offsetX: offset.value.x,
    offsetY: offset.value.y,
  }
}

function onPointerMove(event) {
  if (!isDragging.value) return
  const size = displaySize.value
  offset.value = clampOffset(
    dragStart.value.offsetX + (event.clientX - dragStart.value.x),
    dragStart.value.offsetY + (event.clientY - dragStart.value.y),
    size.width,
    size.height,
    FRAME_SIZE,
    FRAME_SIZE,
  )
}

function onPointerUp() {
  isDragging.value = false
}

function buildCroppedFile() {
  const size = displaySize.value
  const crop = computeCropRect(
    offset.value.x,
    offset.value.y,
    size.width,
    size.height,
    FRAME_SIZE,
    FRAME_SIZE,
    naturalWidth.value,
    naturalHeight.value,
  )

  const canvas = document.createElement('canvas')
  canvas.width = props.outputSize
  canvas.height = props.outputSize
  const context = canvas.getContext('2d')
  context.drawImage(
    imageEl.value,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    props.outputSize,
    props.outputSize,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to process image'))
          return
        }
        const baseName = (props.file.name || 'image').replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${baseName}-repositioned.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  })
}

async function confirm() {
  isProcessing.value = true
  try {
    const croppedFile = await buildCroppedFile()
    emit('confirm', croppedFile)
  } catch (error) {
    console.error('Failed to reposition image:', error)
    emit('cancel')
  } finally {
    isProcessing.value = false
  }
}

function cancel() {
  emit('cancel')
}

onMounted(() => {
  displayUrl.value = URL.createObjectURL(props.file)
})

onBeforeUnmount(() => {
  if (displayUrl.value) URL.revokeObjectURL(displayUrl.value)
})
</script>

<template>
  <BaseModal @close="cancel">
    <div class="bg-[var(--color-surface)] rounded-lg shadow-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-bold mb-1">Reposition image</h3>
      <p class="text-sm text-muted mb-4">Drag the image to reposition it, then zoom to fit.</p>

      <div class="flex justify-center">
        <div
          class="relative overflow-hidden rounded-lg border-2 touch-none select-none"
          :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
          :style="{
            width: `${FRAME_SIZE}px`,
            height: `${FRAME_SIZE}px`,
            borderColor: 'var(--color-primary-300)',
          }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="onPointerUp"
        >
          <img
            v-if="displayUrl"
            ref="imageEl"
            :src="displayUrl"
            alt="Image to reposition"
            draggable="false"
            class="absolute top-0 left-0 max-w-none"
            :style="imageStyle"
            @load="onImageLoad"
          />
        </div>
      </div>

      <div class="mt-4">
        <label for="image-zoom" class="block text-sm font-medium text-default mb-1"> Zoom </label>
        <input
          id="image-zoom"
          type="range"
          min="1"
          max="3"
          step="0.01"
          :value="zoom"
          class="w-full"
          @input="onZoomInput"
        />
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" type="button" :disabled="isProcessing" @click="cancel">
          Cancel
        </BaseButton>
        <BaseButton variant="add" type="button" :loading="isProcessing" @click="confirm">
          Apply
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
