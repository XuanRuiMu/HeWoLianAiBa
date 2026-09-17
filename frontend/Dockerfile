# YH-136/YH-138 前端构建上下文收窄+单源nginx：烤入与覆盖漂移收敛为构建产物+挂载单源
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npx vite build

FROM nginx:1.27-alpine AS brotli-build
RUN apk add --no-cache \
    git \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    linux-headers \
    wget
RUN git clone --recursive https://github.com/google/ngx_brotli /ngx_brotli
RUN cd /ngx_brotli && git submodule update --init
RUN NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2 | tr -d ' \r\n') && \
    test -n "${NGINX_VERSION}" && \
    wget -q "http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" && \
    tar -xzf "nginx-${NGINX_VERSION}.tar.gz" && \
    cd "nginx-${NGINX_VERSION}" && \
    ./configure --with-compat --add-dynamic-module=/ngx_brotli && \
    make modules && \
    mkdir -p /etc/nginx/modules && \
    cp objs/ngx_http_brotli_filter_module.so /etc/nginx/modules/ && \
    cp objs/ngx_http_brotli_static_module.so /etc/nginx/modules/

FROM nginx:1.27-alpine
COPY --from=brotli-build /etc/nginx/modules/ngx_http_brotli_filter_module.so /etc/nginx/modules/
COPY --from=brotli-build /etc/nginx/modules/ngx_http_brotli_static_module.so /etc/nginx/modules/
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
RUN echo 'load_module modules/ngx_http_brotli_filter_module.so;' > /etc/nginx/conf.d/brotli.conf && \
    echo 'load_module modules/ngx_http_brotli_static_module.so;' >> /etc/nginx/conf.d/brotli.conf && \
    echo 'brotli on;' >> /etc/nginx/conf.d/brotli.conf && \
    echo 'brotli_vary on;' >> /etc/nginx/conf.d/brotli.conf && \
    echo 'brotli_comp_level 6;' >> /etc/nginx/conf.d/brotli.conf && \
    echo 'brotli_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;' >> /etc/nginx/conf.d/brotli.conf && \
    nginx -t
USER nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]