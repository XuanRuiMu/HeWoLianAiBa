FROM node:26-alpine AS build
WORKDIR /app
COPY QianDuan/package*.json ./
RUN npm ci
COPY QianDuan/ .
RUN npx vite build

FROM nginx:1.30-alpine AS brotli-build
RUN apk add --no-cache build-base pcre-dev zlib-dev openssl-dev linux-headers wget
COPY QianDuan/brotli-src /ngx_brotli
RUN set -eux; \
    cd /ngx_brotli/deps/brotli/c; \
    mkdir -p ../out; \
    cd common && gcc -O2 -fPIC -I../include -c *.c; \
    cd ../enc && gcc -O2 -fPIC -I../include -c *.c; \
    cd ..; \
    ar rcs ../out/libbrotlicommon.a common/*.o; \
    ar rcs ../out/libbrotlienc.a enc/*.o; \
    rm -f common/*.o enc/*.o
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

FROM nginx:1.30-alpine
COPY --from=brotli-build /etc/nginx/modules/ngx_http_brotli_filter_module.so /etc/nginx/modules/
COPY --from=brotli-build /etc/nginx/modules/ngx_http_brotli_static_module.so /etc/nginx/modules/
COPY --from=build /app/dist /usr/share/nginx/html
COPY BuShu/nginx.conf /etc/nginx/conf.d/default.conf
RUN { echo 'load_module modules/ngx_http_brotli_filter_module.so;'; \
      echo 'load_module modules/ngx_http_brotli_static_module.so;'; \
      sed -e 's|^pid .*|pid /tmp/nginx.pid;|' -e '/^user /d' /etc/nginx/nginx.conf; } > /tmp/nginx.conf && \
    mv /tmp/nginx.conf /etc/nginx/nginx.conf && \
    mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    nginx -t && \
    rm -f /tmp/nginx.pid
USER nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
