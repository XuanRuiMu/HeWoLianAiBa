<template>
  <div class="haoyou-yemian">
    <div class="sousuo-hang">
      <input
        v-model="guanJianZi"
        class="sousuo-kuang"
        :placeholder="huoQuFanYi('haoYou', 'souSuoZhanWei')"
        maxlength="50"
        @keydown.enter="zhiXingSouSuo"
      />
      <button class="sousuo-anniu" :disabled="souSuoZhong || !guanJianZi.trim()" @click="zhiXingSouSuo">
        {{ souSuoZhong ? huoQuFanYi('haoYou', 'souSuoZhong') : huoQuFanYi('haoYou', 'souSuo') }}
      </button>
    </div>
    <RequestError
      v-if="qianTaiCuoWu"
      :cuo-wu="qianTaiCuoWu"
      :zhong-zai="qianTaiZhuangTai === 'loading'"
      @chong-shi="chongShi"
    />
    <p v-if="caoZuoTiShi" class="cuowu-tishi" role="status">{{ caoZuoTiShi }}</p>
    <KongTai
      v-if="souSuoWuJieGuo && !qianTaiCuoWu && !caoZuoTiShi"
      :biao-ti="huoQuFanYi('haoYou', 'souSuoWuJieGuo')"
      :chong-shi-wen-zi="huoQuFanYi('haoYou', 'souSuo')"
      @chong-shi="zhiXingSouSuo"
    />
    <div v-if="souSuoJieGuo.length" class="jieguo-qu">
      <div v-for="yongHu in souSuoJieGuo" :key="yongHu.id" class="yonghu-xiangmu">
        <button class="ziliao-anniu" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')" @click="daKaiZiLiaoKa(yongHu.id)">
          <TouXiang :tou-xiang="yongHu.tou_xiang" :mo-ren-zi="(yongHu.ni_cheng || yongHu.yong_hu_ming || '?').slice(0, 1)" />
        </button>
        <div class="yonghu-wen-zi">
          <span class="yonghu-ming">{{ yongHu.ni_cheng || yongHu.yong_hu_ming || yongHu.shou_ji_hao }}</span>
          <span v-if="yongHu.qian_ming" class="yonghu-qianming">{{ yongHu.qian_ming }}</span>
          <span class="yonghu-hao">{{ yongHu.shou_ji_hao }}</span>
        </div>
        <button
          class="tianjia-anniu"
          :disabled="yongHu.shi_hao_you || zhengZaiShenQing === yongHu.id"
          @click="faSongShenQing(yongHu)"
        >
          {{ yongHu.shi_hao_you ? huoQuFanYi('haoYou', 'jinRuLiaoTian') : huoQuFanYi('haoYou', 'faSongShenQing') }}
        </button>
      </div>
    </div>
    <h2 class="quyu-biaoti">{{ huoQuFanYi('haoYou', 'shouDaoShenQing') }}</h2>
    <KongTai
      v-if="!shouDaoLieBiao.length && !qianTaiCuoWu"
      :biao-ti="huoQuFanYi('haoYou', 'zanWuShenQing')"
    />
    <div v-for="shenQing in shouDaoLieBiao" :key="shenQing.id" class="shenqing-xiangmu">
      <span class="yonghu-ming">{{ shenQing.ni_cheng || shenQing.yong_hu_ming }}</span>
      <div class="shenqing-anniu-zu">
        <button class="jieshou-anniu" @click="jieShou(shenQing.id)">{{ huoQuFanYi('haoYou', 'jieShou') }}</button>
        <button class="jujue-anniu" @click="juJue(shenQing.id)">{{ huoQuFanYi('haoYou', 'juJue') }}</button>
      </div>
    </div>
    <h2 class="quyu-biaoti">{{ huoQuFanYi('haoYou', 'haoYouLieBiao') }}</h2>
    <KongTai
      v-if="!haoYouLieBiao.length && !qianTaiCuoWu"
      :biao-ti="huoQuFanYi('haoYou', 'zanWuHaoYou')"
    />
    <template v-for="fenQu in haoYouFenQu" :key="fenQu.shouZiMu">
      <h3 class="fen-qu-biao-ti" :data-fen-qu="fenQu.shouZiMu">{{ fenQu.shouZiMu }}</h3>
      <div v-for="haoYou in fenQu.lieBiao" :key="haoYou.id" class="haoyou-xiangmu">
        <button class="ziliao-anniu" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')" @click="daKaiZiLiaoKa(haoYou.id)">
          <TouXiang :tou-xiang="haoYou.tou_xiang" :mo-ren-zi="(haoYou.ni_cheng || haoYou.yong_hu_ming || '?').slice(0, 1)" />
        </button>
        <div class="yonghu-wen-zi">
          <span class="yonghu-ming">{{ haoYou.ni_cheng || haoYou.yong_hu_ming }}</span>
          <span v-if="haoYou.qian_ming" class="yonghu-qianming">{{ haoYou.qian_ming }}</span>
        </div>
        <div class="haoyou-anniu-zu">
          <button class="liaotian-anniu" @click="jinRuLiaoTian(haoYou.id)">{{ huoQuFanYi('haoYou', 'jinRuLiaoTian') }}</button>
          <button class="shanchu-anniu" @click="shanChu(haoYou.id)">{{ huoQuFanYi('haoYou', 'shanChuHaoYou') }}</button>
        </div>
      </div>
    </template>
    <nav v-if="suoYinLieBiao.length" class="suo-yin-lan" :aria-label="huoQuFanYi('haoYou', 'haoYouLieBiao')">
      <button
        v-for="shouZiMu in suoYinLieBiao"
        :key="'suo-yin-' + shouZiMu"
        class="suo-yin-xiang"
        @click="gunDongDaoFenQu(shouZiMu)"
      >
        {{ shouZiMu }}
      </button>
    </nav>
    <p class="junshi-tishi">{{ huoQuFanYi('haoYou', 'junShiRuKou') }}</p>
    <Teleport to="body">
      <YongHuZiLiaoKa
        v-if="ziLiaoKaYongHuId"
        :yong-hu-id="ziLiaoKaYongHuId"
        @guan-bi="guanBiZiLiaoKa"
        @fa-xiao-xi="jinRuLiaoTian"
        @tian-jia="chuLiZiLiaoKaTianJia"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import {
  souSuoHaoYou,
  faSongHaoYouShenQing,
  huoQuShouDaoShenQing,
  jieShouHaoYouShenQing,
  juJueHaoYouShenQing,
  huoQuHaoYouLieBiao,
  shanChuHaoYou,
  type HaoYouSouSuoXiang,
  type HaoYouShenQingXiang,
  type HaoYouXiang,
} from '@/api/社交'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { 归一前台错误 } from '@/utils/前台错误'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import TouXiang from '@/components/头像.vue'
import YongHuZiLiaoKa from '@/components/用户资料卡.vue'
import KongTai from '@/components/空态.vue'

