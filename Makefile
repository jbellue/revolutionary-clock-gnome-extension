EXTENSION_ID = revolutionary@jbellue.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_ID)
GETTEXT_DOMAIN = revolutionary-clock
PO_FILES = $(wildcard po/*.po)
LOCALES = $(basename $(notdir $(PO_FILES)))

.PHONY: install
install: mo
	mkdir -p $(INSTALL_DIR)
	cp src/*.js src/*.json src/*.css $(INSTALL_DIR)/
	cp -r src/locale $(INSTALL_DIR)/
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
		--from-code=UTF-8 \
		--package-name=$(GETTEXT_DOMAIN) \
		--output=po/$(GETTEXT_DOMAIN).pot \
		src/prefs.js

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
	cd src && gnome-extensions pack --force --out-dir=../dist
	rm -rf src/schemas

.PHONY: test
test:
	npm test

.PHONE: dbus
dbus:
	dbus-run-session gnome-shell --devkit --wayland

.PHONY: dev
dev: reinstall dbus
