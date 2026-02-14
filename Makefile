EXTENSION_ID = revolutionary@jbellue.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_ID)

.PHONY: install
install:
	mkdir -p $(INSTALL_DIR)
	cp src/*.js src/*.json $(INSTALL_DIR)/

.PHONY: uninstall
uninstall:
	rm -rf $(INSTALL_DIR)

.PHONY: reinstall
reinstall: uninstall install

.PHONY: package
package:
	mkdir -p dist
	cd src && gnome-extensions pack --force --out-dir=../dist

.PHONY: test
test:
	npm test