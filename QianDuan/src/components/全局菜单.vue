<template>
  <nav class="quanju-caidan">
    <div class="caidan-neirong">
      <div class="caidan-zuo">
        <button
          class="fanhui-anniu dian-ji-qu-44"
          :class="{ yincang: !xianShiFanHui }"
          :aria-hidden="!xianShiFanHui"
          @click="fanHuiShangYiYe"
        >
          <span class="fanhui-jiantou">←</span>
          <span class="fanhui-wenzi">{{ huoQuFanYi('caidan', 'fanHui') }}</span>
        </button>
        <button
          class="zhuye-anniu dian-ji-qu-44"
          :class="{ yincang: !xianShiZhuYe }"
          :aria-hidden="!xianShiZhuYe"
          :title="huoQuFanYi('caidan', 'zhuYe')"
          :aria-label="huoQuFanYi('caidan', 'zhuYe')"
          @click="fanHuiShouYe"
        >
          <span class="zhuye-tubiao">⌂</span>
          <span class="zhuye-wenzi">{{ huoQuFanYi('caidan', 'zhuYe') }}</span>
        </button>
        <button
          ref="yongHuChuFaQi"
          type="button"
          class="yonghu-xuanxiang dian-ji-qu-44"
          :aria-expanded="yongHuCaiDanZhanKai"
          :aria-controls="yongHuCaiDanId"
          :aria-haspopup="用户仓库.dangQianYongHu ? 'menu' : undefined"
          @click="dianJiYongHuQuYu"
          @keydown="yongHuChuFaQiJianPan"
        >
          <span class="yonghu-xiao-wei">
            <TouXiang :tou-xiang="touXiangDiZhi" :mo-ren-zi="huoQuFanYi('caidan', 'yongHu')" />
          </span>
          <span class="yonghu-mingcheng">{{ xianShiNiCheng }}</span>
          <span
            v-if="用户仓库.dangQianYongHu"
            class="zhankai-jiantou"
            :class="{ xuanzhuan: yongHuCaiDanZhanKai }"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="caidan-zhong">
        <div v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi" class="liaotian-biaoti-zu">
          <span class="jiaose-mingcheng-caidan">{{ xianShiJiaoSeMing }}</span>
          <span v-if="聊天仓库.zhengZaiShuRu" class="duifang-shuru-tishi">
            {{ huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu') }}
          </span>
        </div>
        <h1 v-else class="ye-mian-biao-ti">{{ dangQianYeMianBiaoTi }}</h1>
      </div>

      <div class="caidan-you">
        <div
          v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi && junShiKaiQi && teZhengKaiGuanCuoWu"
          class="junshi-kaiGuanWeiQueRen"
        >
          <RequestError
            :cuo-wu="teZhengKaiGuanCuoWu"
            mi-xi
            :zhong-zai="chongShiTeZhengKaiGuan"
            :xian-shi-chong-shi="false"
            @chong-shi="chongShiKaiGuan"
          />
        </div>
        <button
          v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi && junShiKaiQi"
          class="junshi-anniu"
          :title="huoQuFanYi('caidan', 'junShiZhiDao')"
          :aria-label="huoQuFanYi('caidan', 'junShiZhiDao')"
          @click="tongZhiJunShiZhiDao"
        >
          <span class="junshi-wenzi-quan">{{ huoQuFanYi('caidan', 'junShiZhiDao') }}</span>
          <span class="junshi-wenzi-duan">{{ huoQuFanYi('caidan', 'junShi') }}</span>
        </button>
        <button
          class="zhuti-qiehuan-anniu dian-ji-qu-44"
          :title="zhutiAnNiuBiaoTi"
          :aria-label="zhutiAnNiuBiaoTi"
          @click="qieHuanZhuti"
        >
          <span class="zhuti-tubiao">{{ zhutiAnNiuTuBiao }}</span>
        </button>
        <button
          v-if="用户仓库.dangQianYongHu"
          class="tongzhi-anniu dian-ji-qu-44"
          :aria-label="huoQuFanYi('caidan', 'tongZhi')"
          @click="jinRuTongZhi"
        >
          <span class="tongzhi-tubiao">{{ huoQuFanYi('caidan', 'tongZhiTuBiao') }}</span>
          <span v-if="通知仓库.weiDuShu > 0" class="tongzhi-badge">{{ xianShiTongZhiShu }}</span>
        </button>
        <span
          class="banben-wenben"
          :aria-label="`${huoQuFanYi('caidan', 'banBenHao')} ${banBenHao}`"
          >{{ banBenHao }}</span
        >
        <button
          ref="qitaChuFaQi"
          type="button"
          class="qita-xuanxiang dian-ji-qu-44"
          :aria-expanded="qitaCaiDanZhanKai"
          :aria-controls="qitaCaiDanId"
          aria-haspopup="menu"
          @click="qieHuanQitaCaiDan"
          @keydown="qitaChuFaQiJianPan"
        >
          <span class="qita-tubiao">☰</span>
          <span class="qita-wenzi">{{ huoQuFanYi('caidan', 'gengDuo') }}</span>
        </button>
      </div>
    </div>

    <component
      :is="协议模态框"
      :xian-shi="xieYiXianShi"
      :lei-xing="xieYiLeiXing"
      @guan-bi="xieYiXianShi = false"
    />

    <Teleport to="body">
      <Transition name="yonghu-caidan-guodu" :duration="{ enter: 220, leave: 160 }">
        <div
          v-if="yongHuCaiDanZhanKai && 用户仓库.dangQianYongHu"
          :id="yongHuCaiDanId"
          ref="yongHuFuCeng"
          class="yonghu-caidan-fuceng"
          role="menu"
          :aria-label="huoQuFanYi('caidan', 'zhangHaoFenZu')"
          :style="yongHuFuCengYangShi"
          tabindex="-1"
          @pointerdown.stop
          @keydown="yongHuCaiDanJianPan"
        >
          <div
            ref="yongHuGunDongQu"
            class="caidan-gundong-qu"
            role="group"
            :aria-label="huoQuFanYi('caidan', 'zhangHaoFenZu')"
            tabindex="0"
            @scroll.passive="yongHuGunDongTiao.同步()"
            @keydown="caidanGunDongJianPan"
          >
            <div class="yonghu-caidan-tou">
              <button
                type="button"
                class="yonghu-caidan-ziliao"
                role="menuitem"
                :aria-label="`${huoQuFanYi('caidan', 'zhangHaoSheZhi')} ${xianShiNiCheng}`"
                @click="tiaoZhuanZhangHao('tou-xiang')"
              >
                <span class="ziliao-wei">
                  <TouXiang :tou-xiang="touXiangDiZhi" :mo-ren-zi="xianShiNiCheng.slice(0, 1)" />
                </span>
                <span class="ziliao-wenzi">
                  <span class="ziliao-mingcheng">{{ xianShiNiCheng }}</span>
                  <span class="ziliao-qianming">{{ qianMingYuLan || huoQuFanYi('haoYou', 'zanWuQianMing') }}</span>
                </span>
                <span class="ziliao-jinru" aria-hidden="true">›</span>
              </button>
            </div>
            <div class="yonghu-caidan-fenzu" aria-hidden="true">
              {{ huoQuFanYi('caidan', 'zhangHaoFenZu') }}
            </div>
            <div role="group" :aria-label="huoQuFanYi('caidan', 'zhangHaoFenZu')">
              <button type="button" role="menuitem" class="yonghu-caidan-xiangmu" @click="jinRuZhangHaoAnQuan">
                {{ huoQuFanYi('caidan', 'zhangHaoSheZhi') }}
              </button>
              <button type="button" role="menuitem" class="yonghu-caidan-xiangmu" @click="jinRuZhanJi">
                {{ huoQuFanYi('caidan', 'guoWangZhanJi') }}
              </button>
              <button type="button" role="menuitem" class="yonghu-caidan-xiangmu" @click="jinRuHaoYou">
                {{ huoQuFanYi('caidan', 'haoYou') }}
              </button>
            </div>
            <div class="yonghu-caidan-fenge" role="separator" />
            <button type="button" role="menuitem" class="yonghu-caidan-xiangmu yonghu-caidan-tuichu" @click="zhiXingTuiChu">
              {{ huoQuFanYi('caidan', 'tuiChuDengLu') }}
            </button>
          </div>
          <div ref="yongHuGunDongGuiDao" class="caidan-gundong-guidao" aria-hidden="true">
            <div
              ref="yongHuGunDongHuaKuai"
              class="caidan-gundong-huakuai"
              @pointerdown.prevent.stop="yongHuGunDongTiao.开始拖动($event)"
              @pointermove="yongHuGunDongTiao.拖动中($event)"
              @pointerup="yongHuGunDongTiao.结束拖动($event)"
              @pointercancel="yongHuGunDongTiao.结束拖动($event)"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="qita-caidan-guodu" :duration="{ enter: 200, leave: 160 }">
        <div
          v-if="qitaCaiDanZhanKai"
          :id="qitaCaiDanId"
          ref="qitaFuCeng"
          class="qita-caidan-fuceng"
          role="menu"
          :aria-label="huoQuFanYi('caidan', 'gengDuo')"
          :style="qitaFuCengYangShi"
          tabindex="-1"
          @pointerdown.stop
          @keydown="qitaCaiDanJianPan"
        >
          <div
            ref="qitaGunDongQu"
            class="caidan-gundong-qu"
            role="group"
            :aria-label="huoQuFanYi('caidan', 'gengDuo')"
            tabindex="0"
            @scroll.passive="qitaGunDongTiao.同步()"
            @keydown="caidanGunDongJianPan"
          >
            <div class="qita-caidan-fenzu" aria-hidden="true">{{ huoQuFanYi('caidan', 'pianHaoFenZu') }}</div>
            <div role="group" :aria-label="huoQuFanYi('caidan', 'pianHaoFenZu')">
              <button
                type="button"
                role="menuitemcheckbox"
                class="qita-caidan-xiangmu qita-caidan-xiangmu--kaiguan"
                :aria-checked="设置仓库.zhuYeBeiJingYuShui"
                data-testid="qita-caidan-zhu-ye-yu-shui"
                @click="qieHuanZhuYeYuShui"
              >
                <span class="qita-caidan-tubiao" aria-hidden="true">☂</span>
                <span class="qita-caidan-wenzi">{{ huoQuFanYi('caidan', 'zhuYeBeiJingYuShui') }}</span>
                <span class="qita-caidan-kaiguan" aria-hidden="true">
                  <span class="qita-caidan-kaiguan-qiu" />
                </span>
              </button>
              <button type="button" role="menuitem" class="qita-caidan-xiangmu" @click="jinRuShengYin">
                <span class="qita-caidan-tubiao" aria-hidden="true">♪</span>
                <span class="qita-caidan-wenzi">{{ huoQuFanYi('sheZhi', 'shengYinBiaoTi') }}</span>
              </button>
            </div>
            <div class="qita-caidan-fenge" role="separator" />
            <div class="qita-caidan-fenzu" aria-hidden="true">{{ huoQuFanYi('caidan', 'guanYuFenZu') }}</div>
            <div role="group" :aria-label="huoQuFanYi('caidan', 'guanYuFenZu')">
              <button type="button" role="menuitem" class="qita-caidan-xiangmu" @click="daKaiXieYi('yongHuXieYi')">
                <span class="qita-caidan-tubiao" aria-hidden="true">§</span>
                <span class="qita-caidan-wenzi">{{ huoQuFanYi('caidan', 'yongHuXieYi') }}</span>
              </button>
              <button type="button" role="menuitem" class="qita-caidan-xiangmu" @click="daKaiXieYi('yinSiZhengCe')">
                <span class="qita-caidan-tubiao" aria-hidden="true">◈</span>
                <span class="qita-caidan-wenzi">{{ huoQuFanYi('caidan', 'yinSiZhengCe') }}</span>
              </button>
            </div>
          </div>
          <div ref="qitaGunDongGuiDao" class="caidan-gundong-guidao" aria-hidden="true">
            <div
              ref="qitaGunDongHuaKuai"
              class="caidan-gundong-huakuai"
              @pointerdown.prevent.stop="qitaGunDongTiao.开始拖动($event)"
              @pointermove="qitaGunDongTiao.拖动中($event)"
              @pointerup="qitaGunDongTiao.结束拖动($event)"
              @pointercancel="qitaGunDongTiao.结束拖动($event)"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import { 使用通知仓库 } from '@/stores/通知'
import { huoQuFanYi } from '@/config/翻译表'
import { 使用浮层定位, 使用浮层关闭 } from '@/components/通用菜单.vue'
import { huoQuJunShiKaiGuan, laQuTeZhengKaiGuan, teZhengKaiGuanCuoWu } from '@/utils/TeZhengKaiGuan'
import { yingYongBanBen } from '@/config/站点配置'
import TouXiang from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import 协议模态框 from '@/components/协议模态框.vue'

const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const 认证表单仓库 = 使用认证表单仓库()
const 聊天仓库 = 使用聊天仓库()
const 主题仓库 = 使用主题仓库()
const 通知仓库 = 使用通知仓库()
const router = useRouter()
const route = useRoute()

const yongHuCaiDanZhanKai = ref(false)
const qitaCaiDanZhanKai = ref(false)
const xieYiXianShi = ref(false)
const xieYiLeiXing = ref<'yongHuXieYi' | 'yinSiZhengCe'>('yongHuXieYi')

const yongHuChuFaQi = ref<HTMLButtonElement | null>(null)
const qitaChuFaQi = ref<HTMLButtonElement | null>(null)
const yongHuFuCeng = ref<HTMLElement | null>(null)
const qitaFuCeng = ref<HTMLElement | null>(null)
const yongHuGunDongQu = ref<HTMLElement | null>(null)
const yongHuGunDongGuiDao = ref<HTMLElement | null>(null)
const yongHuGunDongHuaKuai = ref<HTMLElement | null>(null)
const qitaGunDongQu = ref<HTMLElement | null>(null)
const qitaGunDongGuiDao = ref<HTMLElement | null>(null)
const qitaGunDongHuaKuai = ref<HTMLElement | null>(null)

const yongHuCaiDanId = 'quanju-yonghu-caidan'
const qitaCaiDanId = 'quanju-qita-caidan'

const {
  位置: yongHuWeiZhi,
  计算: 计算YongHuWeiZhi,
  开始跟踪: 跟踪YongHuWeiZhi,
  结束跟踪: 停止YongHuWeiZhi,
} = 使用浮层定位(yongHuChuFaQi, yongHuFuCeng, {
  duiQi: 'zuo',
  jianGe: 8,
  zuiXiaoKuanDu: 240,
  zuiDaKuanDu: 300,
})

const {
  位置: qitaWeiZhi,
  计算: 计算QitaWeiZhi,
  开始跟踪: 跟踪QitaWeiZhi,
  结束跟踪: 停止QitaWeiZhi,
} = 使用浮层定位(qitaChuFaQi, qitaFuCeng, {
  duiQi: 'you',
  jianGe: 8,
  zuiXiaoKuanDu: 208,
  zuiDaKuanDu: 260,
})

const yongHuFuCengYangShi = computed(() => ({
  top: `${yongHuWeiZhi.value.top}px`,
  left: `${yongHuWeiZhi.value.left}px`,
  width: `${yongHuWeiZhi.value.kuanDu}px`,
  maxHeight: `${yongHuWeiZhi.value.zuiDaGaoDu}px`,
}))

const qitaFuCengYangShi = computed(() => ({
  top: `${qitaWeiZhi.value.top}px`,
  left: `${qitaWeiZhi.value.left}px`,
  width: `${qitaWeiZhi.value.kuanDu}px`,
  maxHeight: `${qitaWeiZhi.value.zuiDaGaoDu}px`,
}))

interface 菜单滚动条 {
  同步: () => void
  开始观察: () => void
  停止观察: () => void
  开始拖动: (shiJian: PointerEvent) => void
  拖动中: (shiJian: PointerEvent) => void
  结束拖动: (shiJian: PointerEvent) => void
}

const 滑块最小高 = 24

function 创建菜单滚动条(yuanSu: {
  外壳: Ref<HTMLElement | null>
  容器: Ref<HTMLElement | null>
  导轨: Ref<HTMLElement | null>
  滑块: Ref<HTMLElement | null>
}): 菜单滚动条 {
  let 滑块高 = 0
  let 可移动高 = 0
  let 溢出高 = 0
  let 拖动起点: { zuoBiaoY: number; gunDongDingBu: number } | null = null
  let 期望滚动顶 = 0
  let 尺寸观察器: ResizeObserver | null = null
  let 变化观察器: MutationObserver | null = null
  let 外壳观察器: MutationObserver | null = null
  let 帧号 = 0

  function 绘制(gunDongDingBu: number): void {
    const 滑块元素 = yuanSu.滑块.value
    if (!滑块元素 || 可移动高 <= 0 || 溢出高 <= 0) return
    滑块元素.style.transform = `translateY(${Math.round((gunDongDingBu / 溢出高) * 可移动高)}px)`
  }

  function 同步(): void {
    const 滚动区 = yuanSu.容器.value
    const 导轨元素 = yuanSu.导轨.value
    const 滑块元素 = yuanSu.滑块.value
    if (!滚动区 || !导轨元素 || !滑块元素) return
    const 可见高 = 滚动区.clientHeight
    const 内容高 = 滚动区.scrollHeight
    期望滚动顶 = 滚动区.scrollTop
    导轨元素.style.display = ''
    const 轨道高 = 导轨元素.clientHeight
    if (可见高 <= 0 || 轨道高 <= 0 || 内容高 - 可见高 <= 1) {
      溢出高 = 0
      可移动高 = 0
      滑块高 = 0
      导轨元素.style.display = 'none'
      滑块元素.style.display = 'none'
      return
    }
    溢出高 = 内容高 - 可见高
    导轨元素.style.display = ''
    滑块元素.style.display = ''
    滑块高 = Math.min(轨道高, Math.max(滑块最小高, Math.round(轨道高 * (可见高 / 内容高))))
    可移动高 = Math.max(0, 轨道高 - 滑块高)
    滑块元素.style.height = `${滑块高}px`
    绘制(滚动区.scrollTop)
  }

  function 排队同步(): void {
    if (帧号) return
    帧号 = requestAnimationFrame(() => {
      帧号 = 0
      同步()
    })
  }

  function 开始拖动(shiJian: PointerEvent): void {
    const 滚动区 = yuanSu.容器.value
    const 滑块元素 = yuanSu.滑块.value
    if (!滚动区 || !滑块元素 || 可移动高 <= 0 || 溢出高 <= 0) return
    滑块元素.setPointerCapture?.(shiJian.pointerId)
    拖动起点 = { zuoBiaoY: shiJian.clientY, gunDongDingBu: 滚动区.scrollTop }
  }

  function 拖动中(shiJian: PointerEvent): void {
    const 滚动区 = yuanSu.容器.value
    if (!拖动起点 || !滚动区 || 可移动高 <= 0 || 溢出高 <= 0) return
    滚动区.scrollTop =
      拖动起点.gunDongDingBu + ((shiJian.clientY - 拖动起点.zuoBiaoY) / 可移动高) * 溢出高
    期望滚动顶 = 滚动区.scrollTop
    绘制(滚动区.scrollTop)
  }

  function 修正滚动顶(): void {
    const 滚动区 = yuanSu.容器.value
    if (!滚动区) return
    if (滚动区.scrollTop !== 期望滚动顶) 滚动区.scrollTop = 期望滚动顶
  }

  function 结束拖动(shiJian: PointerEvent): void {
    拖动起点 = null
    const 滑块元素 = yuanSu.滑块.value
    if (滑块元素?.hasPointerCapture?.(shiJian.pointerId)) 滑块元素.releasePointerCapture(shiJian.pointerId)
    同步()
  }

  function 停止观察(): void {
    if (尺寸观察器) {
      尺寸观察器.disconnect()
      尺寸观察器 = null
    }
    if (变化观察器) {
      变化观察器.disconnect()
      变化观察器 = null
    }
    if (外壳观察器) {
      外壳观察器.disconnect()
      外壳观察器 = null
    }
    window.removeEventListener('resize', 排队同步)
    if (帧号) {
      cancelAnimationFrame(帧号)
      帧号 = 0
    }
  }

  function 开始观察(): void {
    停止观察()
    const 滚动区 = yuanSu.容器.value
    if (!滚动区) return
    if (typeof ResizeObserver !== 'undefined') {
      尺寸观察器 = new ResizeObserver(排队同步)
      尺寸观察器.observe(滚动区)
      for (const 子元素 of Array.from(滚动区.children)) 尺寸观察器.observe(子元素)
    }
    if (typeof MutationObserver !== 'undefined') {
      变化观察器 = new MutationObserver(排队同步)
      变化观察器.observe(滚动区, { childList: true, subtree: true, characterData: true })
      const 外壳元素 = yuanSu.外壳.value
      if (外壳元素) {
        外壳观察器 = new MutationObserver(修正滚动顶)
        外壳观察器.observe(外壳元素, { attributes: true, attributeFilter: ['style'] })
      }
    }
    window.addEventListener('resize', 排队同步)
    同步()
    排队同步()
  }

  return { 同步, 开始观察, 停止观察, 开始拖动, 拖动中, 结束拖动 }
}

const yongHuGunDongTiao = 创建菜单滚动条({
  外壳: yongHuFuCeng,
  容器: yongHuGunDongQu,
  导轨: yongHuGunDongGuiDao,
  滑块: yongHuGunDongHuaKuai,
})

const qitaGunDongTiao = 创建菜单滚动条({
  外壳: qitaFuCeng,
  容器: qitaGunDongQu,
  导轨: qitaGunDongGuiDao,
  滑块: qitaGunDongHuaKuai,
})

const banBenHao = yingYongBanBen

const xianShiNiCheng = computed(() => {
  if (用户仓库.dangQianYongHu && 用户仓库.mingChengKeJian) {
    return (
      用户仓库.dangQianYongHu.ni_cheng ||
      用户仓库.dangQianYongHu.yong_hu_ming ||
      huoQuFanYi('caidan', 'yongHu')
    )
  }
  return huoQuFanYi('caidan', 'weiDengLu')
})

const xianShiFanHui = computed(() => {
  const yinCangLuYou = ['zhuJieMian', 'dengLu', 'zhuCe']
  return !yinCangLuYou.includes(route.name as string)
})

const xianShiZhuYe = computed(() => {
  const yinCangLuYou = ['zhuJieMian', 'dengLu', 'zhuCe']
  return !yinCangLuYou.includes(route.name as string)
})

const shiLiaoTianYe = computed(() => route.name === 'liaoTian')
const junShiKaiQi = computed(() => huoQuJunShiKaiGuan())

const xianShiJiaoSeMing = computed(() => {
  return (
    聊天仓库.jiaoSeXinXi?.wei_xin_ming ||
    聊天仓库.jiaoSeXinXi?.ming_zi ||
    huoQuFanYi('liaoTian', 'duiFang')
  )
})

const fanYiBiaoTiDuiZhao: Record<
  string,
  | 'zhuJieMian'
  | 'dengLu'
  | 'ziLiaoSheZhi'
  | 'tianJiaWeiXin'
  | 'tongZhi'
  | 'guoWangZhanJi'
  | 'junShiJiLuXiangQing'
  | 'haoYouLieBiao'
  | 'haoYouLiaoTian'
  | 'shengYin'
  | 'qiPaoSheZhi'
  | 'zhangHaoAnQuan'
  | 'yongHuXieYi'
  | 'yinSiZhengCe'
> = {
  zhuJieMian: 'zhuJieMian',
  dengLu: 'dengLu',
  ziLiaoSheZhi: 'ziLiaoSheZhi',
  tianJiaWeiXin: 'tianJiaWeiXin',
  tongZhi: 'tongZhi',
  guoWangZhanJi: 'guoWangZhanJi',
  junShiJiLuXiangQing: 'junShiJiLuXiangQing',
  haoYouLieBiao: 'haoYouLieBiao',
  haoYouLiaoTian: 'haoYouLiaoTian',
  shengYin: 'shengYin',
  qiPaoSheZhi: 'qiPaoSheZhi',
  zhangHaoAnQuan: 'zhangHaoAnQuan',
}

const dangQianYeMianBiaoTi = computed(() => {
  const luYouMing = route.name as string
  if (luYouMing && luYouMing in fanYiBiaoTiDuiZhao) {
    return huoQuFanYi('yeMianBiaoTi', fanYiBiaoTiDuiZhao[luYouMing])
  }
  return huoQuFanYi('caidan', 'fanHui')
})

const xianShiTongZhiShu = computed(() => {
  return 通知仓库.weiDuShu > 99 ? '99+' : String(通知仓库.weiDuShu)
})

const zhutiAnNiuBiaoTi = computed(() => {
  return 主题仓库.dangQianZhuti === 浅色值
    ? huoQuFanYi('caidan', 'qieHuanShenSe')
    : huoQuFanYi('caidan', 'qieHuanQianSe')
})

const zhutiAnNiuTuBiao = computed(() => {
  return 主题仓库.dangQianZhuti === 浅色值
    ? huoQuFanYi('caidan', 'zhutiShenSeTuBiao')
    : huoQuFanYi('caidan', 'zhutiQianSeTuBiao')
})

function 焦点XiangMu(rongQi: HTMLElement | null, muBiao: number | 'shou' | 'wei'): void {
  if (!rongQi) return
  const xiangMu = Array.from(rongQi.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]'))
  if (!xiangMu.length) return
  const suoYin =
    muBiao === 'shou'
      ? 0
      : muBiao === 'wei'
        ? xiangMu.length - 1
        : ((muBiao % xiangMu.length) + xiangMu.length) % xiangMu.length
  xiangMu[suoYin].focus()
}

function 当前XiangMuSuoYin(rongQi: HTMLElement | null): number {
  if (!rongQi) return -1
  const xiangMu = Array.from(rongQi.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]'))
  return xiangMu.indexOf(document.activeElement as HTMLElement)
}

async function 打开YongHuCaiDan(jianPanJinRu: boolean): Promise<void> {
  if (!用户仓库.dangQianYongHu || yongHuCaiDanZhanKai.value) return
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = true
  await nextTick()
  计算YongHuWeiZhi()
  跟踪YongHuWeiZhi()
  await nextTick()
  yongHuGunDongTiao.开始观察()
  if (jianPanJinRu) 焦点XiangMu(yongHuFuCeng.value, 'shou')
  else yongHuFuCeng.value?.focus()
}

function 关闭YongHuCaiDan(fanHuiJiaoDian: boolean): void {
  if (!yongHuCaiDanZhanKai.value) return
  yongHuCaiDanZhanKai.value = false
  停止YongHuWeiZhi()
  if (fanHuiJiaoDian) void nextTick(() => yongHuChuFaQi.value?.focus())
}

async function 打开QitaCaiDan(jianPanJinRu: boolean): Promise<void> {
  if (qitaCaiDanZhanKai.value) return
  yongHuCaiDanZhanKai.value = false
  qitaCaiDanZhanKai.value = true
  await nextTick()
  计算QitaWeiZhi()
  跟踪QitaWeiZhi()
  await nextTick()
  qitaGunDongTiao.开始观察()
  if (jianPanJinRu) 焦点XiangMu(qitaFuCeng.value, 'shou')
  else qitaFuCeng.value?.focus()
}

function 关闭QitaCaiDan(fanHuiJiaoDian: boolean): void {
  if (!qitaCaiDanZhanKai.value) return
  qitaCaiDanZhanKai.value = false
  停止QitaWeiZhi()
  if (fanHuiJiaoDian) void nextTick(() => qitaChuFaQi.value?.focus())
}

function dianJiYongHuQuYu(): void {
  if (!用户仓库.dangQianYongHu) {
    jinRuDengLu()
    return
  }
  if (yongHuCaiDanZhanKai.value) 关闭YongHuCaiDan(true)
  else void 打开YongHuCaiDan(false)
}

function qieHuanQitaCaiDan(): void {
  if (qitaCaiDanZhanKai.value) 关闭QitaCaiDan(true)
  else void 打开QitaCaiDan(false)
}

function yongHuChuFaQiJianPan(shiJian: KeyboardEvent): void {
  if (!用户仓库.dangQianYongHu) return
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(shiJian.key)) return
  shiJian.preventDefault()
  if (!yongHuCaiDanZhanKai.value) void 打开YongHuCaiDan(true)
  else 焦点XiangMu(yongHuFuCeng.value, shiJian.key === 'ArrowUp' ? 'wei' : 'shou')
}

function qitaChuFaQiJianPan(shiJian: KeyboardEvent): void {
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(shiJian.key)) return
  shiJian.preventDefault()
  if (!qitaCaiDanZhanKai.value) void 打开QitaCaiDan(true)
  else 焦点XiangMu(qitaFuCeng.value, shiJian.key === 'ArrowUp' ? 'wei' : 'shou')
}

