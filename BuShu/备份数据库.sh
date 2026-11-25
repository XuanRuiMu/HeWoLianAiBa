#!/usr/bin/env bash

set -euo pipefail

JIAO_BEN_MU_LU="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XIANG_MU_GEN="$(cd "$JIAO_BEN_MU_LU/.." && pwd)"
ENV_WEN_JIAN="$XIANG_MU_GEN/.env"

if [ -f "$ENV_WEN_JIAN" ]; then
  while IFS='=' read -r jian zhi || [ -n "$jian" ]; do
    case "$jian" in ''|\#*) continue ;; esac
    zhi="${zhi%\"}"; zhi="${zhi#\"}"; zhi="${zhi%\'}"; zhi="${zhi#\'}"
    if [ -z "${!jian+x}" ]; then export "$jian=$zhi"; fi
  done < "$ENV_WEN_JIAN"
fi

RONG_QI="${DOCKER_POSTGRES:-lianaiba-postgres}"
: "${POSTGRES_USER:?缺少 POSTGRES_USER（环境变量或 .env）}"
: "${POSTGRES_PASSWORD:?缺少 POSTGRES_PASSWORD（环境变量或 .env）}"
: "${POSTGRES_DB:?缺少 POSTGRES_DB（环境变量或 .env）}"
BAO_LIU_FEN_SHU="${BEI_FEN_BAO_LIU_FEN_SHU:-7}"

BEI_FEN_MU_LU="$XIANG_MU_GEN/备份/postgresql"
mkdir -p "$BEI_FEN_MU_LU"

if ! docker ps --format '{{.Names}}' | grep -Fxq "$RONG_QI"; then
  echo "错误：容器 $RONG_QI 未运行" >&2
  exit 1
fi

SHI_JIAN_CUO="$(date +%Y%m%d_%H%M%S)"
MU_BIAO="$BEI_FEN_MU_LU/${POSTGRES_DB}_${SHI_JIAN_CUO}.dump"
LIN_SHI="$MU_BIAO.partial"

rm -f -- "$LIN_SHI"
docker exec \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  "$RONG_QI" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$LIN_SHI"
mv -f -- "$LIN_SHI" "$MU_BIAO"

if [ ! -s "$MU_BIAO" ]; then
  echo "错误：备份产物为空，已删除 $MU_BIAO" >&2
  rm -f "$MU_BIAO"
  exit 1
fi

shopt -s nullglob
WEN_JIAN=("$BEI_FEN_MU_LU/${POSTGRES_DB}_"*.dump)
shopt -u nullglob
IFS=$'\n' WEN_JIAN=($(printf '%s\n' "${WEN_JIAN[@]}" | sort)); unset IFS
ZONG_SHU=${#WEN_JIAN[@]}
if (( ZONG_SHU > BAO_LIU_FEN_SHU )); then
  SHAN_CHU=$((ZONG_SHU - BAO_LIU_FEN_SHU))
  for ((i = 0; i < SHAN_CHU; i++)); do
    rm -f -- "${WEN_JIAN[$i]}"
    echo "已清理过期备份：$(basename "${WEN_JIAN[$i]}")"
  done
fi

echo "备份完成：$MU_BIAO ($(wc -c < "$MU_BIAO") 字节)，当前保留 $((ZONG_SHU > BAO_LIU_FEN_SHU ? BAO_LIU_FEN_SHU : ZONG_SHU)) 份"
