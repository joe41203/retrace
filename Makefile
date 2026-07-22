# retrace — よく使う操作の入口。`make` でヘルプ表示
.DEFAULT_GOAL := help
.PHONY: help dev preview build install test fixture extract validate

REPO ?=

help: ## このヘルプを表示
	@echo "retrace コマンド一覧:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "例: make dev / make extract REPO=nakabonne/ali"

dev: ## ビューアを起動(初回は自動で npm install)
	@[ -d viewer/node_modules ] || (cd viewer && npm install)
	cd viewer && npm run dev

preview: ## ビルド済みビューアをプレビュー起動
	@[ -d viewer/node_modules ] || (cd viewer && npm install)
	cd viewer && npm run preview

build: ## ビューアをビルド(tsc + vite build)
	@[ -d viewer/node_modules ] || (cd viewer && npm install)
	cd viewer && npm run build

install: ## ビューアの依存をインストール
	cd viewer && npm install

test: ## generator のユニットテスト
	node --test generator/lib.test.mjs

fixture: ## 開発用 fixture データセットを生成
	node viewer/scripts/make-fixture.mjs

extract: ## OSS を機械抽出(make extract REPO=<owner>/<repo>)
	@test -n "$(REPO)" || { echo "使い方: make extract REPO=<owner>/<repo>"; exit 1; }
	node generator/extract.mjs --repo $(REPO)

validate: ## 抽出データを検証(make validate REPO=<owner>/<repo>)
	@test -n "$(REPO)" || { echo "使い方: make validate REPO=<owner>/<repo>"; exit 1; }
	node generator/validate.mjs --repo $(REPO)
