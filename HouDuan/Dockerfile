FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY QianYi ./QianYi
COPY scripts ./scripts
COPY src ./src
RUN npm run build

FROM node:26-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache verify
COPY --from=build /app/dist ./dist
COPY --from=build /app/QianYi ./QianYi
COPY scripts/run_migration.js ./scripts/run_migration.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
RUN mkdir -p /app/logs /app/uploads/media && chown -R appuser:appgroup /app/logs /app/QianYi /app/uploads
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/api/健康').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/server.js"]
