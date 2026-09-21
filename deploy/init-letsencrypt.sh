#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "用法: ./init-letsencrypt.sh <域名> [邮箱]"
    echo "示例: ./init-letsencrypt.sh example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-""}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo "Let's Encrypt SSL 证书初始化"
echo "域名: $DOMAIN"
echo "邮箱: ${EMAIL:-未提供（将使用 --register-unsafely-without-email）}"
echo "========================================"

NGINX_CONF="$SCRIPT_DIR/nginx.conf"
if [ ! -f "$NGINX_CONF" ]; then
    echo "错误: 找不到 nginx.conf ($NGINX_CONF)"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "错误: 未安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "错误: 未安装 Docker Compose V2"
    exit 1
fi

TEMP_CONF="$SCRIPT_DIR/nginx-cert-only.conf"
cat > "$TEMP_CONF" << 'NGINX_EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Let\'s Encrypt 验证中...';
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

sed -i.bak "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$TEMP_CONF"

echo "[1/5] 创建 Docker 网络..."
docker network create lovewithme-network 2>/dev/null || true

echo "[2/5] 启动临时 Nginx 容器进行证书验证..."
docker run -d \
    --name lovewithme-cert-temp \
    -v "$TEMP_CONF:/etc/nginx/conf.d/default.conf:ro" \
    -v certbot-www:/var/www/certbot \
    -v certbot-conf:/etc/letsencrypt \
    --network lovewithme-network \
    -p 80:80 \
    nginx:alpine

sleep 3

echo "[3/5] 申请 SSL 证书..."
CERTBOT_ARGS="certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN --agree-tos --non-interactive"
if [ -n "$EMAIL" ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --email $EMAIL"
else
    CERTBOT_ARGS="$CERTBOT_ARGS --register-unsafely-without-email"
fi

docker run --rm \
    -v certbot-www:/var/www/certbot \
    -v certbot-conf:/etc/letsencrypt \
    --network lovewithme-network \
    certbot/certbot $CERTBOT_ARGS

echo "[4/5] 清理临时容器..."
docker stop lovewithme-cert-temp 2>/dev/null || true
docker rm lovewithme-cert-temp 2>/dev/null || true
rm -f "$TEMP_CONF" "$TEMP_CONF.bak"

echo "[5/5] 更新 nginx.conf 中的域名..."
sed -i.bak "s/your-domain.com/$DOMAIN/g" "$NGINX_CONF"
rm -f "$NGINX_CONF.bak"

echo ""
echo "========================================"
echo "SSL 证书申请成功！"
echo "域名: $DOMAIN"
echo "证书路径: /etc/letsencrypt/live/$DOMAIN/"
echo "========================================"
echo ""
echo "后续步骤:"
echo "  1. 复制 .env.example 为 .env 并填写配置"
echo "  2. 运行 docker compose up -d 启动所有服务"
echo "  3. 证书将自动续期（certbot 容器每12小时检查）"
echo ""
echo "手动续期测试: docker compose run --rm certbot renew --dry-run"
