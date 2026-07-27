<template>
  <div class="guanli-jiankong-zhezhao" @click.self="guanBi">
    <div class="guanli-jiankong-mianban" role="dialog" aria-modal="true">
      <header class="jiankong-biaoti-lan">
        <div class="jiankong-biaoti">
          <span class="jiankong-dian" />
          {{ huoQuFanYi('guanLiJianKong', 'biaoTi') }}
        </div>
        <button class="jiankong-guanbi" type="button" @click="guanBi">
          {{ huoQuFanYi('guanLiJianKong', 'guanBi') }}
        </button>
      </header>

      <div class="jiankong-wangge">
        <section class="jiankong-fenqu jiankong-goujian">
          <h3 class="fenqu-biaoti">{{ huoQuFanYi('guanLiJianKong', 'gouJianSiLu') }}</h3>
          <div class="fenqu-neirong">
            <ul v-if="聊天仓库.gouJianGuoChengLieBiao.length" class="shijian-xian">
              <li
                v-for="(xiang, suoYin) in gouJianDaoXu"
                :key="'gj-' + xiang.时间 + '-' + suoYin"
                class="shijian-xian-xiang"
              >
                <span class="shijian-xian-dian" />
                <div class="shijian-xian-zhuti">
                  <div class="shijian-xian-jieduan">{{ xiang.阶段 }}</div>
                  <div class="shijian-xian-shuoming">{{ xiang.说明 }}</div>
                  <div class="shijian-xian-shijian">{{ geShiHuaShiJian(xiang.时间) }}</div>
                </div>
              </li>
            </ul>
            <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'kongZhuangTai') }}</div>
          </div>
        </section>

        <section class="jiankong-fenqu jiankong-haogandu">
          <h3 class="fenqu-biaoti">{{ huoQuFanYi('guanLiJianKong', 'haoGanDuBianHua') }}</h3>
          <div class="fenqu-neirong">
            <div v-if="leiJiLieBiao.length" class="leiji-qu">
              <span class="leiji-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'leiJi') }}</span>
              <span
                v-for="ji in leiJiLieBiao"
                :key="'lj-' + ji.jueSeId"
                class="leiji-xiang"
                :class="ji.zhi >= 0 ? 'zheng-xiang' : 'fu-xiang'"
              >
                {{ ji.jueSeId }}：{{ ji.zhi >= 0 ? '+' : '' }}{{ ji.zhi }}
              </span>
            </div>
            <ul v-if="聊天仓库.haoGanDuBianHuaLieBiao.length" class="haogandu-liebiao">
              <li
                v-for="(xiang, suoYin) in haoGanDuDaoXu"
                :key="'hg-' + xiang.时间 + '-' + suoYin"
                class="haogandu-xiang"
              >
                <div class="haogandu-bianhua">
                  <span
                    v-for="([jueSeId, zhi], k) in bianHuaShuZu(xiang.变化)"
                    :key="'bh-' + k"
                    class="haogandu-shuzhi"
                    :class="zhi >= 0 ? 'zheng-xiang' : 'fu-xiang'"
                  >
                    {{ jueSeId }} {{ zhi >= 0 ? '+' : '' }}{{ zhi }}
                  </span>
                </div>
                <div class="haogandu-shijian">{{ geShiHuaShiJian(xiang.时间) }}</div>
              </li>
            </ul>
            <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'kongZhuangTai') }}</div>
          </div>
        </section>

        <section class="jiankong-fenqu jiankong-yincang">
          <h3 class="fenqu-biaoti">{{ huoQuFanYi('guanLiJianKong', 'yinCangXinXi') }}</h3>
          <div class="fenqu-neirong">
            <ul v-if="聊天仓库.yinCangXinXiLieBiao.length" class="yincang-liebiao">
              <li
                v-for="(xiang, suoYin) in yinCangDaoXu"
                :key="'yc-' + xiang.时间 + '-' + suoYin"
                class="yincang-xiang"
              >
                <span class="yincang-biaoqian">{{ xiang.类型 }}</span>
                <span class="yincang-neirong">{{ xiang.内容 }}</span>
                <span class="yincang-shijian">{{ geShiHuaShiJian(xiang.时间) }}</span>
              </li>
            </ul>
            <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'kongZhuangTai') }}</div>
          </div>
        </section>

        <section class="jiankong-fenqu jiankong-rizhi">
          <h3 class="fenqu-biaoti">{{ huoQuFanYi('guanLiJianKong', 'shiJianRiZhi') }}</h3>
          <div class="fenqu-neirong">
            <ul v-if="shiJianRiZhi.length" class="rizhi-liebiao">
              <li
                v-for="(xiang, suoYin) in shiJianRiZhi"
                :key="'rz-' + xiang.时间 + '-' + suoYin"
                class="rizhi-xiang"
              >
                <span class="rizhi-biaoqian" :class="'rizhi-' + xiang.leiXing">{{
                  xiang.biaoQian
                }}</span>
                <span class="rizhi-zhuyao">{{ xiang.zhuanYao }}</span>
                <span class="rizhi-shijian">{{ geShiHuaShiJian(xiang.时间) }}</span>
              </li>
            </ul>
            <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'kongZhuangTai') }}</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { huoQuFanYi } from '@/config/translations'

