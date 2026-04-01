.PHONY: up down restart logs ps clean help

up: 
	@if [ ! -f .env ]; then cp .env.example .env; fi
	docker compose -f docker-compose.dev.yml up --build -d

down:
	docker compose -f docker-compose.dev.yml down

restart: down up

logs:
	docker compose -f docker-compose.dev.yml logs -f

ps:
	docker compose -f docker-compose.dev.yml ps

clean:
	docker compose -f docker-compose.dev.yml down -v

help:
	@echo "UpcycleConnect Development Commands:"
	@echo "  make up      - Start dev services in background (builds if needed)"
	@echo "  make down    - Stop services"
	@echo "  make restart - Restart services"
	@echo "  make logs    - Show real-time dev logs"
	@echo "  make ps      - List running containers"
	@echo "  make clean   - Stop dev services AND remove volumes (resets DB)"
