EXTENSION_ID = revolutionary@jbellue.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_ID)
GETTEXT_DOMAIN = revolutionary-clock
PO_FILES = $(wildcard po/*.po)
LOCALES = $(basename $(notdir $(PO_FILES)))
CONTAINER_RUNTIME ?= $(shell \
	if command -v podman >/dev/null 2>&1; then \
		echo podman; \
	elif command -v docker >/dev/null 2>&1; then \
		echo docker; \
	else \
		echo docker; \
	fi)
CONTAINER_MOUNT_SUFFIX ?=

ifeq ($(CONTAINER_RUNTIME),podman)
CONTAINER_MOUNT_SUFFIX := :Z
endif

.PHONY: install
install: mo
	mkdir -p $(INSTALL_DIR)
	cp src/*.js src/*.json src/*.css $(INSTALL_DIR)/
	cp -r src/locale $(INSTALL_DIR)/
	cp -r src/ui $(INSTALL_DIR)/
	mkdir -p $(INSTALL_DIR)/schemas
	cp schemas/*.xml $(INSTALL_DIR)/schemas/
	glib-compile-schemas $(INSTALL_DIR)/schemas/

.PHONY: uninstall
uninstall:
	rm -rf $(INSTALL_DIR)

.PHONY: reinstall
reinstall: uninstall install

.PHONY: pot
pot:
	xgettext \
		--language=JavaScript \
		--keyword=_ \
		--keyword=ngettext:1,2 \
		--from-code=UTF-8 \
		--package-name=$(GETTEXT_DOMAIN) \
		--output=po/$(GETTEXT_DOMAIN).pot \
		src/prefs.js
	xgettext \
		--language=Glade \
		--join-existing \
		--from-code=UTF-8 \
		--package-name=$(GETTEXT_DOMAIN) \
		--output=po/$(GETTEXT_DOMAIN).pot \
		src/ui/prefs.ui

.PHONY: po
po: pot
	for lang in $(LOCALES); do \
		msgmerge --update --backup=none po/$$lang.po po/$(GETTEXT_DOMAIN).pot; \
	done

.PHONY: mo
mo:
	for lang in $(LOCALES); do \
		mkdir -p src/locale/$$lang/LC_MESSAGES; \
		msgfmt --output-file=src/locale/$$lang/LC_MESSAGES/$(GETTEXT_DOMAIN).mo po/$$lang.po; \
	done

.PHONY: package
package: mo
	mkdir -p dist
	mkdir -p src/schemas
	cp schemas/*.xml src/schemas/
	cd src && zip -r ../dist/$(EXTENSION_ID).shell-extension.zip \
		metadata.json *.js *.css \
		locale/ ui/ schemas/
	rm -rf src/schemas

.PHONY: test
test:
	npm test

.PHONY: lint
lint:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint

.PHONY: lint-watch
lint-watch:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm --init -it -e SHELL=/bin/sh -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint sh -lc 'exec chokidar "src/**/*.js" -c "eslint --max-warnings=0 \"src/**/*.js\"" --initial --polling --poll-interval 300'

# Single locale helper
define run_dev_locale
	$(MAKE) reinstall && \
	LANG=$(1).UTF-8 LC_ALL=$(1).UTF-8 \
	dbus-run-session gnome-shell --devkit --wayland
endef

.PHONY: dev dev-fr dev-es dev-ca dev-en
dev-fr: ; $(call run_dev_locale,fr_FR)
dev-es: ; $(call run_dev_locale,es_ES)  
dev-ca: ; $(call run_dev_locale,ca_ES)
dev-en: ; $(call run_dev_locale,en_GB)
dev: ; $(call run_dev_locale,en_GB)

.PHONY: run-prefs
run-prefs:
	gnome-extensions prefs $(EXTENSION_ID)

.PHONY: prefs
prefs: reinstall run-prefs
