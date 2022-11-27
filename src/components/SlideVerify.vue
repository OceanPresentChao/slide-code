<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { getRandomNumberByRange } from '@/utils/tool'
interface VerifyProps {
  spliced: boolean
  // 简单的认证，如果y为0，则可能是非人为操作
  verified: boolean
  left: number
  // 滑块的目标位置
  destX: number
}

interface IProps {
  width?: number
  height?: number
  refreshIcon?: string
  l?: number
  r?: number
  src?: string
  text?: string
  /**
   * @description: 拖拽滑块时的回调，参数为当前滑块拖拽的距离
   */
  onDraw?: (l: number) => void
  /**
   * @description: 用户自定义验证逻辑
   */
  onCustomVerify?: (arg: VerifyProps) => VerifyProps
  /**
   * @description: 刷新时的回调
   */
  onBeforeRefresh?: () => void
  /**
   * @description: 验证成功时的回调
   */
  onSuccess?: () => void
  /**
   * @description: 验证成功时的回调
   */
  onFail?: () => void
  /**
   * @description: 刷新时的回调
   */
  onRefresh?: () => void
}

const props = withDefaults(defineProps<IProps>(), {
  width: 300,
  height: 150,
  refreshIcon: '',
  l: 42,
  r: 9,
  src: '',
  text: '向右滑动滑块填充拼图',
})
const { width, height, src, onBeforeRefresh, onCustomVerify, onDraw, onFail, onRefresh, onSuccess } = props
const canvasRef = ref<HTMLCanvasElement | null>(null)
const blockRef = ref<HTMLCanvasElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const xRef = ref(0)
const yRef = ref(0)
const startXRef = ref(0)
const startYRef = ref(0)
const isMouseDownRef = ref(false)
const sliderLeftRef = ref(0)
const blockWidth = props.l + props.r * 2 + 3// 滑块实际长宽度
const textTip = ref(props.text)
const memos: Array<{ x: number; y: number }> = []

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      createImage({
        url: src || '',
        width: props.width,
        height: props.height,
      }, (img) => {
        drawBlock(img)
      })
    }
  }
})

function createImage(opts: { url: string; width: number; height: number }, callback: (img: HTMLImageElement) => void) {
  const img = new Image(opts.width, opts.height)
  img.src = opts.url
  img.onload = () => {
    imageRef.value = img
    callback(img)
  }
}

function drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, operation: 'fill' | 'clip') {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.arc(x + props.l / 2, y - props.r + 2, props.r, 0.72 * Math.PI, 2.26 * Math.PI)
  ctx.lineTo(x + props.l, y)
  ctx.arc(x + props.l + props.r - 2, y + props.l / 2, props.r, 1.21 * Math.PI, 2.78 * Math.PI)
  ctx.lineTo(x + props.l, y + props.l)
  ctx.lineTo(x, y + props.l)
  ctx.arc(x + props.r - 2, y + props.l / 2, props.r + 0.4, 2.76 * Math.PI, 1.24 * Math.PI, true)
  ctx.lineTo(x, y)
  ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.closePath()
  ctx.stroke()
  // 在已有图像下方绘制
  ctx.globalCompositeOperation = 'destination-over'
  operation === 'fill' ? ctx.fill() : ctx.clip()
}

function drawBlock(img: HTMLImageElement) {
  const canvasCtx = canvasRef.value?.getContext('2d')
  const blockCtx = blockRef.value?.getContext('2d')
  canvasCtx?.clearRect(0, 0, width, height)
  blockCtx?.clearRect(0, 0, width, height)

  // 随机位置创建滑块
  xRef.value = getRandomNumberByRange(blockWidth + 10, width - (blockWidth + 10))
  yRef.value = getRandomNumberByRange(props.r * 2 + 10, height - (blockWidth + 10))

  drawPath(canvasCtx!, xRef.value, yRef.value, 'fill')
  drawPath(blockCtx!, xRef.value, yRef.value, 'clip')

  canvasCtx?.drawImage(img, 0, 0, width, height)
  blockCtx?.drawImage(img, 0, 0, width, height)

  const y1 = yRef.value - props.r * 2 - 1// 滑块起始高度
  const x1 = xRef.value - 3
  const ImageData = blockCtx?.getImageData(x1, y1, blockWidth, blockWidth)
  blockRef.value!.width = blockWidth
  blockCtx?.putImageData(ImageData!, 0, y1)
}