const emit = defineEmits<{ close: [] }>()

const 聊天仓库 = 使用聊天仓库()

function guanBi() {
  emit('close')
}

function geShiHuaShiJian(shiJian: number): string {
  const ri = new Date(shiJian)
  const bu = (n: number) => String(n).padStart(2, '0')
  return `${bu(ri.getHours())}:${bu(ri.getMinutes())}:${bu(ri.getSeconds())}`
}

const gouJianDaoXu = computed(() => [...聊天仓库.gouJianGuoChengLieBiao].reverse())
const haoGanDuDaoXu = computed(() => [...聊天仓库.haoGanDuBianHuaLieBiao].reverse())
const yinCangDaoXu = computed(() => [...聊天仓库.yinCangXinXiLieBiao].reverse())

function bianHuaShuZu(变化: Record<string, number>): [string, number][] {
  return Object.entries(变化)
}

const leiJiLieBiao = computed(() => {
  const leiJi: Record<string, number> = {}
  for (const xiang of 聊天仓库.haoGanDuBianHuaLieBiao) {
    for (const [jueSeId, zhi] of Object.entries(xiang.变化)) {
      leiJi[jueSeId] = (leiJi[jueSeId] ?? 0) + zhi
    }
  }
  return Object.entries(leiJi).map(([jueSeId, zhi]) => ({ jueSeId, zhi }))
})

const shiJianRiZhi = computed(() => {
  const lieBiao: { 时间: number; leiXing: string; biaoQian: string; zhuanYao: string }[] = []
  for (const xiang of 聊天仓库.gouJianGuoChengLieBiao) {
    lieBiao.push({
      时间: xiang.时间,
      leiXing: 'gouJian',
      biaoQian: huoQuFanYi('guanLiJianKong', 'biaoQianGouJian'),
      zhuanYao: `${xiang.阶段}：${xiang.说明}`,
    })
  }
  for (const xiang of 聊天仓库.haoGanDuBianHuaLieBiao) {
    const bianHua = Object.entries(xiang.变化)
      .map(([jueSeId, zhi]) => `${jueSeId} ${zhi >= 0 ? '+' : ''}${zhi}`)
      .join('，')
    lieBiao.push({
      时间: xiang.时间,
      leiXing: 'haoGanDu',
      biaoQian: huoQuFanYi('guanLiJianKong', 'biaoQianHaoGanDu'),
      zhuanYao: bianHua,
    })
  }
  for (const xiang of 聊天仓库.yinCangXinXiLieBiao) {
    lieBiao.push({
      时间: xiang.时间,
      leiXing: 'yinCang',
      biaoQian: huoQuFanYi('guanLiJianKong', 'biaoQianYinCang'),
      zhuanYao: `${xiang.类型}：${xiang.内容}`,
    })
  }
  return lieBiao.sort((a, b) => b.时间 - a.时间)
})
</script>

<style scoped>
.guanli-jiankong-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 8, 16, 0.78);
  backdrop-filter: blur(6px);
  padding: 24px;
}