const router = useRouter()
const guanJianZi = ref('')
const souSuoZhong = ref(false)
const souSuoJieGuo = ref<HaoYouSouSuoXiang[]>([])
const souSuoWuJieGuo = ref(false)
const shouDaoLieBiao = ref<HaoYouShenQingXiang[]>([])
const haoYouLieBiao = ref<HaoYouXiang[]>([])
const caoZuoTiShi = ref('')
const zhengZaiShenQing = ref<string | null>(null)
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, jieShou: jieShouQianTai, chongShi, qingLi } =
  use前台错误()
const ziLiaoKaYongHuId = ref<string | null>(null)

function daKaiZiLiaoKa(yongHuId: string) {
  ziLiaoKaYongHuId.value = yongHuId
}

function guanBiZiLiaoKa() {
  ziLiaoKaYongHuId.value = null
}

async function chuLiZiLiaoKaTianJia(yongHuId: string) {
  guanBiZiLiaoKa()
  zhengZaiShenQing.value = yongHuId
  caoZuoTiShi.value = ''
  qingLi()
  try {
    await faSongHaoYouShenQing(yongHuId)
    caoZuoTiShi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => chuLiZiLiaoKaTianJia(yongHuId))
  } finally {
    zhengZaiShenQing.value = null
  }
}

