.PHONY: help setup up up-d down restart logs logs-backend logs-frontend \
        test test-e2e ps clean psql

help: ## Show this list
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## One-time setup — copy env file templates (edit them if needed)
	test -f backend/.env || cp backend/.env.example backend/.env
	@echo "Env files ready. Run 'make up' next."

up: ## Start postgres + backend + frontend (build if needed, foreground)
	docker compose up --build

up-d: ## Same as 'up', but detached
	docker compose up --build -d

down: ## Stop everything (keeps the Postgres volume)
	docker compose down

restart: down up-d ## Stop then start again, detached

logs: ## Tail logs from every service
	docker compose logs -f

logs-backend: ## Tail backend logs only
	docker compose logs -f backend

logs-frontend: ## Tail frontend logs only
	docker compose logs -f frontend

ps: ## Show running services
	docker compose ps

test: ## Run backend unit tests inside the running backend container
	docker compose exec backend npm run test

test-e2e: ## Run backend e2e tests (needs: make db-test once, see backend/README.md)
	docker compose exec backend npm run test:e2e

psql: ## Open a psql shell into the dev database
	docker exec -it hypertube_postgres psql -U hypertube -d hypertube_db

clean: ## Stop everything AND wipe the Postgres volume (destructive)
	docker compose down -v