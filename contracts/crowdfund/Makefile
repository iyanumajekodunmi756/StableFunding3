default: build

all: test

test: build
	cargo test

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

# Full deployment workflow (see scripts/deploy.sh): build -> install -> deploy -> initialize -> bindings
# Usage: ADMIN_SK=S... make deploy
deploy:
	bash ../../scripts/deploy.sh

fmt:
	cargo fmt --all

clean:
	cargo clean
