.PHONY: dev worker test lint check db\:migrate db\:seed db\:reset install

install:
	npm install

dev:
	npm run dev

worker:
	npm run worker

test:
	npm run test

lint:
	npm run lint && npm run typecheck

check: lint test

db\:migrate:
	npm run db:migrate

db\:seed:
	npm run db:seed

db\:reset:
	npm run db:reset
