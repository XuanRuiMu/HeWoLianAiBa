# node基座跟随官方最新构建：26.x LTS 浮动 tag，不 pin digest
FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
# YH-123 迁移进镜像：镜像含迁移目录+scripts，entrypoint先迁移再启动加锁
COPY QianYi ./QianYi
# build 命令串了 `node scripts/复制静态资源.js`（把 src 下非 TS 资源补进 dist），
# 该脚本不在镜像里则构建期直接 MODULE_NOT_FOUND，故 build 阶段必须一并 COPY
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# node基座跟随官方最新构建：26.x LTS 浮动 tag，不 pin digest
FROM node:26-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache verify
COPY --from=build /app/dist ./dist
# YH-123 迁移进镜像：生产镜像含迁移文件与零依赖迁移脚本（纯 JS，仅依赖 pg，随生产依赖安装）
COPY --from=build /app/QianYi ./QianYi
COPY scripts/run_migration.js ./scripts/run_migration.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
# 运行时以 appuser 身份写入的目录必须在切用户之前建好并授权。漏掉 /app/uploads 的实测后果：
# media_uploads 命名卷按镜像内目录属主初始化成 root:root，容器内所有媒体上传（表情/图片/文件/
# 语音/好友媒体）一律 500「媒体上传失败，请重试」，而 mock 掉存储层的用例照样全绿。
RUN mkdir -p /app/logs /app/uploads/media && chown -R appuser:appgroup /app/logs /app/QianYi /app/uploads
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/api/健康').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/server.js"]
