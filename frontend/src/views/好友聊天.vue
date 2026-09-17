<template>
  <div class="liaotian-yemian">
    <div class="haoyou-dingbu">
      <button class="haoyou-fanhui" @click="fanHui">
        <span class="haoyou-fanhui-jiantou" aria-hidden="true" />
        {{ huoQuFanYi('caidan', 'fanHui') }}
      </button>
      <span v-if="haoYouMing" class="haoyou-dingbu-ming">{{ haoYouMing }}</span>
    </div>
    <KongTai
      v-if="feiHaoYou"
      :biao-ti="huoQuFanYi('haoYou', 'feiHaoYou')"
      :chong-shi-wen-zi="huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao')"
      @chong-shi="fanHuiLieBiao"
    />
    <KongTai
      v-else-if="jiaZaiShiBai"
      :biao-ti="huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai')"
      :chong-shi-wen-zi="huoQuFanYi('liaoTian', 'chongShi')"
      @chong-shi="chongShiJiaZai"
    />
    <template v-else>
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu" :class="beiJingLeiMing" :style="[beiJingYangShi, qiPaoYangShi]" role="log" aria-live="polite" :aria-label="huoQuFanYi('liaoTian', 'xiaoXiLieBiao')">
      <div v-for="xiaoXi in xiaoXiLieBiao" :key="xiaoXi.id" class="xiaoxi-xiangmu" :class="xiaoXi.fa_song_zhe_id === woDeId ? 'yonghu-xiaoxi' : 'jiaose-xiaoxi'">
        <div class="xiaoxi-touxiang">
          <img
            v-if="xianShiTouXiang(xiaoXi)"
            :src="xianShiTouXiang(xiaoXi) || undefined"
            class="touxiang-tu"
            loading="lazy"
            :alt="huoQuFanYi('haoYou', 'touXiang')"
          />
          <span v-else class="touxiang-moren" aria-hidden="true">{{ touXiangMoRenZi(xiaoXi) }}</span>
        </div>
        <div class="qipao-waike">
          <div class="qipao-neirong">{{ xiaoXi.yi_che_hui ? cheHuiWenBen : xiaoXi.nei_rong }}</div>
        </div>
        <button v-if="keCheHui(xiaoXi)" class="chehui-xiao-anniu" @click="cheHui(xiaoXi.id)">
          {{ huoQuFanYi('liaoTian', 'cheHui') }}
        </button>
      </div>
    </main>
    <footer class="shuru-quyu">
      <div class="shuru-rongqi">
        <div class="shuru-kuang-waike">
          <textarea v-model="shuRuNeiRong" class="shuru-kuang" rows="1" :placeholder="huoQuFanYi('haoYou', 'shuRuXiaoXi')" maxlength="500" @keydown.enter="chuLiHuiChe" />
        </div>
        <button class="fasong-anniu" :disabled="!shuRuNeiRong.trim() || faSongZhong" @click="faSong">
          {{ huoQuFanYi('haoYou', 'faSong') }}
        </button>
      </div>
      <p v-if="faSongTiShi" class="fasong-tishi">{{ faSongTiShi }}</p>
      <p v-if="caoGaoYiHuiFu" class="fasong-tishi" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
    </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuHaoYouXiaoXi, faSongHaoYouXiaoXi, cheHuiHaoYouXiaoXi, biaoJiHaoYouYiDu, huoQuHaoYouLieBiao, type HaoYouXiaoXi } from '@/api/社交'
import { huoQuMingPian } from '@/api/资料'
import { guiYiHuaQiPao, huoQuQiPaoCSSBianLiang } from '@/config/气泡主题'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { shiTuPianDiZhi } from '@/utils/头像'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'
import KongTai from '@/components/空态.vue'

const route = useRoute()
const router = useRouter()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const haoYouId = String(route.params.haoYouId || '')
const woDeId = 用户仓库.dangQianYongHu?.id || ''
const xiaoXiLieBiao = ref<HaoYouXiaoXi[]>([])
const shuRuNeiRong = ref('')
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian(haoYouId), shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const beiJingLeiMing = computed(() => (设置仓库.shiYuShe ? `beijing-${设置仓库.liaoTianBeiJing || 'moRen'}` : 'beijing-ziDingYi'))
const beiJingYangShi = computed(() => 设置仓库.beiJingNeiLianYangShi)
const cheHuiWenBen = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
const feiHaoYou = ref(false)
const jiaZaiShiBai = ref(false)
const faSongTiShi = ref('')
const haoYouTouXiang = ref<string | null>(null)
const haoYouMing = ref('')
const haoYouQiPao = ref<string | null>(null)
const lunXunDingShi = ref<number | null>(null)
const qiPaoYangShi = computed(() =>
  huoQuQiPaoCSSBianLiang(设置仓库.qiPaoZiJi, guiYiHuaQiPao(haoYouQiPao.value, 设置仓库.qiPaoAI)),
)

