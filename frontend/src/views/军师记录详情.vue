<template>
  <div class="junshi-jilu-yemian">
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
        </div>

        <div v-if="jiLuShuJu.dui_hua_zhai_yao" class="duihua-zhaiyao">
          <h3 class="quyu-biaoti">{{ huoQuFanYi('junShi', 'duiHuaZhaiYao') }}</h3>
          <p class="zhaiyao-neirong">
            {{ jiLuShuJu.dui_hua_zhai_yao }}
          </p>
        </div>

        <div v-if="jiLuShuJu.hou_tai_shu_ju" class="houtai-shuju-quyu">
          <h3 class="quyu-biaoti" style="cursor: pointer" @click="zhanKaiHouTai = !zhanKaiHouTai">
            {{ huoQuFanYi('junShi', 'houTaiShuJu') }}
            <span class="zhanKai-biaoji">{{ zhanKaiHouTai ? '▼' : '▶' }}</span>
          </h3>
          <div v-if="zhanKaiHouTai" class="houtai-neirong">
            <div v-if="jiLuShuJu.hou_tai_shu_ju.haoGanDu" class="houtai-haogandu">
              <div class="houtai-haogandu-jieduan">
                <span class="houtai-biaoti">{{ huoQuFanYi('junShi', 'guanXiJieDuan') }}</span>
                <span class="houtai-jieduan">{{
                  jiLuShuJu.hou_tai_shu_ju.haoGanDu.guanXiJieDuanMingCheng
                }}</span>
              </div>
            </div>

            <div
              v-if="
                jiLuShuJu.hou_tai_shu_ju.fuPanShuJu &&
                jiLuShuJu.hou_tai_shu_ju.fuPanShuJu.length > 0
              "
              class="houtai-fupan"
            >
              <div class="houtai-biaoti-fupan">{{ huoQuFanYi('junShi', 'aiXinLiHuoDong') }}</div>
              <div
                v-for="(tiaoMu, suoYin) in jiLuShuJu.hou_tai_shu_ju.fuPanShuJu"
                :key="suoYin"
                class="houtai-fupan-tiaomu"
              >
                <div class="fupan-lunci">{{ geShiHuaDiNLun(suoYin + 1) }}</div>
                <div class="fupan-xinxi">
                  <div class="fupan-hang">
                    <span class="fupan-biaoqian">{{ huoQuFanYi('junShi', 'niShuo') }}</span
                    >{{ tiaoMu.yong_hu_xiao_xi || '' }}
                  </div>
                  <div class="fupan-hang">
                    <span class="fupan-biaoqian">{{ huoQuFanYi('junShi', 'taHui') }}</span
                    >{{ tiaoMu.ai_hui_fu || '' }}
                  </div>
                  <div class="fupan-hang fupan-neixin">
                    <span class="fupan-biaoqian">{{ huoQuFanYi('junShi', 'neiXin') }}</span
                    >{{ tiaoMu.ai_xin_li_huo_dong || huoQuFanYi('junShi', 'wuJiLu') }}
                  </div>
                </div>
              </div>
            </div>
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
                  {{ huoQuFanYi('junShi', 'cheHuiYu') }} {{ xiaoXi.che_hui_shi_jian }}
                </div>
              </div>
              <span v-if="xiaoXi.shi_jian" class="xiaoxi-shijian">{{ xiaoXi.shi_jian }}</span>
            </div>
          </div>
        </div>

        <div class="jianyi-quyu">
          <h3 class="quyu-biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJianYi') }}</h3>
          <p class="jianyi-neirong">
            {{ jiLuShuJu.jian_yi }}
          </p>
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
import type { JunShiJiLu } from '@/types'

const route = useRoute()
const router = useRouter()
const jiLuShuJu = ref<JunShiJiLu | null>(null)
const jiaZaiZhong = ref(true)
const zhanKaiHouTai = ref(false)

function geShiHuaDiNLun(lun: number): string {
  return huoQuFanYi('junShi', 'diNLun').replace('{轮}', String(lun))
}

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
  min-height: calc(100vh - 52px);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.jiaZai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: 48px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

:root[data-theme='浅色'] .jiaZai-zhuangtai,
:root[data-theme='浅色'] .kong-zhuangtai {
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

:root[data-theme='浅色'] .jilu-xiangqing-kapian {
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

:root[data-theme='浅色'] .fanhui-anniu {
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

:root[data-theme='浅色'] .jilu-biaoti {
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

:root[data-theme='浅色'] .jilu-shijian {
  color: rgba(0, 0, 0, 0.35);
}

.jilu-jiaose-ming {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

:root[data-theme='浅色'] .jilu-jiaose-ming {
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

:root[data-theme='浅色'] .quyu-biaoti {
  color: rgba(0, 0, 0, 0.6);
}

.zhanKai-biaoji {
  font-size: 10px;
}

.duihua-zhaiyao {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:root[data-theme='浅色'] .duihua-zhaiyao {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.zhaiyao-neirong {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0;
}

:root[data-theme='浅色'] .zhaiyao-neirong {
  color: rgba(0, 0, 0, 0.5);
}

.houtai-shuju-quyu {
  padding: 16px;
  background: rgba(167, 139, 250, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(167, 139, 250, 0.12);
}

.houtai-neirong {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.houtai-haogandu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.houtai-haogandu-jieduan {
  display: flex;
  align-items: center;
  gap: 8px;
}

.houtai-biaoti {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

:root[data-theme='浅色'] .houtai-biaoti {
  color: rgba(0, 0, 0, 0.6);
}

.houtai-jieduan {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(167, 139, 250, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

:root[data-theme='浅色'] .houtai-jieduan {
  color: rgba(0, 0, 0, 0.5);
  background: rgba(167, 139, 250, 0.1);
}

.houtai-fupan {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.houtai-biaoti-fupan {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

:root[data-theme='浅色'] .houtai-biaoti-fupan {
  color: rgba(0, 0, 0, 0.6);
}

.houtai-fupan-tiaomu {
  padding: 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

:root[data-theme='浅色'] .houtai-fupan-tiaomu {
  background: rgba(0, 0, 0, 0.02);
}

.fupan-lunci {
  font-size: 11px;
  font-weight: 700;
  color: rgba(167, 139, 250, 0.8);
  margin-bottom: 4px;
}

.fupan-xinxi {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fupan-hang {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  word-break: break-word;
}

:root[data-theme='浅色'] .fupan-hang {
  color: rgba(0, 0, 0, 0.45);
}

.fupan-biaoqian {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

:root[data-theme='浅色'] .fupan-biaoqian {
  color: rgba(0, 0, 0, 0.6);
}

.fupan-neixin {
  color: rgba(167, 139, 250, 0.8);
  font-style: italic;
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

:root[data-theme='浅色'] .liaotian-jilu {
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

:root[data-theme='浅色'] .xiaoxi-jiaose {
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

:root[data-theme='浅色'] .xiaoxi-neirong {
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

:root[data-theme='浅色'] .chehui-shijian {
  color: rgba(0, 0, 0, 0.25);
}

.xiaoxi-shijian {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

:root[data-theme='浅色'] .xiaoxi-shijian {
  color: rgba(0, 0, 0, 0.25);
}

.jianyi-neirong {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap;
}

:root[data-theme='浅色'] .jianyi-neirong {
  color: rgba(0, 0, 0, 0.75);
}
</style>
