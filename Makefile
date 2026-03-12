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

.PHONY: lint-container
lint-container:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint

.PHONY: lint-container-watch
lint-container-watch:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm --init -it -e SHELL=/bin/sh -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint sh -lc 'exec chokidar "src/**/*.js" -c "eslint --max-warnings=0 \"src/**/*.js\"" --initial --polling --poll-interval 300'

.PHONY: dbus
dbus:
	dbus-run-session gnome-shell --devkit --wayland

.PHONY: dev
dev: reinstall dbus

# Helper target for dev with locale
dev-with-locale: reinstall
	LANG=$(LOCALE).UTF-8 LC_ALL=$(LOCALE).UTF-8 dbus-run-session gnome-shell --devkit --wayland

.PHONY: dev-fr
dev-fr:
	$(MAKE) dev-with-locale LOCALE=fr_FR

.PHONY: dev-es
dev-es:
	$(MAKE) dev-with-locale LOCALE=es_ES

.PHONY: dev-ca
dev-ca:
	$(MAKE) dev-with-locale LOCALE=ca_ES

.PHONY: run-prefs
run-prefs:
	gnome-extensions prefs $(EXTENSION_ID)

.PHONY: prefs
prefs: reinstall run-prefs
