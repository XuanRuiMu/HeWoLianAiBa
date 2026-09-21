<template>
  <div class="junshi-jilu-yemian" style="overflow-y: auto">
    <div v-if="jiaZaiZhong" class="jiaZai-zhuangtai">{{ huoQuFanYi('junShi', 'jiaZaiZhong') }}</div>
    <div v-else-if="!jiLuShuJu" class="kong-zhuangtai">
      {{ huoQuFanYi('junShi', 'weiZhaoDaoJiLu') }}
    </div>
    <template v-else>
      <div class="jilu-xiangqing-kapian">
        <div class="jilu-tou">
          <button class="fanhui-anniu" @click="fanhui">
            ← {{ huoQuFanYi('caidan', 'fanHui') }}
          </button>
          <h2 class="jilu-biaoti">{{ huoQuFanYi('yeMianBiaoTi', 'junShiJiLuXiangQing') }}</h2>
          <div class="jilu-jiaose-xinxi">
            <span class="jilu-shijian">{{ jiLuShuJu.shi_jian }}</span>
            <span class="jilu-jiaose-ming">{{ jiLuShuJu.jiao_se_ming_zi }}</span>
          </div>
          <div class="jilu-junshi-xinxi">
            <img
              v-if="!touXiangShiBai"
              :src="shengChengTouXiangURL(jiLuShuJu.jun_shi_tou_xiang)"
              :alt="jiLuShuJu.jun_shi_ming_chen"
              class="jilu-junshi-touxiang"
              loading="lazy"
              @error="touXiangShiBai = true"
            />
            <span v-else class="jilu-junshi-touxiang jilu-junshi-moren">{{
              (jiLuShuJu.jun_shi_ming_chen || '军').slice(0, 1)
            }}</span>
            <span class="jilu-junshi-ming">{{ jiLuShuJu.jun_shi_ming_chen }}</span>
          </div>
        </div>

        <div
          v-if="jiLuShuJu.liao_tian_ji_lu && jiLuShuJu.liao_tian_ji_lu.length > 0"
          class="liaotian-jilu"
        >
          <h3 class="quyu-biaoti">{{ huoQuFanYi('junShi', 'liaoTianJiLu') }}</h3>
          <div class="xiaoxi-liebiao">
            <div
              v-for="(xiaoXi, suoYin) in jiLuShuJu.liao_tian_ji_lu"
              :key="suoYin"
              class="xiaoxi-xiangmu"
              :class="{ 'chehui-xiaoxi': xiaoXi.yi_che_hui }"
            >
              <span class="xiaoxi-jiaose">{{ xiaoXi.jiao_se }}</span>
              <div class="xiaoxi-neirong-qu">
                <span class="xiaoxi-neirong">{{ xiaoXi.nei_rong }}</span>
                <div v-if="xiaoXi.yi_che_hui && xiaoXi.yuan_shi_nei_rong" class="chehui-yuanshi">
                  <span class="chehui-biaoqian">{{ huoQuFanYi('junShi', 'cheHuiYuanWen') }}</span>
                  <span class="chehui-neirong">{{ xiaoXi.yuan_shi_nei_rong }}</span>
                </div>
                <div v-if="xiaoXi.yi_che_hui && xiaoXi.che_hui_shi_jian" class="chehui-shijian">
                  {{ huoQuFanYi('junShi', 'cheHuiYu') }}{{ xiaoXi.che_hui_shi_jian }}
                </div>
              </div>
              <span v-if="xiaoXi.shi_jian" class="xiaoxi-shijian">{{ xiaoXi.shi_jian }}</span>
            </div>
          </div>
        </div>

        <div class="jianyi-quyu">
          <h3 class="quyu-biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJianYi') }}</h3>
          <component
            :is="军师指导分段"
            :fen-duan="jiLuShuJu.jian_yi_fen_duan ?? null"
            :zheng-duan="jiLuShuJu.jian_yi"
          />
          <p class="ai-tishi" role="note">{{ huoQuFanYi('tongYong', 'aiTiShiTiao') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { huoQuJunShiJiLu } from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import { shengChengTouXiangURL } from '@/utils/头像'
import 军师指导分段 from '@/components/军师指导分段.vue'
import type { JunShiJiLu } from '@/types'

const route = useRoute()
const router = useRouter()
const jiLuShuJu = ref<JunShiJiLu | null>(null)
const jiaZaiZhong = ref(true)
const touXiangShiBai = ref(false)

async function jiaZaiShuJu() {
  jiaZaiZhong.value = true
  try {
    const jiaoSeId = route.params.jiaoSeId as string
    const jiLuId = route.params.jiLuId as string
    const lieBiao = await huoQuJunShiJiLu(jiaoSeId)
    jiLuShuJu.value = lieBiao.find((j) => j.shi_jian === jiLuId) || null
  } catch {
    jiLuShuJu.value = null
  } finally {
    jiaZaiZhong.value = false
  }
}

function fanhui() {
  router.back()
}

onMounted(() => {
  jiaZaiShuJu()
})
</script>

<style scoped>
.junshi-jilu-yemian {
  width: 100%;
  height: calc(100vh - 52px);
  min-height: calc(100vh - 52px);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-beijing) transparent;
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
}

.junshi-jilu-yemian::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.junshi-jilu-yemian::-webkit-scrollbar-track {
  background: transparent;
}

.junshi-jilu-yemian::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 3px;
}

