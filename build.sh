#!/bin/bash +x

# config
IMAGE='api-gateway'
REGISTRY='consortit-docker-cme-local.jfrog.io'
VERSION=$(date '+%Y%m%d%H%M%S')

# build version.yml
echo "---" > version.yaml
echo "build: '${BUILD_NUMBER}'" >> version.yaml
echo "version: '${VERSION}'" >> version.yaml
echo "commit: '${GIT_COMMIT}'" >> version.yaml
echo "name: '${IMAGE}'" >> version.yaml

# build docker image
docker build --pull -t "${REGISTRY}/${IMAGE}" .

# # push docker image to registry
docker tag "${REGISTRY}/${IMAGE}" "${REGISTRY}/${IMAGE}:latest"
docker tag "${REGISTRY}/${IMAGE}" "${REGISTRY}/${IMAGE}:${VERSION}"
docker push "${REGISTRY}/${IMAGE}:latest"
docker push "${REGISTRY}/${IMAGE}:${VERSION}"

RUNNING=$(docker inspect -f {{.State.Running}} "${IMAGE}" 2> /dev/null)

if [ $? -eq 0 ]; then
  docker stop "${IMAGE}"
  docker rm "${IMAGE}"
fi

docker run -d --name "${IMAGE}" \
           -p 80:81 \
           --add-host "eureka:10.100.199.200" \
           --add-host "config-server:10.100.199.200" \
           --add-host "rabbitmq:10.100.199.200" \
           --add-host "mongodb:10.100.199.200" \
           --add-host "api-gateway:10.100.199.200" \
           --add-host "vault:10.100.199.200" \
           -e IP=`/sbin/ip route | awk '/eth1/ { print  $9}'` \
           "${REGISTRY}"/"${IMAGE}":latest
