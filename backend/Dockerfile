# YH-136 镜像浮动收敛：node基座固定20-alpine大版本，业务镜像digest由构建时锁定
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
# YH-123 迁移进镜像：镜像含database+scripts，entrypoint先迁移再启动加锁
COPY database ./database
COPY src ./src
RUN npm run build

# YH-136 镜像浮动收敛：node基座固定20-alpine大版本，业务镜像digest由构建时锁定
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /app/dist ./dist
# YH-123 迁移进镜像：生产镜像含迁移文件与零依赖迁移脚本（纯 JS，仅依赖 pg，随生产依赖安装）
COPY --from=build /app/database ./database
COPY scripts/run_migration.js ./scripts/run_migration.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs /app/database
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/api/健康').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/server.js"]