function xianShiTouXiang(xiaoXi: HaoYouXiaoXi): string | null {
  const diZhi = xiaoXi.fa_song_zhe_id === woDeId ? 用户仓库.dangQianYongHu?.tou_xiang : haoYouTouXiang.value
  return diZhi && shiTuPianDiZhi(diZhi) ? diZhi : null
}

function touXiangMoRenZi(xiaoXi: HaoYouXiaoXi): string {
  if (xiaoXi.fa_song_zhe_id === woDeId) {
    return (用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || '我').slice(0, 1)
  }
  return (haoYouMing.value || '友').slice(0, 1)
}

function keCheHui(xiaoXi: HaoYouXiaoXi): boolean {
  if (xiaoXi.fa_song_zhe_id !== woDeId || xiaoXi.yi_che_hui) return false
  return Date.now() - xiaoXi.shi_jian_chuo <= 2 * 60 * 1000
}

function gunDongDaoDiBu() {
  requestAnimationFrame(() => {
    if (xiaoxiQuYuRef.value) xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
  })
}

async function shuaXin(youBiao?: { xu_hao: number | null; shi_jian: number; id: string }) {
  try {
    // YH-087 好友聊天实时分页：游标分页+轮询增量，发送乐观更新禁全量刷新
    const xinLieBiao = await huoQuHaoYouXiaoXi(haoYouId, 50, youBiao)
    if (youBiao) {
      if (xinLieBiao.length > 0) {
        const yiCunId = new Set(xiaoXiLieBiao.value.map((x) => x.id))
        const zengLiang = xinLieBiao.filter((x) => !yiCunId.has(x.id))
        xiaoXiLieBiao.value = [...zengLiang, ...xiaoXiLieBiao.value]
      }
    } else {
      xiaoXiLieBiao.value = xinLieBiao
    }
    jiaZaiShiBai.value = false
  } catch (cuoWu: unknown) {
    // 非好友或加载失败都走空态，不让整页崩进错误边界
    if (huoQuCuoWuXiangYing(cuoWu)?.status === 403) {
      feiHaoYou.value = true
    } else {
      jiaZaiShiBai.value = true
    }
    return
  }
  gunDongDaoDiBu()
  void biaoJiHaoYouYiDu(haoYouId)
}

function fanHui() {
  // 单次返回直达上一页：历史栈见底（如直链进入）时替换到好友列表，避免点击无反应
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace('/hao-you')
}

function fanHuiLieBiao() {
  // 空态返回用替换而非推入：避免“返回又回来”导致多点一次
  router.replace('/hao-you')
}

async function chongShiJiaZai() {
  jiaZaiShiBai.value = false
  await shuaXin()
}

async function faSong() {
  const wenBen = shuRuNeiRong.value.trim()
  if (!wenBen) return
  if (faSongZhong.value) return
  faSongZhong.value = true
  faSongTiShi.value = ''
  const miDengJian = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  // YH-087 发送乐观更新：先本地落一条再调接口，失败回滚禁全量刷新
  const leGuanId = `le-guan-${miDengJian}`
  const leGuanXiaoXi = { id: leGuanId, nei_rong: wenBen, fa_song_zhe_id: woDeId, shi_jian_chuo: Date.now(), yi_che_hui: false } as HaoYouXiaoXi
  try {
    shuRuNeiRong.value = ''
    qingChuCaoGao()
    xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
    gunDongDaoDiBu()
    await faSongHaoYouXiaoXi(haoYouId, wenBen, miDengJian)
    await shuaXin()
  } catch (cuoWu: unknown) {
    // 发送失败（含账号封禁403）就地提示，不抛到全局
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    shuRuNeiRong.value = wenBen
    faSongTiShi.value = duQuTiShi(cuoWu)
  } finally {
    faSongZhong.value = false
  }
}

function duQuTiShi(cuoWu: unknown): string {
  if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
    return huoQuCuoWuXiangYing(cuoWu)?.data?.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai')
  }
  return cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('tongYong', 'caoZuoShiBai')
}

function chuLiHuiChe(shijian: KeyboardEvent) {
  if (shijian.shiftKey) return
  shijian.preventDefault()
  void faSong()
}

async function cheHui(xiaoXiId: string) {
  await cheHuiHaoYouXiaoXi(xiaoXiId)
  await shuaXin()
}

