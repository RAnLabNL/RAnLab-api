# Prerequisite Setup Steps:
#  gcloud artifacts repositories create ranlab-api-mvp --repository-format docker --location northamerica-northeast1 # create the artifact repo
#  gcloud auth configure-docker northamerica-northeast1-docker.pkg.dev
#  docker tag ranlab-mvp-api:latest northamerica-northeast1-docker.pkg.dev/ranlab-mvp-295423/ranlab-api-mvp/ranlab-api-mvp:latest
#  docker push northamerica-northeast1-docker.pkg.dev/ranlab-mvp-295423/ranlab-api-mvp/ranlab-api-mvp:latest
gcloud run --platform=managed  deploy ranlab-api-mvp --image northamerica-northeast1-docker.pkg.dev/ranlab-mvp-295423/ranlab-api-mvp/ranlab-api-mvp:latest