function chuLiCaiDanJianPan(
  shiJian: KeyboardEvent,
  rongQi: HTMLElement | null,
  guanBi: (fanHuiJiaoDian: boolean) => void,
): void {
  const suoYin = 当前XiangMuSuoYin(rongQi)
  switch (shiJian.key) {
    case 'ArrowDown':
      shiJian.preventDefault()
      焦点XiangMu(rongQi, suoYin < 0 ? 'shou' : suoYin + 1)
      break
    case 'ArrowUp':
      shiJian.preventDefault()
      焦点XiangMu(rongQi, suoYin < 0 ? 'wei' : suoYin - 1)
      break
    case 'Home':
      shiJian.preventDefault()
      焦点XiangMu(rongQi, 'shou')
      break
    case 'End':
      shiJian.preventDefault()
      焦点XiangMu(rongQi, 'wei')
      break
    case 'Escape':
      shiJian.preventDefault()
      shiJian.stopPropagation()
      guanBi(true)
      break
    case 'Tab':
      guanBi(false)
      break
    default:
      break
  }
}

function yongHuCaiDanJianPan(shiJian: KeyboardEvent): void {
  chuLiCaiDanJianPan(shiJian, yongHuFuCeng.value, 关闭YongHuCaiDan)
}

function qitaCaiDanJianPan(shiJian: KeyboardEvent): void {
  chuLiCaiDanJianPan(shiJian, qitaFuCeng.value, 关闭QitaCaiDan)
}

function caidanGunDongJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.target !== shiJian.currentTarget) return
  const 滚动区 = shiJian.currentTarget as HTMLElement
  const 步进 = 44
  const 页高 = Math.max(步进, 滚动区.clientHeight - 步进)
  switch (shiJian.key) {
    case 'ArrowDown':
      滚动区.scrollTop += 步进
      break
    case 'ArrowUp':
      滚动区.scrollTop -= 步进
      break
    case 'PageDown':
      滚动区.scrollTop += 页高
      break
    case 'PageUp':
      滚动区.scrollTop -= 页高
      break
    case 'Home':
      滚动区.scrollTop = 0
      break
    case 'End':
      滚动区.scrollTop = 滚动区.scrollHeight
      break
    default:
      return
  }
  shiJian.preventDefault()
  shiJian.stopPropagation()
}

function qieHuanZhuti(): void {
  主题仓库.qieHuanZhuti(主题仓库.dangQianZhuti === 浅色值 ? '暗色' : 浅色值)
}

function daKaiXieYi(leiXing: 'yongHuXieYi' | 'yinSiZhengCe'): void {
  xieYiLeiXing.value = leiXing
  xieYiXianShi.value = true
  qitaCaiDanZhanKai.value = false
}

function jinRuTongZhi(): void {
  qitaCaiDanZhanKai.value = false
  router.push('/tong-zhi')
}

