# Dockerfile pour le frontend Next.js
# On fait un build en plusieurs etapes pour bien separer dev et prod :
# - une etape "base" qui installe les dependances (partagee entre dev et prod)
# - une etape "development" pour tourner en local avec le hot-reload
# - une etape "builder" qui compile le projet Next.js
# - une etape "production" avec juste le necessaire pour faire tourner l'appli

# Etape de base : on installe les dependances npm
# On prend node:20-alpine qui est une image Node.js legere
FROM node:20-alpine AS base
WORKDIR /app
# On copie d'abord seulement package.json et package-lock.json
# Comme ca si on ne touche pas aux dependances, Docker reutilise le cache
# et ne refait pas npm install a chaque build
COPY package.json package-lock.json* ./
RUN npm install

# Etape developpement : pour tourner en local
# On copie tout le code et on lance le serveur de dev Next.js
# En pratique, le code local est monte via un volume Docker donc le hot-reload fonctionne
FROM base AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Etape builder : on compile le projet pour la prod
# npm run build genere le dossier .next avec tous les assets optimises
# On utilise le mode "standalone" de Next.js pour avoir un runtime tres leger
FROM base AS builder
ARG NEXT_PUBLIC_API_URL=/api
ARG API_INTERNAL_URL=http://api:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# Etape production : l'image finale qui va tourner en prod
# On repart d'une image Node propre et on copie juste ce dont on a besoin
# Pas de sources, pas de node_modules complets, juste le build et les fichiers statiques
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# On copie le serveur standalone genere par Next.js (ca inclut server.js et les deps runtime)
COPY --from=builder /app/.next/standalone ./
# Les fichiers statiques (JS, CSS) doivent etre dans .next/static
COPY --from=builder /app/.next/static ./.next/static
# Les fichiers publics (images, icones...)
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
