#!/bin/sh
# Cloudflare edge nginx. WEB_HOST məcburidir. Origin cert varsa Full (strict).
set -eu

if [ -z "${WEB_HOST:-}" ]; then
  echo "WEB_HOST təyin olunmayıb (məs. example.com)" >&2
  exit 1
fi

write_proxy_locations() {
  # $1 = upstream (web:3020 | admin:3021)
  cat <<EOF
  client_max_body_size 25m;
  include /etc/nginx/cloudflare-realip.conf;

  location /healthz {
    access_log off;
    return 200 'ok';
    add_header Content-Type text/plain;
  }

  location /socket.io/ {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$forwarded_proto;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_read_timeout 120s;
    proxy_buffering off;
    proxy_pass http://api-proxy:4000;
  }

  location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$forwarded_proto;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_read_timeout 120s;
    client_max_body_size 25m;
    proxy_pass http://api-proxy:4000;
  }

  location /uploads/ {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$forwarded_proto;
    proxy_pass http://api-proxy:4000;
  }

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$forwarded_proto;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_pass http://$1;
  }
EOF
}

if [ -f /etc/nginx/certs/origin.pem ] && [ -f /etc/nginx/certs/origin.key ]; then
  TEMPLATE=/templates/edge-ssl.conf.template
  MODE=ssl
else
  TEMPLATE=/templates/edge-http.conf.template
  MODE=http
fi

sed "s/__WEB_HOST__/${WEB_HOST}/g" "$TEMPLATE" > /etc/nginx/conf.d/default.conf

if [ -n "${WWW_HOST:-}" ]; then
  if [ "$MODE" = "ssl" ]; then
    cat > /etc/nginx/conf.d/www-redirect.conf <<EOF
server {
  listen 80;
  server_name ${WWW_HOST};
  location /healthz {
    access_log off;
    return 200 'ok';
    add_header Content-Type text/plain;
  }
  location / {
    return 301 https://${WEB_HOST}\$request_uri;
  }
}
server {
  listen 443 ssl;
  http2 on;
  server_name ${WWW_HOST};
  location / {
    return 301 https://${WEB_HOST}\$request_uri;
  }
}
EOF
  else
    cat > /etc/nginx/conf.d/www-redirect.conf <<EOF
server {
  listen 80;
  server_name ${WWW_HOST};
  location /healthz {
    access_log off;
    return 200 'ok';
    add_header Content-Type text/plain;
  }
  location / {
    return 301 http://${WEB_HOST}\$request_uri;
  }
}
EOF
  fi
else
  rm -f /etc/nginx/conf.d/www-redirect.conf
fi

if [ -n "${ADMIN_HOST:-}" ]; then
  if [ "$MODE" = "ssl" ]; then
    {
      cat <<EOF
server {
  listen 80;
  server_name ${ADMIN_HOST};
  location /healthz {
    access_log off;
    return 200 'ok';
    add_header Content-Type text/plain;
  }
  location / {
    return 301 https://\$host\$request_uri;
  }
}
server {
  listen 443 ssl;
  http2 on;
  server_name ${ADMIN_HOST};
EOF
      write_proxy_locations "admin:3021"
      echo "}"
    } > /etc/nginx/conf.d/admin.conf
  else
    {
      cat <<EOF
server {
  listen 80;
  server_name ${ADMIN_HOST};
EOF
      write_proxy_locations "admin:3021"
      echo "}"
    } > /etc/nginx/conf.d/admin.conf
  fi
else
  rm -f /etc/nginx/conf.d/admin.conf
fi

echo "xidmetal-edge: mode=${MODE} web=${WEB_HOST} admin=${ADMIN_HOST:-} www=${WWW_HOST:-}"
nginx -t
exec nginx -g 'daemon off;'