function jinRuDengLu(): void {
  router.push('/login').catch(() => {})
}

function fanHuiShangYiYe(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace('/')
}

function fanHuiShouYe(): void {
  router.push('/')
}

function tongZhiJunShiZhiDao(): void {
  window.dispatchEvent(new CustomEvent('junshi-zhankai'))
}

const chongShiTeZhengKaiGuan = ref(false)

async function chongShiKaiGuan(): Promise<void> {
  if (chongShiTeZhengKaiGuan.value) return
  chongShiTeZhengKaiGuan.value = true
  try {
    await laQuTeZhengKaiGuan()
  } finally {
    chongShiTeZhengKaiGuan.value = false
  }
}

function jinRuZhanJi(): void {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push('/guo-wang-zhan-ji')
}

function jinRuZhangHaoAnQuan(): void {
  tiaoZhuanZhangHao()
}

function tiaoZhuanZhangHao(maoDian?: string): void {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push(maoDian ? `/zhang-hao-an-quan#${maoDian}` : '/zhang-hao-an-quan')
}

const touXiangDiZhi = computed(() => 设置仓库.touXiang || 用户仓库.dangQianYongHu?.tou_xiang || null)
const qianMingYuLan = computed(() => 设置仓库.qianMing || 用户仓库.dangQianYongHu?.qian_ming || '')