onMounted(async () => {
  await 设置仓库.jiaZai()
  caoGaoYiHuiFu.value = huiFuCaoGao()
  try {
    const lieBiao = await huoQuHaoYouLieBiao()
    const haoYou = lieBiao.find((xiang) => xiang.id === haoYouId)
    if (haoYou) {
      haoYouTouXiang.value = haoYou.tou_xiang
      haoYouMing.value = haoYou.ni_cheng || haoYou.yong_hu_ming || ''
    }
  } catch {
    /* 好友信息加载失败时仅用默认头像 */
  }
  try {
    const mingPian = await huoQuMingPian(haoYouId)
    haoYouQiPao.value = typeof mingPian.qi_pao_zi_ji === 'string' ? mingPian.qi_pao_zi_ji : null
  } catch {
    /* 对方气泡偏好不可用时回退到自身AI气泡 */
  }
  await shuaXin()
  // YH-087 轮询增量：socket缺席时30s轮询兜底，禁固定50全量
  lunXunDingShi.value = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    const zuiXin = xiaoXiLieBiao.value[xiaoXiLieBiao.value.length - 1]
    void shuaXin(zuiXin ? { xu_hao: null, shi_jian: zuiXin.shi_jian_chuo, id: zuiXin.id } : undefined)
  }, 30000)
})

onBeforeUnmount(() => {
  if (lunXunDingShi.value !== null) {
    window.clearInterval(lunXunDingShi.value)
    lunXunDingShi.value = null
  }
})
</script>

<style scoped>
.liaotian-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--beijing-zhuse);
}
/* 好友聊天顶栏：显式返回按钮，单次点击直达上一页 */
.haoyou-dingbu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--dingbu-lan-beijing);
  border-bottom: 0.5px solid var(--biankuang-yanse);
  flex: none;
}
.haoyou-fanhui {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: 15px;
  padding: 6px 8px 6px 2px;
  cursor: pointer;
}
.haoyou-fanhui-jiantou {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid currentcolor;
}
.haoyou-dingbu-ming {
  font-size: 15px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xiaoxi-quyu {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  background: var(--liaotian-beijing);
}
.beijing-miWuSenLin { background: linear-gradient(135deg, #1a2f1a, #2d4a2d); }
.beijing-haiYangZhiLan { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); }
.beijing-fenSeMengJing { background: linear-gradient(135deg, #f7d6e0, #f2a7c3); }
.beijing-yeKongXingHe { background: linear-gradient(135deg, #0a0a23, #1a1a4d); }
.beijing-miSeTianYuan { background: linear-gradient(135deg, #f5f0e1, #e8dcc3); }
.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  max-width: 100%;
}
.yonghu-xiaoxi { flex-direction: row-reverse; align-self: flex-end; }
.jiaose-xiaoxi { flex-direction: row; align-self: flex-start; }
.xiaoxi-touxiang {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-beijing-moren);
  flex-shrink: 0;
  font-size: 18px;
  color: var(--wenben-zhuse);
}
.yonghu-xiaoxi .xiaoxi-touxiang { margin-left: 10px; }
.jiaose-xiaoxi .xiaoxi-touxiang { margin-right: 10px; }
.touxiang-tu { width: 100%; height: 100%; object-fit: cover; }
.qipao-waike { max-width: min(calc(100vw - 126px), 520px); }
.qipao-neirong {
  padding: 9px 13px;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
  position: relative;
  display: inline-block;
}
.yonghu-xiaoxi .qipao-neirong { background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing)); color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben)); }
.jiaose-xiaoxi .qipao-neirong { background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing)); color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben)); }
.chehui-xiao-anniu {
  font-size: 12px;
  color: var(--wenben-tishi);
  padding: 4px 8px;
  /* YH-101 触屏目标：最小24px推荐44px，12px点不到收敛为最小可点 */
  min-width: 24px;
  min-height: 24px;
}
.shuru-quyu {
  background: var(--shuru-quyu-beijing);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  padding: 8px 10px;
  padding-bottom: calc(8px + var(--anquan-quyu-xia));
}
.shuru-rongqi { display: flex; align-items: flex-end; gap: 8px; }
.shuru-kuang-waike {
  flex: 1;
  background: var(--beijing-kaopian);
  border-radius: 6px;
  border: 0.5px solid var(--shuru-quyu-biankuang);
}
.shuru-kuang {
  width: 100%;
  padding: 6px 12px;
  font-size: 16px;
  color: var(--wenben-zhuse);
  display: block;
  resize: none;
}
.fasong-anniu {
  padding: 10px 14px;
  background: var(--zhuse);
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
}
.fasong-anniu:disabled { opacity: 0.4; }
.fasong-tishi {
  margin: 6px 2px 0;
  font-size: 12px;
  color: var(--cuowu-yanse, #ff6b6b);
}
</style>
