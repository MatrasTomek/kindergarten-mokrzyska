FROM php:8.4-cli
# Ta sama wersja co na OVH. Jeśli pecl nie skompiluje 1.15.3 pod PHP 8.4, użyj najbliższej 1.x,
# która się kompiluje (np. 1.20.1) — biblioteka i tak jest przypięta do 1.15 przez composer.json.
ARG MONGODB_EXT_VERSION=1.15.3
RUN apt-get update \
 && apt-get install -y git unzip libzip-dev libwebp-dev libjpeg-dev libpng-dev libssl-dev pkg-config \
 && pecl install mongodb-${MONGODB_EXT_VERSION} \
 && docker-php-ext-enable mongodb \
 && docker-php-ext-configure gd --with-webp --with-jpeg \
 && docker-php-ext-install zip gd
# Limity uploadu: PDF do 10 MB (większe -> 413 z aplikacji, nie z PHP)
RUN printf 'upload_max_filesize=12M\npost_max_size=13M\n' > /usr/local/etc/php/conf.d/uploads.ini
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app/backend