function jinRuHaoYou(): void {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push('/hao-you')
}

function qieHuanZhuYeYuShui(): void {
  设置仓库.qieHuanZhuYeBeiJingYuShui(!设置仓库.zhuYeBeiJingYuShui)
}

function jinRuShengYin(): void {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push('/sheng-yin')
}

function zhiXingTuiChu(): void {
  yongHuCaiDanZhanKai.value = false
  认证表单仓库.qingKongDengLuZhuCe()
  认证表单仓库.qingKongZiLiao()
  聊天仓库.qingKongZhuangTai()
  if (route.name === 'zhuJieMian') {
    用户仓库.qingQiuTuiChu()
  } else {
    用户仓库.tuiChuDengLu()
    router.push('/login')
  }
}

watch(yongHuCaiDanZhanKai, (zhanKai) => {
  if (!zhanKai) {
    停止YongHuWeiZhi()
    yongHuGunDongTiao.停止观察()
  }
})

watch(qitaCaiDanZhanKai, (zhanKai) => {
  if (!zhanKai) {
    停止QitaWeiZhi()
    qitaGunDongTiao.停止观察()
  }
})

watch(
  () => 用户仓库.令牌,
  (lingPai) => {
    if (lingPai) {
      void 设置仓库.jiaZai()
      通知仓库.jiaZaiTongZhi()
      通知仓库.lianJieSocket()
    } else {
      关闭YongHuCaiDan(false)
      通知仓库.duanKaiSocket()
    }
  },
)