async function shuaXinLieBiao() {
  await yunXing(
    async () => {
      const [shouDao, haoYou] = await Promise.all([huoQuShouDaoShenQing(), huoQuHaoYouLieBiao()])
      shouDaoLieBiao.value = shouDao
      haoYouLieBiao.value = haoYou
    },
    { chongShi: shuaXinLieBiao },
  )
}

async function zhiXingSouSuo() {
  const wenBen = guanJianZi.value.trim()
  if (!wenBen) return
  souSuoZhong.value = true
  caoZuoTiShi.value = ''
  souSuoWuJieGuo.value = false
  qingLi()
  try {
    souSuoJieGuo.value = await souSuoHaoYou(wenBen)
  } catch (cuoWu: unknown) {
    if (归一前台错误(cuoWu).code === QIAN_TAI_DAI_MA.RESOURCE_NOT_FOUND) {
      souSuoWuJieGuo.value = true
    } else {
      jieShouQianTai(cuoWu, zhiXingSouSuo)
    }
    souSuoJieGuo.value = []
  } finally {
    souSuoZhong.value = false
  }
}

async function faSongShenQing(yongHu: HaoYouSouSuoXiang) {
  if (yongHu.shi_hao_you) {
    jinRuLiaoTian(yongHu.id)
    return
  }
  zhengZaiShenQing.value = yongHu.id
  caoZuoTiShi.value = ''
  qingLi()
  try {
    await faSongHaoYouShenQing(yongHu.id)
    caoZuoTiShi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => faSongShenQing(yongHu))
  } finally {
    zhengZaiShenQing.value = null
  }
}

async function jieShou(shenQingId: string) {
  qingLi()
  try {
    await jieShouHaoYouShenQing(shenQingId)
    await shuaXinLieBiao()
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => jieShou(shenQingId))
  }
}

async function juJue(shenQingId: string) {
  qingLi()
  try {
    await juJueHaoYouShenQing(shenQingId)
    await shuaXinLieBiao()
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => juJue(shenQingId))
  }
}

async function shanChu(haoYouId: string) {
  if (!window.confirm(huoQuFanYi('haoYou', 'queRenShanChuHaoYou'))) return
  qingLi()
  try {
    await shanChuHaoYou(haoYouId)
    await shuaXinLieBiao()
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => shanChu(haoYouId))
  }
}

function jinRuLiaoTian(haoYouId: string) {
  // 先关资料卡再跳转：否则返回时历史栈与弹窗状态错位，需多点一次返回
  guanBiZiLiaoKa()
  router.push(`/hao-you/${haoYouId}`)
}

function huoQuHaoYouXianShiMing(haoYou: HaoYouXiang): string {
  return haoYou.ni_cheng || haoYou.yong_hu_ming || ''
}

const HAN_YU_PIN_YIN_ANCHORS = [
  '啊', '芭', '擦', '搭', '鹅', '发', '噶', '哈', '击', '喀', '垃', '妈', '拿', '哦', '啪', '期',
  '然', '撒', '塌', '挖', '昔', '压', '匝',
] as const
const HAN_YU_PIN_YIN_SHOU_ZI_MU = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
  'R', 'S', 'T', 'W', 'X', 'Y', 'Z',
] as const
const PIN_YIN_COLLATOR = new Intl.Collator('zh')

function hanYuPinYinShouZiMu(danZi: string): string | null {
  for (let i = HAN_YU_PIN_YIN_ANCHORS.length - 1; i >= 0; i -= 1) {
    if (PIN_YIN_COLLATOR.compare(danZi, HAN_YU_PIN_YIN_ANCHORS[i] as string) >= 0) {
      return HAN_YU_PIN_YIN_SHOU_ZI_MU[i] as string
    }
  }
  return null
}