.guanli-jiankong-mianban {
  width: 90%;
  max-width: 1100px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #0c1322 0%, #0a0f1c 100%);
  border: 1px solid rgba(99, 179, 237, 0.25);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(99, 179, 237, 0.08),
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(99, 179, 237, 0.15);
  overflow: hidden;
}

.jiankong-biaoti-lan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(99, 179, 237, 0.18);
  background: rgba(99, 179, 237, 0.06);
}

.jiankong-biaoti {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #d6e6ff;
}

.jiankong-dian {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px #4ade80;
  animation: jiankong-mao 1.4s ease-in-out infinite;
}

@keyframes jiankong-mao {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.jiankong-guanbi {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7e6;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.jiankong-guanbi:hover {
  background: rgba(255, 107, 107, 0.18);
  border-color: rgba(255, 107, 107, 0.4);
}

.jiankong-wangge {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: rgba(99, 179, 237, 0.18);
  min-height: 0;
}

.jiankong-fenqu {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0a0f1c;
}

.fenqu-biaoti {
  margin: 0;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #8fb6e8;
  border-bottom: 1px solid rgba(99, 179, 237, 0.14);
  background: rgba(99, 179, 237, 0.05);
}

.fenqu-neirong {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  min-height: 0;
}

.fenqu-neirong::-webkit-scrollbar {
  width: 6px;
}

.fenqu-neirong::-webkit-scrollbar-thumb {
  background: rgba(99, 179, 237, 0.3);
  border-radius: 3px;
}

.fenqu-kong {
  color: #5b6b82;
  font-size: 13px;
  text-align: center;
  padding-top: 32px;
}

.shijian-xian {
  list-style: none;
  margin: 0;
  padding: 0 0 0 12px;
  border-left: 1px solid rgba(99, 179, 237, 0.2);
}

.shijian-xian-xiang {
  position: relative;
  padding: 0 0 14px 16px;
}

.shijian-xian-dian {
  position: absolute;
  left: -18px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #63b3ed;
  box-shadow: 0 0 8px rgba(99, 179, 237, 0.8);
}

.shijian-xian-jieduan {
  color: #e3eeff;
  font-size: 13px;
  font-weight: 600;
}

.shijian-xian-shuoming {
  color: #9fb0c6;
  font-size: 12px;
  margin-top: 2px;
  line-height: 1.5;
}

.shijian-xian-shijian {
  color: #5b6b82;
  font-size: 11px;
  margin-top: 4px;
}

.leiji-qu {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(99, 179, 237, 0.15);
}

.leiji-biaoqian {
  font-size: 11px;
  color: #8fb6e8;
}

.leiji-xiang {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.haogandu-liebiao,
.yincang-liebiao,
.rizhi-liebiao {
  list-style: none;
  margin: 0;
  padding: 0;
}

.haogandu-xiang {
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(99, 179, 237, 0.12);
}

.haogandu-bianhua {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.haogandu-shuzhi {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.zheng-xiang {
  color: #ff9a6c;
  background: rgba(255, 138, 76, 0.12);
}

.fu-xiang {
  color: #6ab0f0;
  background: rgba(106, 176, 240, 0.12);
}

.haogandu-shijian,
.yincang-shijian,
.rizhi-shijian {
  color: #5b6b82;
  font-size: 11px;
  margin-top: 6px;
}

.yincang-xiang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 138, 76, 0.18);
}

.yincang-biaoqian {
  font-size: 11px;
  font-weight: 600;
  color: #ffb38a;
  background: rgba(255, 138, 76, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

.yincang-neirong {
  color: #cdd7e6;
  font-size: 13px;
  flex: 1;
}

.rizhi-xiang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  margin-bottom: 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid rgba(99, 179, 237, 0.5);
}

.rizhi-biaoqian {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  color: #d6e6ff;
  background: rgba(99, 179, 237, 0.18);
}

.rizhi-gouJian {
  background: rgba(99, 179, 237, 0.2);
  color: #bcdcff;
}

.rizhi-haoGanDu {
  background: rgba(255, 138, 76, 0.2);
  color: #ffc7a3;
}

.rizhi-yinCang {
  background: rgba(167, 139, 250, 0.2);
  color: #d6c6ff;
}

.rizhi-zhuyao {
  color: #cdd7e6;
  font-size: 13px;
  flex: 1;
  min-width: 160px;
}
</style>