使用浮层关闭(yongHuFuCeng, yongHuChuFaQi, () => yongHuCaiDanZhanKai.value, 关闭YongHuCaiDan)
使用浮层关闭(qitaFuCeng, qitaChuFaQi, () => qitaCaiDanZhanKai.value, 关闭QitaCaiDan)

onMounted(() => {
  if (用户仓库.令牌 && !设置仓库.yiJiaZai) void 设置仓库.jiaZai()
  if (用户仓库.令牌) {
    通知仓库.jiaZaiTongZhi()
    通知仓库.lianJieSocket()
  }
})

onBeforeUnmount(() => {
  通知仓库.duanKaiSocket()
  yongHuGunDongTiao.停止观察()
  qitaGunDongTiao.停止观察()
})
</script>

<style scoped>
.quanju-caidan {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  z-index: 100;
  height: 52px;
  height: calc(52px + var(--anquan-quyu-shang));
  min-height: 52px;
  min-height: calc(52px + var(--anquan-quyu-shang));
  background: var(--daohanglan-beijing);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--daohanglan-xiabiankuang);
  box-shadow: var(--daohanglan-yinying);
  padding-top: var(--anquan-quyu-shang);
}

.caidan-neirong {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: var(--jiange-12);
  padding: 0 calc(var(--jiange-zhong) + var(--jiange-4));
}

.caidan-zuo,
.caidan-zhong,
.caidan-you {
  display: flex;
  align-items: center;
  min-width: 0;
}

.junshi-kaiGuanWeiQueRen {
  max-width: 220px;
  min-width: 0;
}

.caidan-zuo {
  justify-content: flex-start;
  gap: var(--jiange-xiao);
}

.fanhui-anniu {
  font-size: 14px;
  color: var(--daohanglan-wenben);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--jiange-6) var(--jiange-12);
  border-radius: 8px;
  transition: background 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-4);
}

.fanhui-wenzi {
  display: inline;
}

.fanhui-jiantou {
  display: inline;
}

.fanhui-anniu.yincang {
  visibility: hidden;
  pointer-events: none;
}

.fanhui-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.zhuye-anniu {
  font-size: 14px;
  color: var(--daohanglan-wenben);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--jiange-6) var(--jiange-12);
  border-radius: 8px;
  transition: background 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-4);
}

.zhuye-anniu.yincang {
  visibility: hidden;
  pointer-events: none;
}

.zhuye-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.zhuye-tubiao {
  display: inline;
  font-size: 15px;
}

.zhuye-wenzi {
  display: inline;
}

.caidan-zhong {
  justify-content: center;
  gap: var(--jiange-10);
  min-width: 0;
}