function huoQuHaoYouShouZiMu(haoYou: HaoYouXiang): string {
  const ming = huoQuHaoYouXianShiMing(haoYou).trim()
  if (!ming) return '#'
  const shouZi = Array.from(ming)[0] as string
  if (/[a-zA-Z]/.test(shouZi)) return shouZi.toUpperCase()
  if (/[0-9]/.test(shouZi)) return '#'
  const pinYin = hanYuPinYinShouZiMu(shouZi)
  return pinYin ?? '#'
}

const haoYouFenQu = computed(() => {
  const fenZu = new Map<string, HaoYouXiang[]>()
  for (const haoYou of haoYouLieBiao.value) {
    const shouZiMu = huoQuHaoYouShouZiMu(haoYou)
    const yiCun = fenZu.get(shouZiMu)
    if (yiCun) yiCun.push(haoYou)
    else fenZu.set(shouZiMu, [haoYou])
  }
  const paiXu = [...fenZu.entries()].sort((a, b) => {
    if (a[0] === '#') return 1
    if (b[0] === '#') return -1
    return a[0].localeCompare(b[0])
  })
  return paiXu.map(([shouZiMu, lieBiao]) => ({
    shouZiMu,
    lieBiao: [...lieBiao].sort((a, b) =>
      huoQuHaoYouXianShiMing(a).localeCompare(huoQuHaoYouXianShiMing(b), 'zh'),
    ),
  }))
})

const suoYinLieBiao = computed(() => haoYouFenQu.value.map((fenQu) => fenQu.shouZiMu))

function gunDongDaoFenQu(shouZiMu: string): void {
  const muBiao = document.querySelector(`[data-fen-qu="${shouZiMu}"]`)
  if (muBiao) muBiao.scrollIntoView({ block: 'start' })
}

onMounted(shuaXinLieBiao)
</script>

<style scoped>
.haoyou-yemian {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--jiange-zhong);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  overflow-y: auto;
}
.sousuo-hang {
  display: flex;
  gap: var(--jiange-xiao);
}
.sousuo-kuang {
  flex: 1;
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: 8px;
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-zhuse);
}
.sousuo-anniu,
.tianjia-anniu,
.jieshou-anniu,
.liaotian-anniu {
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 8px;
  background: var(--zhuse);
  color: #fff;
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
}
.sousuo-anniu:disabled,
.tianjia-anniu:disabled {
  opacity: 0.5;
}
.quyu-biaoti {
  font-size: 14px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: var(--wenben-zhuse);
  margin: var(--jiange-xiao) 0 0;
}
.fen-qu-biao-ti {
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: var(--wenben-ciuse);
  margin: var(--jiange-xiao) 0 0;
}
.suo-yin-lan {
  position: sticky;
  bottom: var(--jiange-xiao);
  display: flex;
  flex-wrap: wrap;
  gap: var(--jiange-4);
  padding: var(--jiange-xiao) 0;
  background: transparent;
}
.suo-yin-xiang {
  min-width: 24px;
  min-height: 24px;
  padding: 0 var(--jiange-4);
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  font-size: 12px;
}
.junshi-tishi {
  font-size: 12px;
  color: var(--wenben-tishi);
}
.cuowu-tishi {
  font-size: 13px;
  color: var(--cuowu-yanse);
}
.yonghu-xiangmu,
.shenqing-xiangmu,
.haoyou-xiangmu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: 10px;
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
}
.yonghu-ming {
  flex: 1;
  font-size: 14px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.yonghu-wen-zi {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}
.yonghu-qianming {
  font-size: 12px;
  color: var(--wenben-tishi);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ziliao-anniu {
  flex: none;
  display: flex;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  font-size: 18px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: #fff;
  background: linear-gradient(135deg, #07c160, #0a8a44);
}
.yonghu-hao {
  font-size: 12px;
  color: var(--wenben-tishi);
}
.shenqing-anniu-zu,
.haoyou-anniu-zu {
  display: flex;
  gap: var(--jiange-6);
}
.jujue-anniu,
.shanchu-anniu {
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  font-size: 13px;
}
</style>
