# Dockerfile pour l'API backend en Go
# On utilise un build en 2 étapes pour que l'image finale soit légère :
# - d'abord on compile le code dans une image Go complète
# - ensuite on copie juste le binaire dans une toute petite image Alpine
# Comme ça l'image de prod ne contient pas tout l'environnement Go (qui fait ~800 Mo)

# Première étape : on compile le code Go
# On prend l'image Go Alpine qui est plus légère que l'image Go classique
FROM golang:1.22-alpine AS builder

# On se place dans un dossier /build pour travailler
WORKDIR /build

# Force l'usage du proxy Go pour eviter les fetch VCS directs pendant le build.
ENV GOPROXY=https://proxy.golang.org,direct

# On copie d'abord juste les fichiers de dépendances (go.mod et go.sum)
# L'idée c'est que Docker met en cache les dépendances, donc si on ne touche pas
# à go.mod, il ne va pas tout retélécharger à chaque build
COPY go.mod go.sum ./
RUN go mod download

# Maintenant on copie tout le reste du code source
COPY . .

# On compile le binaire Go
# CGO_ENABLED=0 permet de faire un binaire autonome, sans dépendance à des libs C
# GOOS=linux précise qu'on compile pour Linux (le conteneur tourne sur Linux)
# -o server c'est juste le nom qu'on donne au fichier compilé
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Deuxième étape : l'image finale qui va tourner en prod
# On repart d'une image Alpine vide (~5 Mo), on n'a plus besoin de Go
FROM alpine:3.20

# On a besoin des certificats SSL pour que l'API puisse faire des appels HTTPS
RUN apk --no-cache add ca-certificates

# Dossier de travail de l'appli
WORKDIR /app

# On copie uniquement le binaire compilé depuis l'étape précédente
# Le code source et les outils Go restent dans l'étape builder, ils ne sont pas inclus ici
COPY --from=builder /build/server .

# L'API écoute sur le port 8080
EXPOSE 8080

# Commande pour démarrer le serveur
CMD ["./server"]