.caidan-you {
  justify-content: flex-end;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.yonghu-xuanxiang,
.qita-xuanxiang {
  display: flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.yonghu-xuanxiang {
  gap: var(--jiange-xiao);
  padding: var(--jiange-6) var(--jiange-12);
  border-radius: 10px;
  min-width: 0;
}

.yonghu-xuanxiang:hover,
.qita-xuanxiang:hover {
  background: var(--daohanglan-hover);
}

.yonghu-xuanxiang:focus-visible,
.qita-xuanxiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: calc(var(--jujiao-huan-pian-yi) * -1);
}

.yonghu-xiao-wei {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-touming-beijing);
  flex-shrink: 0;
  font-size: 11px;
  color: var(--daohanglan-ciwenben);
  font-weight: 600;
}

.yonghu-mingcheng {
  font-size: 13px;
  font-weight: 600;
  color: var(--daohanglan-wenben);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.4s ease;
}

.zhankai-jiantou {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--daohanglan-jiantou);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.zhankai-jiantou.xuanzhuan {
  transform: rotate(180deg);
}

.ye-mian-biao-ti {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  color: var(--daohanglan-qiangwenben);
  margin: 0;
  padding: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.jiaose-mingcheng-caidan {
  font-size: 14px;
  font-weight: 600;
  color: var(--daohanglan-qiangwenben);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.liaotian-biaoti-zu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  min-width: 0;
}

.duifang-shuru-tishi {
  font-size: 11px;
  font-weight: 400;
  color: var(--daohanglan-ciwenben);
  line-height: 1.2;
  white-space: nowrap;
}

.zhuti-qiehuan-anniu {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.zhuti-qiehuan-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
  transform: scale(1.05);
}

.zhuti-tubiao {
  font-size: 16px;
}

.junshi-anniu {
  font-size: 13px;
  color: var(--yanse-qiangdiao);
  background: var(--junshi-anniu-beijing);
  border: none;
  cursor: pointer;
  padding: var(--jiange-6) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}

.junshi-anniu:hover {
  background: var(--junshi-anniu-hover-beijing);
}

.junshi-wenzi-duan {
  display: none;
}

.tongzhi-anniu {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tongzhi-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.tongzhi-tubiao {
  font-size: 16px;
}

.tongzhi-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--jiange-5);
  border-radius: 9px;
  background: var(--tongzhi-badge-beijing);
  color: var(--tongzhi-badge-wenben);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.banben-wenben {
  font-size: 12px;
  font-weight: 600;
  color: var(--daohanglan-ciwenben);
  padding: var(--jiange-4) var(--jiange-xiao);
  border-radius: 6px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  flex-shrink: 0;
}

.qita-xuanxiang {
  padding: var(--jiange-6) var(--jiange-10);
  border-radius: 10px;
  gap: var(--jiange-4);
}

.qita-tubiao {
  font-size: 16px;
  color: var(--daohanglan-ciwenben);
}

.qita-wenzi {
  font-size: 12px;
  color: var(--daohanglan-ciwenben);
  font-weight: 500;
}

.yonghu-caidan-fuceng {
  --quanju-yonghu-ceng: var(--ceng-caidan);
  position: fixed;
  z-index: var(--quanju-yonghu-ceng);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--jiange-6);
  border: 1px solid var(--xiala-biankuang);
  border-radius: 14px;
  background: var(--xiala-beijing);
  color: var(--xiala-wenben);
  box-shadow: var(--xiala-yinying);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  transform-origin: top left;
  outline: none;
}

.yonghu-caidan-tou {
  padding: var(--jiange-2) var(--jiange-2) var(--jiange-6);
  margin-bottom: var(--jiange-2);
  border-bottom: 1px solid var(--xiala-biankuang);
}

.yonghu-caidan-ziliao {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  width: 100%;
  padding: var(--jiange-10);
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.yonghu-caidan-ziliao:hover,
.yonghu-caidan-ziliao:focus-visible {
  background: var(--xiala-hover-beijing);
}

.yonghu-caidan-ziliao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: -2px;
}

.ziliao-wei {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  overflow: hidden;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--zhuse), var(--zhuse-shen));
  color: var(--fasong-anniu-wenben);
  font-size: 18px;
  font-weight: 700;
}

.ziliao-wenzi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-width: 0;
  flex: 1;
}

.ziliao-mingcheng {
  font-size: 14px;
  font-weight: 700;
  color: var(--xiala-wenben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ziliao-qianming {
  font-size: 11px;
  color: var(--daohanglan-ciwenben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.ziliao-jinru {
  flex: none;
  font-size: 18px;
  line-height: 1;
  color: var(--daohanglan-ciwenben);
  opacity: 0.7;
}

.yonghu-caidan-fenzu,
.qita-caidan-fenzu {
  padding: var(--jiange-6) var(--jiange-10) var(--jiange-2);
  color: var(--daohanglan-ciwenben);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.yonghu-caidan-xiangmu,
.qita-caidan-xiangmu {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--xiala-wenben);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.yonghu-caidan-xiangmu {
  padding: var(--jiange-6) var(--jiange-10);
}

.yonghu-caidan-xiangmu:hover,
.yonghu-caidan-xiangmu:focus-visible,
.qita-caidan-xiangmu:hover,
.qita-caidan-xiangmu:focus-visible {
  background: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
}

.yonghu-caidan-xiangmu:focus-visible,
.qita-caidan-xiangmu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: -2px;
}

.yonghu-caidan-fenge,
.qita-caidan-fenge {
  height: 1px;
  margin: var(--jiange-2) var(--jiange-6);
  background: var(--xiala-biankuang);
}

.yonghu-caidan-tuichu {
  color: var(--yanse-weixian);
}

.yonghu-caidan-tuichu:hover,
.yonghu-caidan-tuichu:focus-visible {
  background: var(--tuichu-hover-beijing);
  color: var(--yanse-weixian-shen);
}

.qita-caidan-fuceng {
  --quanju-qita-ceng: var(--ceng-caidan);
  position: fixed;
  z-index: var(--quanju-qita-ceng);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--jiange-6);
  border: 1.5px solid var(--xiala-biankuang);
  border-radius: 12px;
  background: var(--xiala-beijing);
  color: var(--xiala-wenben);
  box-shadow: var(--xiala-yinying);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transform-origin: top right;
  outline: none;
}

.caidan-gundong-qu {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--jiange-2);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  outline: none;
}

.caidan-gundong-qu::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.caidan-gundong-qu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: calc(var(--jujiao-huan-pian-yi) * -1);
}

.caidan-gundong-guidao {
  position: absolute;
  top: var(--jiange-6);
  right: 1px;
  bottom: var(--jiange-6);
  width: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 20%, transparent);
  pointer-events: none;
  touch-action: none;
  transition: background-color 0.2s ease;
}

