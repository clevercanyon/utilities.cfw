#!/usr/bin/env bash
##
# Utility include.
##

##
# Reverts strict mode; to loose mode.
# `+` indicates reverse; i.e., disable.
##
set +o nounset
set +o errexit
set +o errtrace
set +o pipefail
trap - ERR
