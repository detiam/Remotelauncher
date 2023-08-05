#!/bin/sh
# shellcheck disable=SC1007
# figure out the absolute path to the script
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
if [ -z "${ROOT}" ]; then
	echo "Couldn't find root directory from '$0', aborting!"
	exit 1
fi

dir_translations="$ROOT/remotelauncher/translations"
file_supportlocale='/usr/share/i18n/SUPPORTED'
file_pot="$dir_translations/messages.pot"
list_langdir=$(find "$dir_translations"/* -maxdepth 0 -type d)

pybabel extract -F babel.cfg -o "$file_pot" "$ROOT"

if [ -e "$file_supportlocale" ]; then
	for langdir in $list_langdir; do
		locale=$(basename "$langdir")
		# Check if the locale is valid
		if grep -E "^$locale(.)?.*\s.*" "$file_supportlocale" > /dev/null 2>&1; then
			[ -s "$langdir" ] || pybabel init -i "$file_pot" -d "$dir_translations" -l "$locale"
		else
			list_invalidlangdir="$list_invalidlangdir $langdir"
		fi
	done
else
	echo "file $file_supportlocale not exist, aborting"
	exit 2
fi

pybabel update -i "$file_pot" -d "$dir_translations"
pybabel compile -d "$dir_translations"

if [ -n "$list_invalidlangdir" ]; then
	echo
	echo "ERROR: The following locales are invalid, please check:"
	echo "$list_invalidlangdir"
	exit 1
fi
