#!/bin/sh
./update_i18n.sh

pyinstaller -F \
    --add-data "remotelauncher/static:remotelauncher/static" \
    --add-data "remotelauncher/templates:remotelauncher/templates" \
    --add-data "remotelauncher/translations:remotelauncher/translations" \
    RemoteLauncher.py