function handleDragStart(ev: MouseEvent | TouchEvent) {
  startXRef.value = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX
  startYRef.value = ev instanceof MouseEvent ? ev.clientY : ev.touches[0].clientY
  isMouseDownRef.value = true
}

function handleDragMove(ev: MouseEvent | TouchEvent) {
  if (!isMouseDownRef.value)
    return false
  ev.preventDefault()
  const eventX = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX
  const eventY = ev instanceof MouseEvent ? ev.clientY : ev.touches[0].clientY
  const moveX = eventX - startXRef.value
  const moveY = eventY - startYRef.value
  if (moveX < 0 || moveX + 38 >= width)
    return false
  sliderLeftRef.value = moveX
  const blockLeft = ((width - 40 - 20) / (width - 40)) * moveX
  blockRef.value!.style.left = `${blockLeft}px`
  onDraw && onDraw(blockLeft)
  memos.push({ x: moveX, y: moveY })
  return true
}

function handleDragEnd(ev: MouseEvent | TouchEvent) {
  if (!isMouseDownRef.value)
    return false
  isMouseDownRef.value = false
  const eventX = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX
  if (eventX === startXRef.value)
    return false
  const { spliced, verified } = onCustomVerify ? onCustomVerify(verify()) : verify()
  if (spliced) {
    if (verified) {
      typeof onSuccess === 'function' && onSuccess()
      setTimeout(reset, 500)
    }
    else {
      textTip.value = '请再试一次'
      reset()
    }
  }
  else {
    typeof onFail === 'function' && onFail()
    setTimeout(reset, 500)
  }
}

function handleRefresh() {
  reset()
  typeof onRefresh === 'function' && onRefresh()
}

function verify(): VerifyProps {
  const averageY = memos.reduce((pre, cur) => {
    return pre + cur.y
  }, 0) / memos.length
  const deviations = memos.map(v => v.y - averageY)
  const stddev = Math.sqrt(deviations.map(v => v ** 2).reduce((pre, cur) => {
    return pre + cur
  }, 0) / deviations.length)
  const left = parseInt(blockRef.value!.style.left)
  return {
    spliced: Math.abs(left - xRef.value) < 10,
    verified: stddev !== 0, // 简单验证拖动轨迹，为零时表示Y轴上下没有波动，可能非人为操作
    left,
    destX: xRef.value,
  }
}

function reset() {
  // 重置样式
  onBeforeRefresh && onBeforeRefresh()
  sliderLeftRef.value = 0
  blockRef.value!.width = props.width
  blockRef.value!.style.left = `${0}px`
  createImage({
    url: src || '',
    width: props.width,
    height: props.height,
  }, (img) => {
    drawBlock(img)
  })
}
</script>

<template>
  <div
    relative
    style="width:fit-content;"
    @mousemove="handleDragMove"
    @mouseup="handleDragEnd"
    @touchmove="handleDragMove"
    @touchend="handleDragEnd"
  >
    <div>
      <canvas id="canvas" ref="canvasRef" :height="height" :width="width" />
      <canvas
        id="block" ref="blockRef" :height="height" :width="width"
        absolute top-0 left-0 hover:cursor-pointer active:cursor-grabbing
        @mousedown="handleDragStart"
        @touchstart.passive="handleDragStart"
      />
    </div>
    <div
      :style="{
        width: `${width}px`,
      }"
      text-center
    >
      <p>
        {{ textTip }}
      </p>
    </div>
    <span
      absolute
      top-0
      right-0
      @click="handleRefresh"
    >
      <span
        v-if="refreshIcon"
        :style="{ backgroundImage: `url(${refreshIcon})` }"
      />
      <Icon v-else icon="mdi:refresh" width="30" />
    </span>
  </div>
</template>

<style scoped>

</style>
