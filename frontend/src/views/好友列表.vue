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
    <p v-if="cuoWuXinXi" class="cuowu-tishi">{{ cuoWuXinXi }}</p>
    <KongTai
      v-else-if="souSuoWuJieGuo"
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
    <KongTai v-if="!shouDaoLieBiao.length" :biao-ti="huoQuFanYi('haoYou', 'zanWuShenQing')" />
    <div v-for="shenQing in shouDaoLieBiao" :key="shenQing.id" class="shenqing-xiangmu">
      <span class="yonghu-ming">{{ shenQing.ni_cheng || shenQing.yong_hu_ming }}</span>
      <div class="shenqing-anniu-zu">
        <button class="jieshou-anniu" @click="jieShou(shenQing.id)">{{ huoQuFanYi('haoYou', 'jieShou') }}</button>
        <button class="jujue-anniu" @click="juJue(shenQing.id)">{{ huoQuFanYi('haoYou', 'juJue') }}</button>
      </div>
    </div>
    <h2 class="quyu-biaoti">{{ huoQuFanYi('haoYou', 'haoYouLieBiao') }}</h2>
    <KongTai v-if="!haoYouLieBiao.length" :biao-ti="huoQuFanYi('haoYou', 'zanWuHaoYou')" />
    <div v-for="haoYou in haoYouLieBiao" :key="haoYou.id" class="haoyou-xiangmu">
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
import { ref, onMounted } from 'vue'
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
import { huoQuCuoWuXiangYing } from '@/api/请求'
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
const cuoWuXinXi = ref('')
const zhengZaiShenQing = ref<string | null>(null)
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
  cuoWuXinXi.value = ''
  try {
    await faSongHaoYouShenQing(yongHuId)
    cuoWuXinXi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    cuoWuXinXi.value = duQuCuoWu(cuoWu)
  } finally {
    zhengZaiShenQing.value = null
  }
}

function duQuCuoWu(cuoWu: unknown): string {
  if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
    return huoQuCuoWuXiangYing(cuoWu)?.data?.ti_shi || ''
  }
  return cuoWu instanceof Error ? cuoWu.message : ''
}

async function shuaXinLieBiao() {
  try {
    const [shouDao, haoYou] = await Promise.all([huoQuShouDaoShenQing(), huoQuHaoYouLieBiao()])
    shouDaoLieBiao.value = shouDao
    haoYouLieBiao.value = haoYou
  } catch (cuoWu: unknown) {
    cuoWuXinXi.value = duQuCuoWu(cuoWu)
  }
}

async function zhiXingSouSuo() {
  const wenBen = guanJianZi.value.trim()
  if (!wenBen) return
  souSuoZhong.value = true
  cuoWuXinXi.value = ''
  souSuoWuJieGuo.value = false
  try {
    souSuoJieGuo.value = await souSuoHaoYou(wenBen)
  } catch (cuoWu: unknown) {
    // 404 无结果走中性空态而非红色报错，用户不“出戏”
    if (huoQuCuoWuXiangYing(cuoWu)?.status === 404) {
      souSuoWuJieGuo.value = true
    } else {
      cuoWuXinXi.value = duQuCuoWu(cuoWu)
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
  cuoWuXinXi.value = ''
  try {
    await faSongHaoYouShenQing(yongHu.id)
    cuoWuXinXi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    cuoWuXinXi.value = duQuCuoWu(cuoWu)
  } finally {
    zhengZaiShenQing.value = null
  }
}

async function jieShou(shenQingId: string) {
  await jieShouHaoYouShenQing(shenQingId)
  await shuaXinLieBiao()
}

async function juJue(shenQingId: string) {
  await juJueHaoYouShenQing(shenQingId)
  await shuaXinLieBiao()
}

async function shanChu(haoYouId: string) {
  await shanChuHaoYou(haoYouId)
  await shuaXinLieBiao()
}

function jinRuLiaoTian(haoYouId: string) {
  // 先关资料卡再跳转：否则返回时历史栈与弹窗状态错位，需多点一次返回
  guanBiZiLiaoKa()
  router.push(`/hao-you/${haoYouId}`)
}

onMounted(shuaXinLieBiao)
</script>

<style scoped>
.haoyou-yemian {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.sousuo-hang {
  display: flex;
  gap: 8px;
}
.sousuo-kuang {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-zhuse);
}
.sousuo-anniu,
.tianjia-anniu,
.jieshou-anniu,
.liaotian-anniu {
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--zhuse);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
.sousuo-anniu:disabled,
.tianjia-anniu:disabled {
  opacity: 0.5;
}
.quyu-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 8px 0 0;
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
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
}
.yonghu-ming {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
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
  gap: 2px;
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
  font-weight: 700;
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
  gap: 6px;
}
.jujue-anniu,
.shanchu-anniu {
  padding: 8px 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  font-size: 13px;
}
</style>
