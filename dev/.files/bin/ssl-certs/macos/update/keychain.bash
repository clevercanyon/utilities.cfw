#!/usr/bin/env bash
##
# Tells macOS to trust our CAs.
##

cd "$(dirname "${BASH_SOURCE[0]}")" || { echo 'CD failure.' >&2 && exit 1; }
. ../../../../../../node_modules/@clevercanyon/utilities.bash/dist/load.bash || { echo 'Load failure.' >&2 && exit 1; }

# Adds root & intermediate CAs to macOS system keychain.

sudo security -v add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ../../../../assets/ssl-certs/root-ca-crt.pem
sudo security -v add-trusted-cert -d -r trustAsRoot -k /Library/Keychains/System.keychain ../../../../assets/ssl-certs/i10e-ca-crt.pem
