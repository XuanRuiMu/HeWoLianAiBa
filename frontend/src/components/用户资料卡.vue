<template>
  <div class="ziliaoka-zhezhao" @click.self="guanBi">
    <div class="ziliaoka-rongqi" role="dialog" aria-modal="true" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')">
      <button class="ziliaoka-guanbi" :aria-label="huoQuFanYi('tongYong', 'guanBi')" @click="guanBi">×</button>
      <div v-if="jiaZaiZhong" class="ziliaoka-jiazai">{{ huoQuFanYi('liaoTian', 'jiaZaiZhong') }}</div>
      <div v-else-if="cuoWuXinXi" class="ziliaoka-cuowu">
        <p>{{ cuoWuXinXi }}</p>
        <button class="anniu-fu-zhu" @click="jiaZai">{{ huoQuFanYi('liaoTian', 'chongShi') }}</button>
      </div>
      <div v-else-if="mingPian" class="ziliaoka-neirong">
        <div class="ziliaoka-touxiang-hang">
          <img
            v-if="shiTuPianDiZhi(mingPian.tou_xiang)"
            :src="mingPian.tou_xiang || undefined"
            class="ziliaoka-touxiang"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span v-else class="ziliaoka-touxiang-moren">{{ mingPian.ni_cheng?.slice(0, 1) || mingPian.yong_hu_ming?.slice(0, 1) || '友' }}</span>
          <div class="ziliaoka-mingcheng-qu">
            <p class="ziliaoka-mingcheng">{{ mingPian.ni_cheng || mingPian.yong_hu_ming || huoQuFanYi('haoYou', 'weiMingMing') }}</p>
            <p class="ziliaoka-uid">UID：{{ mingPian.id.slice(0, 8) }}</p>
          </div>
        </div>
        <p v-if="mingPian.qian_ming" class="ziliaoka-qianming">{{ mingPian.qian_ming }}</p>
        <p v-else class="ziliaoka-qianming-kong">{{ huoQuFanYi('haoYou', 'zanWuQianMing') }}</p>
        <div class="ziliaoka-anniu-zu">
          <button v-if="mingPian.shi_hao_you && !mingPian.shi_zi_ji" class="anniu-que-ren" @click="faXiaoXi">
            {{ huoQuFanYi('haoYou', 'faXiaoXi') }}
          </button>
          <button v-if="!mingPian.shi_hao_you && !mingPian.shi_zi_ji" class="anniu-que-ren" @click="tianJiaHaoYou">
            {{ huoQuFanYi('haoYou', 'faSongShenQing') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import { huoQuMingPian, type MingPian } from '@/api/资料'
import { shiTuPianDiZhi } from '@/utils/头像'
import { huoQuCuoWuXiangYing } from '@/api/请求'

const props = defineProps<{
  yongHuId: string
}>()

const emit = defineEmits<{
  (e: 'guan-bi'): void
  (e: 'fa-xiao-xi', yongHuId: string): void
  (e: 'tian-jia', yongHuId: string): void
}>()

const mingPian = ref<MingPian | null>(null)
const jiaZaiZhong = ref(false)
const cuoWuXinXi = ref('')

async function jiaZai() {
  jiaZaiZhong.value = true
  cuoWuXinXi.value = ''
  try {
    mingPian.value = await huoQuMingPian(props.yongHuId)
  } catch (cuoWu: unknown) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      cuoWuXinXi.value = huoQuCuoWuXiangYing(cuoWu)?.data?.ti_shi || huoQuFanYi('tongYong', 'wangLuoCuoWu')
    } else {
      cuoWuXinXi.value = huoQuFanYi('tongYong', 'wangLuoCuoWu')
    }
  } finally {
    jiaZaiZhong.value = false
  }
}

function guanBi() {
  emit('guan-bi')
}

function faXiaoXi() {
  emit('fa-xiao-xi', props.yongHuId)
}

function tianJiaHaoYou() {
  emit('tian-jia', props.yongHuId)
}

onMounted(() => {
  void jiaZai()
})
</script>

<style scoped>
.ziliaoka-zhezhao {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.ziliaoka-rongqi {
  position: relative;
  background: rgba(20, 24, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 28px 24px 24px;
  max-width: 360px;
  width: 100%;
}

.ziliaoka-guanbi {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}

.ziliaoka-jiazai,
.ziliaoka-cuowu {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.ziliaoka-touxiang-hang {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
}

.ziliaoka-touxiang {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  flex: none;
}

.ziliaoka-touxiang-moren {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #07c160, #0a8a44);
}

.ziliaoka-mingcheng-qu {
  min-width: 0;
}

.ziliaoka-mingcheng {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ziliaoka-uid {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.ziliaoka-qianming {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 16px;
  word-break: break-word;
  white-space: pre-wrap;
  max-height: 160px;
  overflow-y: auto;
}

.ziliaoka-qianming-kong {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 16px;
}

.ziliaoka-anniu-zu {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.anniu-fu-zhu {
  padding: 12px 24px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.anniu-que-ren {
  padding: 12px 28px;
  background: linear-gradient(135deg, #07c160, #05a050);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
