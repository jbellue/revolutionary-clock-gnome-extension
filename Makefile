EXTENSION_ID = revolutionary@jbellue.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_ID)

.PHONY: install
install:
	mkdir -p $(INSTALL_DIR)
	cp src/*.js src/*.json $(INSTALL_DIR)/
	cp -r src/locale $(INSTALL_DIR)/
	mkdir -p $(INSTALL_DIR)/schemas
	cp schemas/*.xml $(INSTALL_DIR)/schemas/
	glib-compile-schemas $(INSTALL_DIR)/schemas/

.PHONY: uninstall
uninstall:
	rm -rf $(INSTALL_DIR)

.PHONY: reinstall
reinstall: uninstall install

.PHONY: package
package:
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