.junshi-jilu-yemian::-webkit-scrollbar-thumb:hover {
  background: var(--gundong-tiao-hover);
}

.jiaZai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: 48px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

:root[data-theme='light'] .jiaZai-zhuangtai,
:root[data-theme='light'] .kong-zhuangtai {
  color: rgba(0, 0, 0, 0.4);
}

.jilu-xiangqing-kapian {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  background: rgba(20, 24, 40, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:root[data-theme='light'] .jilu-xiangqing-kapian {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.jilu-tou {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fanhui-anniu {
  align-self: flex-start;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

:root[data-theme='light'] .fanhui-anniu {
  color: rgba(0, 0, 0, 0.6);
}

.fanhui-anniu:hover {
  background: rgba(255, 255, 255, 0.1);
}

.jilu-biaoti {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

:root[data-theme='light'] .jilu-biaoti {
  color: #191919;
}

.jilu-jiaose-xinxi {
  display: flex;
  align-items: center;
  gap: 8px;
}

.jilu-shijian {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

:root[data-theme='light'] .jilu-shijian {
  color: rgba(0, 0, 0, 0.35);
}

.jilu-jiaose-ming {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

:root[data-theme='light'] .jilu-jiaose-ming {
  color: rgba(0, 0, 0, 0.7);
}

.jilu-junshi-xinxi {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.jilu-junshi-touxiang {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--beijing-ciuse);
}

.jilu-junshi-moren {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #8b6914, #d4a843);
}

.jilu-junshi-ming {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

:root[data-theme='light'] .jilu-junshi-ming {
  color: rgba(0, 0, 0, 0.7);
}

.quyu-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

:root[data-theme='light'] .quyu-biaoti {
  color: rgba(0, 0, 0, 0.6);
}

.jianyi-quyu {
  padding: 16px;
  background: rgba(167, 139, 250, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(167, 139, 250, 0.15);
}

.liaotian-jilu {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:root[data-theme='light'] .liaotian-jilu {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.xiaoxi-liebiao {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.xiaoxi-xiangmu {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.xiaoxi-xiangmu.chehui-xiaoxi {
  opacity: 0.6;
}

.xiaoxi-jiaose {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  min-width: 24px;
}

:root[data-theme='light'] .xiaoxi-jiaose {
  color: rgba(0, 0, 0, 0.6);
}

.xiaoxi-neirong-qu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.xiaoxi-neirong {
  color: rgba(255, 255, 255, 0.6);
  word-break: break-word;
}

:root[data-theme='light'] .xiaoxi-neirong {
  color: rgba(0, 0, 0, 0.5);
}

.chehui-yuanshi {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(255, 152, 0, 0.08);
  border-radius: 4px;
  border-left: 2px solid rgba(255, 152, 0, 0.4);
}

.chehui-biaoqian {
  color: rgba(255, 152, 0, 0.7);
  font-weight: 600;
}

.chehui-neirong {
  color: rgba(255, 152, 0, 0.9);
}

.chehui-shijian {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

:root[data-theme='light'] .chehui-shijian {
  color: rgba(0, 0, 0, 0.25);
}

.xiaoxi-shijian {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

:root[data-theme='light'] .xiaoxi-shijian {
  color: rgba(0, 0, 0, 0.25);
}

.ai-tishi {
  margin-top: 12px;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1.4;
  text-align: right;
  color: var(--wenben-ciuse);
}
</style>
