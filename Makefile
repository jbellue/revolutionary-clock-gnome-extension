EXTENSION_ID = revolutionary@jbellue.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_ID)
GETTEXT_DOMAIN = revolutionary-clock
PO_FILES = $(wildcard src/po/*.po)
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
install: package
	gnome-extensions install --force dist/$(EXTENSION_ID).shell-extension.zip

.PHONY: uninstall
uninstall:
	gnome-extensions uninstall $(EXTENSION_ID)

.PHONY: pot
pot:
	xgettext \
		--language=JavaScript \
		--keyword=_ \
		--keyword=ngettext:1,2 \
		--from-code=UTF-8 \
		--package-name=$(GETTEXT_DOMAIN) \
		--output=src/po/$(GETTEXT_DOMAIN).pot \
		src/prefs.js
	xgettext \
		--language=Glade \
		--join-existing \
		--from-code=UTF-8 \
		--package-name=$(GETTEXT_DOMAIN) \
		--output=src/po/$(GETTEXT_DOMAIN).pot \
		src/ui/prefs.ui

.PHONY: po
po: pot
	for lang in $(LOCALES); do \
		msgmerge --update --backup=none src/po/$$lang.po src/po/$(GETTEXT_DOMAIN).pot; \
	done

.PHONY: package
package:
	mkdir -p dist
	gnome-extensions pack \
		--out-dir=dist \
		--force \
		--gettext-domain=$(GETTEXT_DOMAIN) \
		--extra-source=cacheManager.js \
		--extra-source=clockIndicator.js \
		--extra-source=datePopup.js \
		--extra-source=republicanCalendar.js \
		--extra-source=republicanClock.js \
		--extra-source=translations.js \
		--extra-source=wikiImageManager.js \
		--extra-source=locale-ca.js \
		--extra-source=locale-en.js \
		--extra-source=locale-es.js \
		--extra-source=locale-fr.js \
		--extra-source=locale \
		--extra-source=ui \
		src/

.PHONY: lint
lint:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint

.PHONY: lint-watch
lint-watch:
	$(CONTAINER_RUNTIME) build -f Dockerfile.lint -t revolutionary-clock-lint .
	$(CONTAINER_RUNTIME) run --rm --init -it -e SHELL=/bin/sh -v $(PWD):/workspace$(CONTAINER_MOUNT_SUFFIX) -w /workspace revolutionary-clock-lint watch

# Single locale helper
define run_dev_locale
	$(MAKE) install && \
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
prefs: install run-prefs
