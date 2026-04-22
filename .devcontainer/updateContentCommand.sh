#!/usr/bin/env bash
set -Eeuo pipefail

# Install Deno
curl -fsSL https://deno.land/install.sh | sh -s -- --yes &&

# Install TinyGo
(
    tag_name=$(curl -fsSL https://ungh.cc/repos/tinygo-org/tinygo/releases/latest | jq --raw-output .release.tag)
    version=${tag_name#v}
    echo "tag_name=${tag_name}"
    echo "version=${version}"

    # https://tinygo.org/getting-started/install/linux/
    wget "https://github.com/tinygo-org/tinygo/releases/download/${tag_name}/tinygo_${version}_amd64.deb"
    sudo dpkg -i "tinygo_${version}_amd64.deb"

    rm "tinygo_${version}_amd64.deb"
)

# Install Cargo B(inary)Install
curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash
# Reload terminal so that we can call "cargo binstall" later.
. ~/.bashrc

# Install wkg from wasm-pkg-tools
cargo binstall wkg --yes