.caidan-gundong-huakuai {
  position: absolute;
  top: 0;
  left: 1px;
  right: 1px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 52%, transparent) 0%,
    var(--renzheng-gundong-huakuai-se) 50%,
    color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 52%, transparent) 100%
  );
  opacity: 0.88;
  pointer-events: auto;
  touch-action: none;
  cursor: default;
  will-change: transform;
  transition:
    left 0.18s ease,
    right 0.18s ease,
    opacity 0.18s ease,
    box-shadow 0.18s ease;
}

.caidan-gundong-huakuai::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -2px;
  right: -2px;
}

.caidan-gundong-huakuai:hover,
.caidan-gundong-huakuai:active {
  left: 0;
  right: 0;
  opacity: 1;
  box-shadow: 0 0 10px color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 55%, transparent);
}

.yonghu-caidan-fuceng:hover .caidan-gundong-huakuai,
.qita-caidan-fuceng:hover .caidan-gundong-huakuai {
  opacity: 1;
}

.qita-caidan-xiangmu {
  gap: var(--jiange-xiao);
  padding: var(--jiange-6) var(--jiange-xiao);
  border-radius: 8px;
}

.qita-caidan-tubiao {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--daohanglan-qianbiankuang);
  border-radius: 6px;
  background: var(--daohanglan-qianbeijing);
  color: var(--daohanglan-ciwenben);
  font-size: 12px;
}

.qita-caidan-wenzi {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qita-caidan-xiangmu--kaiguan {
  min-height: 44px;
}

.qita-caidan-kaiguan {
  --qita-kaiguan-kuan: 44px;
  --qita-kaiguan-gao: 24px;
  --qita-kaiguan-qiu: 18px;
  --qita-kaiguan-ji: 2px;
  position: relative;
  flex: none;
  width: var(--qita-kaiguan-kuan);
  height: var(--qita-kaiguan-gao);
  margin-left: auto;
  border: 1px solid var(--xiala-biankuang);
  border-radius: var(--yuanjiao-zhong);
  background: var(--daohanglan-zhongbeijing);
  transition:
    background-color var(--kaiguan-dong-hua-shi-chang) var(--quxian-biao-zhun),
    border-color var(--kaiguan-dong-hua-shi-chang) var(--quxian-biao-zhun);
}

.qita-caidan-kaiguan-qiu {
  position: absolute;
  top: 50%;
  left: var(--qita-kaiguan-ji);
  width: var(--qita-kaiguan-qiu);
  height: var(--qita-kaiguan-qiu);
  border-radius: 50%;
  background: var(--wenben-zhuse);
  transform: translate(0, -50%);
  transition: transform var(--kaiguan-dong-hua-shi-chang) var(--quxian-tan-chu);
}

.qita-caidan-xiangmu--kaiguan[aria-checked='true'] .qita-caidan-kaiguan {
  border-color: var(--zhuse);
  background: var(--zhuse);
}

.qita-caidan-xiangmu--kaiguan[aria-checked='true'] .qita-caidan-kaiguan-qiu {
  transform: translate(
    calc(var(--qita-kaiguan-kuan) - var(--qita-kaiguan-qiu) - var(--qita-kaiguan-ji) * 2),
    -50%
  );
}

.yonghu-caidan-guodu-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s var(--quxian-tan-chu);
}

.yonghu-caidan-guodu-leave-active {
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.yonghu-caidan-guodu-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.yonghu-caidan-guodu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.qita-caidan-guodu-enter-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s var(--quxian-tan-chu);
}

.qita-caidan-guodu-leave-active {
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.qita-caidan-guodu-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.qita-caidan-guodu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 767px) {
  .quanju-caidan {
    height: 48px;
    height: calc(48px + var(--anquan-quyu-shang));
    min-height: 48px;
    min-height: calc(48px + var(--anquan-quyu-shang));
  }

  .caidan-neirong {
    padding: 0 var(--jiange-10);
    gap: var(--jiange-6);
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .caidan-zuo {
    gap: var(--jiange-da);
  }

  .caidan-you {
    gap: var(--jiange-12);
  }

  .fanhui-anniu {
    padding: var(--jiange-6) var(--jiange-xiao);
  }

  .fanhui-wenzi {
    display: none;
  }

  .zhuye-anniu {
    padding: var(--jiange-6) var(--jiange-xiao);
  }

  .zhuye-wenzi {
    display: none;
  }

  .yonghu-xuanxiang {
    padding: var(--jiange-6) var(--jiange-xiao);
    gap: var(--jiange-6);
  }

  .yonghu-mingcheng {
    display: none;
  }

  .jiaose-mingcheng-caidan {
    max-width: 80px;
  }

  .caidan-neirong:has(.liaotian-biaoti-zu) .zhuye-anniu {
    display: none;
  }

  .ye-mian-biao-ti {
    font-size: 15px;
  }

  .junshi-anniu {
    padding: var(--jiange-6) var(--jiange-10);
  }

  .junshi-wenzi-quan {
    display: none;
  }

  .junshi-wenzi-duan {
    display: inline;
  }

  .qita-xuanxiang {
    padding: var(--jiange-6) var(--jiange-xiao);
  }

  .qita-wenzi {
    display: none;
  }

  .banben-wenben {
    display: none;
  }

  .yonghu-caidan-xiangmu,
  .qita-caidan-xiangmu,
  .yonghu-caidan-ziliao {
    min-height: 44px;
  }
}

@media (max-width: 374px) {
  .yonghu-mingcheng {
    max-width: 70px;
  }

  .jiaose-mingcheng-caidan {
    max-width: 70px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fanhui-anniu,
  .yonghu-xuanxiang,
  .qita-xuanxiang,
  .zhuti-qiehuan-anniu,
  .junshi-anniu,
  .tongzhi-anniu,
  .yonghu-caidan-xiangmu,
  .qita-caidan-xiangmu,
  .caidan-gundong-guidao,
  .caidan-gundong-huakuai,
  .yonghu-caidan-guodu-enter-active,
  .yonghu-caidan-guodu-leave-active,
  .qita-caidan-guodu-enter-active,
  .qita-caidan-guodu-leave-active {
    transition: none;
  }

  .zhuti-qiehuan-anniu:hover {
    transform: none;
  }
}
</style>
