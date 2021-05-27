FROM node:15

RUN apt-get update
RUN apt-get install -y memcached

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN yarn install --only=production

# Copy local code to the container image.
COPY . .
RUN chmod +x ./conf/startup.sh

RUN yarn build

# Run the web service on container startup.
CMD [ "./conf/startup.sh" ]
