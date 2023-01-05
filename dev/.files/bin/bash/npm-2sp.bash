#!/usr/bin/env bash
##
# NPM 2-script proxy.
#
# This proxies an NPM script for the purpose of running CMD 1, then CMD 2
# when an NPM script is configured such that it needs to run two scripts, not one.
#
# Without this proxy, CMD 1 would not receive user-supplied arguments given to `npm run [script] -- [args]`.
# For example, if a user types `$ npm run update:project --dryRun` and we need to configure and run two scripts,
# only the second script would receive the `--dryRun` argument, which could potentially end in a disaster.
#
# A similar, albeit, less serious, problem arises in `--help` or `--version` modes.
# These two additional cases are also accounted for by this proxy.
##

__dirname="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
. "${__dirname}"/includes/strict-mode.bash
. "${__dirname}"/includes/shell-options.bash

##
# Project directory.
##

cd "${__dirname}"/../../../..
projDir="$(pwd)"

##
# Utility functions.
##

function isCMDSafeToRun() {
    [[ "${1:-}" =~ ^(git|npm|npx)[[:space:]] ]] || isCMDInDevBin "${1:-}"
}

function isCMDHelpOrVersion() {
    [[ "${1:-}" =~ (^|[[:space:]])(-(h|v)|--(help|version))($|[[:space:]]) ]]
}

function isCMDDryRun() {
    [[ "${1:-}" =~ (^|[[:space:]])(--dry(Run|-run))($|[[:space:]]) ]]
}

function isCMDInDevBin() {
    [[ "${1:-}" =~ ^\.\/dev\/\.files\/bin\/ ]]
}

function isCMDAnNPMScriptInDevBin() {
    [[ "${1:-}" =~ ^npm[[:space:]]+run(-script)?[[:space:]]+(envs|install|update)\: ]]
}

function isCMDAnNPMInstall() {
    # https://docs.npmjs.com/cli/commands/npm-ci
    # https://docs.npmjs.com/cli/commands/npm-install
    [[ "${1:-}" =~ ^npm[[:space:]](ci|clean-install|install-clean|isntall-clean|i|in|ins|inst|insta|instal|isnt|isnta|isntal|install)($|[[:space:]]) ]]
}

function log() {
    echo -e '\033[0;90m'"${1:-}"'\033[0m\n' >&2 # To stderr stream.
    # stderr, so we don't interfere with proxied output to stdout stream.
}

##
# Validation routines.
##

cmd1="${*:1:1}"
cmd2="${*:2:1}"
args="${*:3}"

if ! isCMDSafeToRun "${cmd1}"; then
    log 'Insecure; refusing to proxy CMD 1: `'"${cmd1}"'`'
    exit 1 # Security issue; error status.

elif ! isCMDSafeToRun "${cmd2}"; then
    log 'Insecure; refusing to proxy CMD 2: `'"${cmd2}"'`'
    exit 1 # Security issue; error status.
fi

##
# Proxies commands.
# Uses `sh`, matching NPM.
##

if isCMDAnNPMInstall "${cmd1}" && [[ "${cmd1}" =~ ^npm[[:space:]]+ci$ && "${cmd2}" =~ ^\.\/dev\/\.files\/bin\/install\.js([[:space:]](--help|project))?$ && -d "${projDir}"/node_modules ]]; then
    log 'Skipping `'"${cmd1}"'` in favor of `'"${cmd2}"'`.'

elif ! isCMDAnNPMInstall "${cmd1}" && isCMDHelpOrVersion "${args}"; then
    log 'Skipping `'"${cmd1}"'` when `'"${cmd2}"'` is in -h|-v|--help|--version mode.'

elif isCMDDryRun "${args}"; then
    if isCMDInDevBin "${cmd1}" || isCMDAnNPMScriptInDevBin "${cmd1}"; then
        if isCMDAnNPMScriptInDevBin "${cmd1}" && [[ "${cmd1}" =~ [[:space:]]--[[:space:]] ]]; then
            trap - ERR # Disable trap.
            /usr/bin/env sh -c "${cmd1} --dryRun"
        else
            trap - ERR # Disable trap.
            /usr/bin/env sh -c "${cmd1} -- --dryRun"
        fi
    elif isCMDAnNPMInstall "${cmd1}"; then
        trap - ERR # Disable trap.
        /usr/bin/env sh -c "${cmd1}"
    else
        log 'Skipping `'"${cmd1}"'` when `'"${cmd2}"'` is a --dryRun.'
    fi
else
    trap - ERR # Disable trap.
    /usr/bin/env sh -c "${cmd1}"
fi
trap - ERR # Disable trap.
/usr/bin/env sh -c "${cmd2} ${args}"
